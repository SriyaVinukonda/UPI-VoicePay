"""
Core business logic for VoicePay.

Handles:
- User lookup
- User creation
- Transaction history
- Atomic money transfer
- Voice command parsing
- English / Hindi / Telugu commands
"""

import re
import unicodedata

from sqlalchemy.orm import Session

from app.security import hash_pin, verify_pin
from . import models, schemas


# ============================================================
# ERRORS
# ============================================================

class InsufficientFundsError(Exception):
    pass


class UserNotFoundError(Exception):
    pass


class InvalidPinError(Exception):
    pass


# ============================================================
# USER HELPERS
# ============================================================

def get_user_by_upi(db: Session, upi_id: str) -> models.User | None:
    return (
        db.query(models.User)
        .filter(models.User.upi_id == upi_id)
        .first()
    )


def get_user_by_name(db: Session, name: str) -> models.User | None:
    """
    Loose case-insensitive name matching.
    Used by the voice-command parser.
    """

    return (
        db.query(models.User)
        .filter(
            models.User.name.ilike(
                f"%{name.strip()}%"
            )
        )
        .first()
    )
# ============================================================
# PHONE NUMBER -> DEMO UPI USER
# ============================================================

# Demo-only phone mappings.
# These represent phone numbers registered with users
# in this simulated VoicePay system.
DEMO_PHONE_TO_UPI = {
    "9876543210": "suresh@voicepay",
    "9876543211": "priya@voicepay",
    "9876543212": "anjali@voicepay",
}


def normalize_phone_number(phone_number: str) -> str:
    """
    Normalize an Indian phone number into a 10-digit format.

    Accepts values such as:
        9876543210
        +91 9876543210
        +919876543210
        98765 43210
        98765-43210
    """
    digits = re.sub(r"\D", "", str(phone_number))

    # Remove India's country code if present.
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]

    return digits


def get_user_by_phone(
    db: Session,
    phone_number: str,
) -> models.User | None:
    """
    Resolve a demo phone number to an existing VoicePay user.

    This does NOT add a phone column to the database.
    The mapping is intentionally kept as demo configuration.
    """
    phone = normalize_phone_number(phone_number)

    upi_id = DEMO_PHONE_TO_UPI.get(phone)

    if not upi_id:
        return None

    return get_user_by_upi(db, upi_id)


def extract_phone_number(text: str) -> str | None:
    """
    Extract a valid Indian 10-digit mobile number from
    Sarvam's transcription.

    Handles:
        9876543210
        +91 9876543210
        +919876543210
        98765 43210
        98765-43210
    """
    text = normalize_text(text)

    # First look for a normal contiguous 10-digit number.
    match = re.search(r"(?<!\d)([6-9]\d{9})(?!\d)", text)
    if match:
        return match.group(1)

    # Handle +91 / 91 followed by a 10-digit number.
    match = re.search(
        r"(?:\+?91[\s-]*)?([6-9]\d{4}[\s-]?\d{5})",
        text,
    )

    if match:
        phone = normalize_phone_number(match.group(0))

        if re.fullmatch(r"[6-9]\d{9}", phone):
            return phone

    # Handle a number split into groups by transcription.
    digit_groups = re.findall(r"\d+", text)

    for group in digit_groups:
        phone = normalize_phone_number(group)

        if re.fullmatch(r"[6-9]\d{9}", phone):
            return phone

    return None

def create_user(db: Session, user_in) -> models.User:
    user = models.User(
        name=user_in.name,
        upi_id=user_in.upi_id,
        pin=hash_pin(user_in.pin),
        balance=user_in.balance,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def list_users(db: Session):
    return db.query(models.User).all()


# ============================================================
# TRANSACTIONS
# ============================================================

def list_transactions(
    db: Session,
    upi_id: str | None = None
):
    q = db.query(models.Transaction)

    if upi_id:

        user = get_user_by_upi(
            db,
            upi_id
        )

        if not user:
            return []

        q = q.filter(
            (models.Transaction.sender_id == user.id)
            |
            (models.Transaction.receiver_id == user.id)
        )

    return (
        q.order_by(
            models.Transaction.timestamp.desc()
        )
        .all()
    )


def get_user_transaction_history(
    db: Session,
    upi_id: str,
    limit: int = 20,
    offset: int = 0,
) -> schemas.TransactionHistoryResponse:
    """
    Returns paginated transaction history for a specific user.
    - Determines SENT or RECEIVED direction relative to the requested user.
    - Resolves counterparty name and UPI.
    - Safely handles failed transactions with missing/unknown counterparties.
    - Orders newest first.
    """
    user = get_user_by_upi(db, upi_id)
    if not user:
        raise UserNotFoundError(f"User with UPI ID '{upi_id}' not found")

    q = db.query(models.Transaction).filter(
        (models.Transaction.sender_id == user.id)
        | (models.Transaction.receiver_id == user.id)
    )

    total = q.count()

    txns = (
        q.order_by(
            models.Transaction.timestamp.desc(),
            models.Transaction.id.desc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = []
    for txn in txns:
        if txn.sender_id == user.id:
            direction = "SENT"
            other_user = txn.receiver
        else:
            direction = "RECEIVED"
            other_user = txn.sender

        counterparty_name = other_user.name if other_user else None
        counterparty_upi = other_user.upi_id if other_user else None

        items.append(
            schemas.TransactionHistoryItem(
                id=txn.id,
                direction=direction,
                counterparty_name=counterparty_name,
                counterparty_upi=counterparty_upi,
                amount=txn.amount,
                status=txn.status,
                reason=txn.reason,
                verification_method=getattr(txn, "verification_method", None),
                timestamp=txn.timestamp,
            )
        )

    print(
        f"[DB History Query] user={user.name} ({user.upi_id}), found {len(txns)} items out of total={total}. "
        f"IDs={[t.id for t in txns]}"
    )

    return schemas.TransactionHistoryResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )



# ============================================================
# MONEY TRANSFER
# ============================================================

def execute_transfer(
    db: Session,
    sender_upi: str,
    receiver_upi: str,
    amount: float,
    pin: str,
    raw_command: str | None = None,
    verification_method: str | None = None,
) -> models.Transaction:

    sender = get_user_by_upi(
        db,
        sender_upi
    )

    receiver = get_user_by_upi(
        db,
        receiver_upi
    )

    def log_failure(
        reason: str,
        sender_id=None,
        receiver_id=None
    ):

        txn = models.Transaction(
            sender_id=(
                sender_id
                if sender_id is not None
                else (sender.id if sender else 0)
            ),
            receiver_id=(
                receiver_id
                if receiver_id is not None
                else (receiver.id if receiver else 0)
            ),
            amount=amount,
            status="FAILED",
            reason=reason,
            raw_command=raw_command,
        )

        db.add(txn)
        db.commit()
        db.refresh(txn)

        return txn

    # --------------------------------------------------------
    # SENDER CHECK
    # --------------------------------------------------------

    if not sender:
        raise UserNotFoundError(
            f"Sender UPI '{sender_upi}' not found"
        )

    # --------------------------------------------------------
    # RECEIVER CHECK
    # --------------------------------------------------------

    if not receiver:

        log_failure(
            "Receiver not found",
            sender_id=sender.id,
            receiver_id=0
        )

        raise UserNotFoundError(
            f"Receiver UPI '{receiver_upi}' not found"
        )

    # --------------------------------------------------------
    # PIN CHECK
    # --------------------------------------------------------

    if verification_method != "LOCAL_DEVICE_BIOMETRIC" or pin is not None:
        if not pin or not verify_pin(pin, sender.pin):
            log_failure(
                "Invalid PIN",
                sender_id=sender.id,
                receiver_id=receiver.id
            )

            raise InvalidPinError(
                "Incorrect PIN"
            )

    # --------------------------------------------------------
    # BALANCE CHECK
    # --------------------------------------------------------

    if sender.balance < amount:

        log_failure(
            "Insufficient funds",
            sender_id=sender.id,
            receiver_id=receiver.id
        )

        raise InsufficientFundsError(
            f"Insufficient balance: "
            f"has {sender.balance}, needs {amount}"
        )

    # --------------------------------------------------------
    # ATOMIC TRANSFER
    # --------------------------------------------------------

    try:

        sender.balance -= amount
        receiver.balance += amount

        txn = models.Transaction(
            sender_id=sender.id,
            receiver_id=receiver.id,
            amount=amount,
            status="SUCCESS",
            reason=None,
            raw_command=raw_command,
            verification_method=verification_method,
        )

        db.add(txn)
        db.add(sender)
        db.add(receiver)

        db.commit()
        db.refresh(txn)

        print(
            f"[DB Transfer Commit] Committed txn id={txn.id}, sender={sender.name} ({sender.upi_id}), "
            f"receiver={receiver.name} ({receiver.upi_id}), amount={txn.amount}, "
            f"status={txn.status}, timestamp={txn.timestamp}"
        )

        return txn

    except Exception:

        db.rollback()
        raise


# ============================================================
# NAME TRANSLATIONS
# ============================================================

NAME_TRANSLATIONS = {

    # Hindi
    "रमेश": "Ramesh",
    "सुरेश": "Suresh",
    "प्रिया": "Priya",
    "अंजलि": "Anjali",

    # Telugu
    "రమేష్": "Ramesh",
    "సురేష్": "Suresh",
    "ప్రియ": "Priya",
    "ప్రియా": "Priya",
    "అంజలి": "Anjali",
}


# ============================================================
# NORMALIZATION
# ============================================================

DEVANAGARI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")


def normalize_text(text: str) -> str:

    text = unicodedata.normalize(
        "NFC",
        text
    )

    # Remove zero-width characters
    text = re.sub(
        r"[\u200b-\u200f\u2060\ufeff]",
        "",
        text
    )

    # Convert Devanagari numerals to ASCII digits
    text = text.translate(DEVANAGARI_DIGITS)

    return text.strip()


# ============================================================
# TELUGU NUMBER WORDS
# ============================================================

TELUGU_NUMBER_WORDS = {

    "సున్నా": 0,
    "ఒకటి": 1,
    "ఒక": 1,
    "రెండు": 2,
    "మూడు": 3,
    "నాలుగు": 4,
    "ఐదు": 5,
    "ఆరు": 6,
    "ఏడు": 7,
    "ఎనిమిది": 8,
    "తొమ్మిది": 9,

    "పది": 10,
    "ఇరవై": 20,
    "ముప్పై": 30,
    "నలభై": 40,
    "యాభై": 50,
    "అరవై": 60,
    "డెబ్బై": 70,
    "ఎనభై": 80,
    "తొంభై": 90,

    "వంద": 100,
    "వందల": 100,

    "వెయ్యి": 1000,
    "వేలు": 1000,
}


def parse_telugu_number(text: str):

    text = normalize_text(text)

    if text in TELUGU_NUMBER_WORDS:
        return TELUGU_NUMBER_WORDS[text]

    words = text.split()

    total = 0
    current = 0

    for word in words:

        value = TELUGU_NUMBER_WORDS.get(word)

        if value is None:
            return None

        if value in (100, 1000):

            if current == 0:
                current = 1

            current *= value
            total += current
            current = 0

        else:

            current += value

    return total + current


# ============================================================
# HINDI NUMBER WORDS
# ============================================================

HINDI_NUMBER_WORDS = {

    "शून्य": 0,

    "एक": 1,
    "दो": 2,
    "तीन": 3,
    "चार": 4,
    "पांच": 5,
    "पाँच": 5,
    "छह": 6,
    "छः": 6,
    "सात": 7,
    "आठ": 8,
    "नौ": 9,

    "दस": 10,
    "ग्यारह": 11,
    "बारह": 12,
    "तेरह": 13,
    "चौदह": 14,
    "पंद्रह": 15,
    "सोलह": 16,
    "सत्रह": 17,
    "अठारह": 18,
    "उन्नीस": 19,

    "बीस": 20,
    "तीस": 30,
    "चालीस": 40,
    "पचास": 50,
    "साठ": 60,
    "सत्तर": 70,
    "अस्सी": 80,
    "नब्बे": 90,

    "सौ": 100,
    "सैकड़ा": 100,
    "सैकड़े": 100,
    "सैकड़े": 100,

    "हजार": 1000,
    "हज़ार": 1000,
    "हज़ार": 1000,
    "लाख": 100000,
}


def parse_hindi_number(text: str):

    text = normalize_text(text)

    if text in HINDI_NUMBER_WORDS:
        return HINDI_NUMBER_WORDS[text]

    words = text.split()

    total = 0
    current = 0

    for word in words:

        value = HINDI_NUMBER_WORDS.get(word)

        if value is None:
            return None

        if value in (100, 1000, 100000):

            if current == 0:
                current = 1

            current *= value
            total += current
            current = 0

        else:

            current += value

    return total + current


# ============================================================
# NAME NORMALIZATION
# ============================================================

def normalize_receiver_name(name: str) -> str:

    name = normalize_text(name)

    return NAME_TRANSLATIONS.get(
        name,
        name
    )


# ============================================================
# VOICE COMMAND PARSER
# ============================================================

def parse_voice_command(command: str):

    command = normalize_text(command)

    # Use ascii+backslashreplace so non-ASCII characters (Hindi, Telugu)
    # do not crash on Windows consoles that default to cp1252.
    print("PARSER RECEIVED:", repr(command).encode("ascii", "backslashreplace").decode("ascii"))

    # ========================================================
    # 1. TELUGU - NUMBER WORDS
    #
    # Example:
    # సురేష్ కి ఐదు వందల రూపాయలు పంపించు
    # ========================================================

    telugu_words = re.search(
        r"(.+?)(?:కి|కు)\s+"
        r"(.+?)\s*"
        r"(?:రూపాయలు|రూపాయ|రూ)\s*"
        r"(?:పంపు|పంపించు|పంపించండి|బదిలీ\s*చేయి)",
        command
    )

    if telugu_words:

        receiver_name = normalize_receiver_name(
            telugu_words.group(1)
        )

        amount_text = (
            telugu_words
            .group(2)
            .strip()
        )

        amount = parse_telugu_number(
            amount_text
        )

        if amount is not None:

            return (
                float(amount),
                receiver_name,
                "te"
            )

    # ========================================================
    # 2. TELUGU - NUMBER FIRST
    #
    # Example:
    # ఐదు వందల రూపాయలు సురేష్ కి పంపు
    # ========================================================

    telugu_amount_first = re.search(
        r"(.+?)\s*"
        r"(?:రూపాయలు|రూపాయ|రూ)\s+"
        r"(.+?)(?:కి|కు)\s*"
        r"(?:పంపు|పంపించు|పంపించండి|బదిలీ\s*చేయి)",
        command
    )

    if telugu_amount_first:

        amount_text = (
            telugu_amount_first
            .group(1)
            .strip()
        )

        receiver_name = normalize_receiver_name(
            telugu_amount_first
            .group(2)
        )

        amount = parse_telugu_number(
            amount_text
        )

        if amount is not None:

            return (
                float(amount),
                receiver_name,
                "te"
            )

    # ========================================================
    # 3. TELUGU - DIGITS
    #
    # Example:
    # సురేష్ కి 500 రూపాయలు పంపు
    # ========================================================

    telugu_digits = re.search(
        r"(.+?)(?:కి|కు)\s*"
        r"(?:₹|రూ\.?|rs\.?)?\s*"
        r"(\d+(?:\.\d+)?)\s*"
        r"(?:రూపాయలు|రూపాయ|రూ)?\s*"
        r"(?:పంపు|పంపించు|పంపించండి|బదిలీ\s*చేయి)",
        command,
        re.IGNORECASE
    )

    if telugu_digits:

        receiver_name = normalize_receiver_name(
            telugu_digits.group(1)
        )

        amount = float(
            telugu_digits.group(2)
        )

        return (
            amount,
            receiver_name,
            "te"
        )

    # ========================================================
    # 4. HINDI - NUMBER WORDS
    #
    # Example:
    # रमेश को पाँच सौ रुपये भेजो
    # ========================================================

    hindi_words = re.search(
        r"(.+?)\s*को\s+"
        r"(.+?)\s*"
        r"(?:रुपये|रुपए|रुपया|रुपय)\s*"
        r"(?:भेजो|भेजें|भेज|भेज\s*दो)",
        command
    )

    if hindi_words:

        receiver_name = normalize_receiver_name(
            hindi_words.group(1)
        )

        amount_text = (
            hindi_words
            .group(2)
            .strip()
        )

        amount = parse_hindi_number(
            amount_text
        )

        if amount is not None:

            return (
                float(amount),
                receiver_name,
                "hi"
            )

    # ========================================================
    # 5. HINDI - NUMBER FIRST
    #
    # Example:
    # पाँच सौ रुपये रमेश को भेजो
    # ========================================================

    hindi_amount_first_words = re.search(
        r"(.+?)\s*"
        r"(?:रुपये|रुपए|रुपया|रुपय)\s+"
        r"(.+?)\s*को\s*"
        r"(?:भेजो|भेजें|भेज|भेज\s*दो)",
        command
    )

    if hindi_amount_first_words:

        amount_text = (
            hindi_amount_first_words
            .group(1)
            .strip()
        )

        receiver_name = normalize_receiver_name(
            hindi_amount_first_words
            .group(2)
        )

        amount = parse_hindi_number(
            amount_text
        )

        if amount is not None:

            return (
                float(amount),
                receiver_name,
                "hi"
            )

    # ========================================================
    # 5b. HINDI - DIGITS FIRST
    #
    # Example:
    # 1000 रुपये प्रिया को भेजो
    # ========================================================

    hindi_digits_amount_first = re.search(
        r"(?:₹|रु\.?|rs\.?)?\s*"
        r"(\d+(?:\.\d+)?)\s*"
        r"(?:रुपये|रुपए|रुपया|रुपय)\s+"
        r"(.+?)\s*को\s*"
        r"(?:भेजो|भेजें|भेज|भेज\s*दो)",
        command,
        re.IGNORECASE
    )

    if hindi_digits_amount_first:

        amount = float(hindi_digits_amount_first.group(1))

        receiver_name = normalize_receiver_name(
            hindi_digits_amount_first.group(2)
        )

        return (
            amount,
            receiver_name,
            "hi"
        )

    # ========================================================
    # 6. HINDI - DIGITS
    #
    # Example:
    # रमेश को 500 रुपये भेजो
    # ========================================================

    hindi_digits = re.search(
        r"(.+?)\s*को\s*"
        r"(?:₹|रु\.?|rs\.?)?\s*"
        r"(\d+(?:\.\d+)?)\s*"
        r"(?:रुपये|रुपए|रुपया|रुपय)?\s*"
        r"(?:भेजो|भेजें|भेज|भेज\s*दो)",
        command,
        re.IGNORECASE
    )

    if hindi_digits:

        receiver_name = normalize_receiver_name(
            hindi_digits.group(1)
        )

        amount = float(
            hindi_digits.group(2)
        )

        return (
            amount,
            receiver_name,
            "hi"
        )

    # ========================================================
    # 7. HINGLISH
    #
    # Example:
    # Ramesh ko 500 rupaye bhejo
    # ========================================================

    hinglish = re.search(
        r"([a-zA-Z]+)\s*"
        r"ko\s*"
        r"(?:₹|rs\.?|inr)?\s*"
        r"(\d+(?:\.\d+)?)\s*"
        r"(?:rupaye|rupay|rupees|rs)?\s*"
        r"(?:bhejo|bhejein|bhej|bhej\s*do)",
        command,
        re.IGNORECASE
    )

    if hinglish:

        receiver_name = hinglish.group(1)

        amount = float(
            hinglish.group(2)
        )

        return (
            amount,
            receiver_name,
            "hi"
        )

    # ========================================================
    # 8. HINGLISH - AMOUNT FIRST
    #
    # Example:
    # 500 rupaye Ramesh ko bhejo
    # ========================================================

    hinglish_amount_first = re.search(
        r"(?:₹|rs\.?|inr)?\s*"
        r"(\d+(?:\.\d+)?)\s*"
        r"(?:rupaye|rupay|rupees|rs)?\s+"
        r"([a-zA-Z]+)\s*"
        r"ko\s*"
        r"(?:bhejo|bhejein|bhej|bhej\s*do)",
        command,
        re.IGNORECASE
    )

    if hinglish_amount_first:

        amount = float(
            hinglish_amount_first.group(1)
        )

        receiver_name = (
            hinglish_amount_first.group(2)
        )

        return (
            amount,
            receiver_name,
            "hi"
        )

    # ========================================================
    # 9. TELUGU ROMANIZED
    #
    # Ramesh ki 500 rupayalu pampu
    # ========================================================

    telugu_roman = re.search(
        r"([a-zA-Z]+)\s*"
        r"(?:ki|ku)\s*"
        r"(?:₹|rs\.?|inr)?\s*"
        r"(\d+(?:\.\d+)?)\s*"
        r"(?:rupayalu|rupay|rupees|rs)?\s*"
        r"(?:pampu|pampinchu|pampinchandi|pampinchandi)",
        command,
        re.IGNORECASE
    )

    if telugu_roman:

        receiver_name = (
            telugu_roman.group(1)
        )

        amount = float(
            telugu_roman.group(2)
        )

        return (
            amount,
            receiver_name,
            "te"
        )

    # ========================================================
    # 10. TELUGU ROMANIZED - AMOUNT FIRST
    #
    # 500 rupayalu Ramesh ki pampu
    # ========================================================

    telugu_roman_amount_first = re.search(
        r"(?:₹|rs\.?|inr)?\s*"
        r"(\d+(?:\.\d+)?)\s*"
        r"(?:rupayalu|rupay|rupees|rs)\s+"
        r"([a-zA-Z]+)\s*"
        r"(?:ki|ku)\s*"
        r"(?:pampu|pampinchu|pampinchandi)",
        command,
        re.IGNORECASE
    )

    if telugu_roman_amount_first:

        amount = float(
            telugu_roman_amount_first.group(1)
        )

        receiver_name = (
            telugu_roman_amount_first.group(2)
        )

        return (
            amount,
            receiver_name,
            "te"
        )

    # ========================================================
    # 11. ENGLISH
    #
    # Send 500 to Ramesh
    # Send ₹500 rupees to Ramesh
    # ========================================================

    english = re.search(
        r"send\s*"
        r"(?:₹|rs\.?|inr)?\s*"
        r"(\d+(?:\.\d+)?)\s*"
        r"(?:rupees|rupee|rs\.?|inr)?\s*"
        r"to\s+"
        r"([a-zA-Z]+)",
        command,
        re.IGNORECASE
    )

    if english:

        amount = float(
            english.group(1)
        )

        receiver_name = (
            english.group(2)
        )

        return (
            amount,
            receiver_name,
            "en"
        )

    # ========================================================
    # NOTHING MATCHED
    # ========================================================

    raise ValueError(
        "Could not understand command. "
        "Try: "
        "'Send 500 to Ramesh' (English), "
        "'Ramesh ko 500 rupaye bhejo' / "
        "'रमेश को 500 रुपये भेजो' (Hindi), "
        "or "
        "'Ramesh ki 500 rupayalu pampu' / "
        "'రమేష్ కి 500 రూపాయలు పంపు' (Telugu)."
    )