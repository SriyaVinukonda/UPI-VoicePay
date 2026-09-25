"""UPI VoicePay FastAPI service.

The local ledger provides the academic UPI-transfer simulation. Razorpay
Standard Checkout provides a separate, test-ready merchant checkout flow.
"""

import os
import re
import tempfile
import uuid
from datetime import datetime, timedelta

from fastapi import FastAPI, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile
from sqlalchemy.orm import Session

from . import models, schemas, crud
from .database import engine, get_db
from .gateway_routes import router as razorpay_router
from .normalizer import normalize_speech_text
from .speech import SpeechServiceError, synthesize_speech, transcribe_audio

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="UPI VoicePay API",
    description=(
        "Voice-payment prototype with Sarvam AI speech, a local demo ledger, "
        "and Razorpay Standard Checkout for merchant payment collection."
    ),
    version="1.1.0",
)
app.include_router(razorpay_router)


LANGUAGE_TO_BCP47 = {
    "te": "te-IN",
    "hi": "hi-IN",
    "en": "en-IN",
}


def confirmation_for(language: str, amount: float, receiver_name: str) -> str:
    """Create the sentence passed to Sarvam TTS for a pending payment."""
    if language == "te":
        return f"{receiver_name} కి ₹{amount:.0f} పంపాలా?"
    if language == "hi":
        return f"क्या आप {receiver_name} को ₹{amount:.0f} भेजना चाहते हैं?"
    return f"Send ₹{amount:.0f} to {receiver_name}?"


def bcp47_for(language: str) -> str:
    return LANGUAGE_TO_BCP47.get(language, "en-IN")


@app.get("/")
def root():
    return {
        "message": "UPI VoicePay backend is running",
        "docs": "/docs",
    }


# ---------------------------------------------------------------------
# Users / accounts
# ---------------------------------------------------------------------
@app.post("/users", response_model=schemas.UserOut)
def create_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_upi(db, user_in.upi_id):
        raise HTTPException(status_code=400, detail="UPI ID already exists")
    return crud.create_user(db, user_in)


@app.get("/users", response_model=list[schemas.UserOut])
def get_users(db: Session = Depends(get_db)):
    return crud.list_users(db)


@app.get("/users/{upi_id}/balance")
def get_balance(upi_id: str, response: Response, db: Session = Depends(get_db)):
    user = crud.get_user_by_upi(db, upi_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    return {"upi_id": user.upi_id, "name": user.name, "balance": user.balance}


# ---------------------------------------------------------------------
# Payments
# ---------------------------------------------------------------------
@app.post("/pay", response_model=schemas.TransactionOut)
def pay(req: schemas.PaymentRequest, db: Session = Depends(get_db)):
    """Direct payment — equivalent to the app already knowing both UPI IDs
    (e.g. after voice biometric auth + ASR has resolved a contact)."""
    try:
        return crud.execute_transfer(
            db, req.sender_upi, req.receiver_upi, req.amount, req.pin
        )
    except crud.UserNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except crud.InvalidPinError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except crud.InsufficientFundsError as e:
        raise HTTPException(status_code=402, detail=str(e))


@app.post("/voice-command", response_model=schemas.TransactionOut)
def voice_command(req: schemas.VoiceCommandRequest, db: Session = Depends(get_db)):
    """
    Simulates the full voice pipeline end-to-end:
      1. (stand-in for Sarvam ASR) you pass the already-transcribed text
      2. parse intent + amount + receiver name from the sentence
      3. resolve receiver name -> UPI ID by fuzzy name match
      4. run the same atomic transfer as /pay

    Example body:
    {
      "sender_upi": "ramesh@voicepay",
      "command": "Send 500 rupees to Suresh",
      "pin": "1234"
    }
    """
    try:
        amount, receiver_name ,language= crud.parse_voice_command(req.command)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    receiver = crud.get_user_by_name(db, receiver_name)
    if not receiver:
        raise HTTPException(
            status_code=404,
            detail=f"No contact matching '{receiver_name}' found",
        )

    try:
        return crud.execute_transfer(
            db,
            req.sender_upi,
            receiver.upi_id,
            amount,
            req.pin,
            raw_command=req.command,
        )
    except crud.UserNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except crud.InvalidPinError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except crud.InsufficientFundsError as e:
        raise HTTPException(status_code=402, detail=str(e))

@app.post("/transcribe")
async def transcribe_voice(file: UploadFile = File(...)):
    """
    Receives recorded audio and converts it into normalized text.

    Supports multilingual speech such as Telugu, Hindi and English.
    """

    suffix = os.path.splitext(file.filename or "")[1] or ".wav"

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix
        ) as temp_file:

            temp_path = temp_file.name
            content = await file.read()
            temp_file.write(content)

        try:
            result = transcribe_audio(temp_path)
        except SpeechServiceError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc


        normalized_text = normalize_speech_text(
            result["text"], result["language"]
        )

        return {
            "text": normalized_text,
            "raw_text": result["text"],
            "language": result["language"],
            "language_code": result["language_code"],
            "language_probability": result["language_probability"],
            "request_id": result["request_id"],
        }

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/voice-payment/preview", response_model=schemas.VoicePaymentPreview)
async def voice_payment_preview(
    file: UploadFile = File(...),
    sender_upi: str = Form(...),
    language: str = Form("en"),
    db: Session = Depends(get_db),
):
    """
    Converts voice into a payment proposal.
    DOES NOT execute the payment.
    Creates a server-side PENDING payment.
    """

    suffix = os.path.splitext(file.filename or "")[1] or ".wav"
    temp_path = None

    try:
        # 1. Find sender
        sender = crud.get_user_by_upi(db, sender_upi)

        if not sender:
            raise HTTPException(
                status_code=404,
                detail=f"Sender UPI '{sender_upi}' not found",
            )

        # 2. Save audio temporarily
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix,
        ) as temp_file:
            temp_path = temp_file.name
            content = await file.read()
            temp_file.write(content)

            print("AUDIO FILE:", temp_path)
            print("AUDIO SIZE:", len(content), "bytes")

        # 3. Speech → text
        try:
            result = transcribe_audio(
    temp_path,
    language=language,
)
        except SpeechServiceError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        print("PHONE RAW ASR:", ascii(result))
        print("SARVAM RAW TEXT:", ascii(result["text"]))
        print("PREVIEW DETECTED LANGUAGE:", ascii(result["language"]))

        # 4. Normalize ASR output (language-aware)
        normalized_text = normalize_speech_text(result["text"], result["language"])

        print("NORMALIZED TEXT:", ascii(normalized_text))

                # 5. Detect payment target
        #
        # Phone-number payments are resolved first. If no phone number
        # is present, the existing multilingual name-based parser is
        # used exactly as before.
        phone_number = crud.extract_phone_number(normalized_text)

        if phone_number:
            # Resolve the demo phone number -> existing VoicePay user.
            receiver = crud.get_user_by_phone(db, phone_number)

            if not receiver:
                raise HTTPException(
                    status_code=404,
                    detail=(
                        f"Phone number '{phone_number}' is not registered "
                        "with a VoicePay demo user."
                    ),
                )

            # Extract the amount independently because the existing
            # name-based parser expects a receiver name.
            amount_match = re.search(
                r"(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)",
                normalized_text,
                re.IGNORECASE,
            )

            if not amount_match:
                raise HTTPException(
                    status_code=400,
                    detail="Could not understand the payment amount.",
                )

            amount = float(amount_match.group(1))

            if amount <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="Payment amount must be greater than zero.",
                )

            receiver_name = receiver.name

            # Preserve Sarvam's detected language when available.
            detected_language = str(
                result.get("language") or ""
            ).lower()

            if detected_language.startswith("te"):
                language = "te"
            elif detected_language.startswith("hi"):
                language = "hi"
            else:
                language = "en"

            print(
                "PHONE PAYMENT:",
                phone_number,
                "->",
                receiver.name,
                receiver.upi_id,
                "AMOUNT:",
                amount,
                "LANGUAGE:",
                language,
            )

        else:
            # Existing name-based multilingual flow.
            try:
                amount, receiver_name, detected_language = crud.parse_voice_command(
    normalized_text
)
            except ValueError as e:
                raise HTTPException(
                    status_code=400,
                    detail=str(e),
                )
            if language not in {"en", "hi", "te"}:
                language = detected_language
            print(
                "PARSED PAYMENT:",
                amount,
                receiver_name,
                language,
            )

            # Existing receiver-name lookup.
            receiver = crud.get_user_by_name(
                db,
                receiver_name,
            )

            if not receiver:
                raise HTTPException(
                    status_code=404,
                    detail=f"No contact matching '{receiver_name}' found",
                )

        # 7. Create server-side pending payment

        # 7. Create server-side pending payment
        pending_payment = models.PendingPayment(
            sender_id=sender.id,
            receiver_id=receiver.id,
            amount=amount,
            language=language,
            command=normalized_text,
            status="PENDING",
        )

        db.add(pending_payment)
        db.commit()
        db.refresh(pending_payment)

        # 8. Confirmation message
        confirmation_text = confirmation_for(language, amount, receiver.name)

        # 9. Return preview
        return {
            "payment_id": pending_payment.id,
            "amount": amount,
            "receiver_name": receiver.name,
            "receiver_upi": receiver.upi_id,
            "language": language,
            "command": normalized_text,
            "confirmation_text": confirmation_text,
        }

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@app.post("/text-to-speech", response_model=schemas.TextToSpeechOut)
def text_to_speech(req: schemas.TextToSpeechRequest):
    """Create a base64 WAV audio response with Sarvam Bulbul TTS."""
    try:
        return synthesize_speech(
            text=req.text,
            language_code=req.language_code,
            speaker=req.speaker,
            pace=req.pace,
        )
    except SpeechServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post(
    "/voice-payment/{payment_id}/confirmation-audio",
    response_model=schemas.VoiceConfirmationAudioOut,
)
def voice_payment_confirmation_audio(payment_id: int, db: Session = Depends(get_db)):
    """Speak the server-generated confirmation for an unconfirmed payment."""
    pending = (
        db.query(models.PendingPayment)
        .filter(
            models.PendingPayment.id == payment_id,
            models.PendingPayment.status == "PENDING",
        )
        .first()
    )
    if not pending:
        raise HTTPException(
            status_code=404,
            detail="Pending payment not found or already processed",
        )

    receiver = db.query(models.User).filter(models.User.id == pending.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Payment recipient no longer exists")

    language_code = bcp47_for(pending.language)
    text = confirmation_for(pending.language, pending.amount, receiver.name)
    try:
        audio = synthesize_speech(text=text, language_code=language_code)
    except SpeechServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "payment_id": pending.id,
        "text": text,
        "language_code": language_code,
        **audio,
    }

@app.post(
    "/voice-payments/{payment_id}/biometric/challenge",
    response_model=schemas.BiometricChallengeResponse,
)
@app.post(
    "/voice-payment/{payment_id}/biometric/challenge",
    response_model=schemas.BiometricChallengeResponse,
)
def create_biometric_challenge(payment_id: int, db: Session = Depends(get_db)):
    """
    Creates an unguessable 2-minute biometric challenge for a pending payment.
    Invalidates any prior unused challenges for this payment.
    Never stores or requests raw biometric data.
    """
    pending = (
        db.query(models.PendingPayment)
        .filter(
            models.PendingPayment.id == payment_id,
            models.PendingPayment.status == "PENDING",
        )
        .first()
    )
    if not pending:
        raise HTTPException(
            status_code=404,
            detail="Pending payment not found or already processed",
        )

    now = datetime.utcnow()
    # Invalidate prior unused challenges
    prior_challenges = (
        db.query(models.BiometricVerification)
        .filter(
            models.BiometricVerification.pending_payment_id == payment_id,
            models.BiometricVerification.status == "PENDING",
        )
        .all()
    )
    for c in prior_challenges:
        c.status = "EXPIRED"

    challenge_id = f"bio_{uuid.uuid4().hex}"
    expires_at = now + timedelta(minutes=2)

    verification = models.BiometricVerification(
        challenge_id=challenge_id,
        pending_payment_id=payment_id,
        status="PENDING",
        verification_method="LOCAL_DEVICE_BIOMETRIC",
        created_at=now,
        expires_at=expires_at,
    )
    db.add(verification)
    db.commit()
    db.refresh(verification)

    print(f"[Biometric] Created challenge {challenge_id} for payment {payment_id}, expires at {expires_at}")

    return {
        "challenge_id": verification.challenge_id,
        "expires_at": verification.expires_at,
        "payment_id": payment_id,
    }


@app.post(
    "/voice-payments/{payment_id}/biometric/complete",
    response_model=schemas.BiometricCompleteResponse,
)
@app.post(
    "/voice-payment/{payment_id}/biometric/complete",
    response_model=schemas.BiometricCompleteResponse,
)
def complete_biometric_challenge(
    payment_id: int,
    req: schemas.BiometricCompleteRequest,
    db: Session = Depends(get_db),
):
    """
    Completes device-local biometric verification.
    Validates challenge ownership and unexpired status, then marks as VERIFIED.
    Never accepts fingerprint or raw biometric data.
    """
    pending = (
        db.query(models.PendingPayment)
        .filter(
            models.PendingPayment.id == payment_id,
            models.PendingPayment.status == "PENDING",
        )
        .first()
    )
    if not pending:
        raise HTTPException(
            status_code=404,
            detail="Pending payment not found or already processed",
        )

    verification = (
        db.query(models.BiometricVerification)
        .filter(
            models.BiometricVerification.challenge_id == req.challenge_id,
        )
        .first()
    )
    if not verification or verification.pending_payment_id != payment_id:
        raise HTTPException(
            status_code=400,
            detail="Biometric challenge is invalid for this payment",
        )

    now = datetime.utcnow()
    if verification.status != "PENDING" or verification.expires_at <= now:
        verification.status = "EXPIRED"
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="Biometric challenge has expired or is invalid",
        )

    verification.status = "VERIFIED"
    verification.verified_at = now
    db.commit()
    db.refresh(verification)

    print(f"[Biometric] Completed verification for payment {payment_id}, challenge {verification.challenge_id}")

    return {
        "challenge_id": verification.challenge_id,
        "verified_at": verification.verified_at,
        "status": "VERIFIED",
    }
@app.post("/phone-payment/resolve")
def phone_payment_resolve(
    phone_number: str = Form(...),
    db: Session = Depends(get_db),
):
    """
    Resolve a demo phone number to a VoicePay user.
    Does not create or execute a payment.
    """

    receiver = crud.get_user_by_phone(db, phone_number)

    if not receiver:
        raise HTTPException(
            status_code=404,
            detail=f"Phone number '{phone_number}' is not registered with a VoicePay demo user.",
        )

    return {
        "phone_number": crud.normalize_phone_number(phone_number),
        "receiver_name": receiver.name,
        "receiver_upi": receiver.upi_id,
    }


@app.post("/phone-payment/preview", response_model=schemas.VoicePaymentPreview)
async def phone_payment_preview(
    sender_upi: str = Form(...),
    phone_number: str = Form(...),
    amount: float = Form(...),
    language: str = Form("en"),
    db: Session = Depends(get_db),
):
    """
    Creates the same server-side pending payment used by
    the normal VoicePay confirmation + biometric flow.
    """

    sender = crud.get_user_by_upi(db, sender_upi)

    if not sender:
        raise HTTPException(
            status_code=404,
            detail=f"Sender UPI '{sender_upi}' not found.",
        )

    receiver = crud.get_user_by_phone(db, phone_number)

    if not receiver:
        raise HTTPException(
            status_code=404,
            detail=f"Phone number '{phone_number}' is not registered with a VoicePay demo user.",
        )

    if amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Payment amount must be greater than zero.",
        )

    # Create pending payment using the language selected by the user
    pending_payment = models.PendingPayment(
        sender_id=sender.id,
        receiver_id=receiver.id,
        amount=amount,
        language=language,
        command=f"Phone payment to {receiver.name} ({crud.normalize_phone_number(phone_number)})",
        status="PENDING",
    )

    db.add(pending_payment)
    db.commit()
    db.refresh(pending_payment)

    # Generate confirmation in the selected language
    confirmation_text = confirmation_for(
        language,
        amount,
        receiver.name,
    )

    return {
        "payment_id": pending_payment.id,
        "amount": amount,
        "receiver_name": receiver.name,
        "receiver_upi": receiver.upi_id,
        "language": language,
        "command": pending_payment.command,
        "confirmation_text": confirmation_text,
    }
@app.post("/qr-payment/preview", response_model=schemas.VoicePaymentPreview)
def qr_payment_preview(
    sender_upi: str = Form(...),
    receiver_upi: str = Form(...),
    amount: float = Form(...),
    language: str = Form("en"),
    db: Session = Depends(get_db),
):
    """
    Creates a pending VoicePay payment from a scanned QR code.

    This does NOT execute the payment.
    It creates the same server-side pending payment
    used by the normal voice-payment flow.
    """

    # Normalize language
    language = str(language or "en").lower()

    if language.startswith("te"):
        language = "te"
    elif language.startswith("hi"):
        language = "hi"
    else:
        language = "en"

    # Find sender
    sender = crud.get_user_by_upi(db, sender_upi)

    if not sender:
        raise HTTPException(
            status_code=404,
            detail=f"Sender UPI '{sender_upi}' not found",
        )

    # Find receiver from QR UPI ID
    receiver = crud.get_user_by_upi(db, receiver_upi)

    if not receiver:
        raise HTTPException(
            status_code=404,
            detail=f"Receiver UPI '{receiver_upi}' not found",
        )

    # Validate amount
    if amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Payment amount must be greater than zero.",
        )

    # Create localized confirmation text
    if language == "te":
        confirmation_text = (
            f"{receiver.name} కి ₹{amount:.0f} పంపాలా?"
        )
    elif language == "hi":
        confirmation_text = (
            f"क्या आप {receiver.name} को ₹{amount:.0f} भेजना चाहते हैं?"
        )
    else:
        confirmation_text = (
            f"Send ₹{amount:.0f} to {receiver.name}?"
        )

    # Create pending payment
    pending_payment = models.PendingPayment(
        sender_id=sender.id,
        receiver_id=receiver.id,
        amount=amount,
        language=language,
        command=f"QR payment to {receiver.name}",
        status="PENDING",
    )

    db.add(pending_payment)
    db.commit()
    db.refresh(pending_payment)

    return {
        "payment_id": pending_payment.id,
        "amount": amount,
        "receiver_name": receiver.name,
        "receiver_upi": receiver.upi_id,
        "language": language,
        "command": f"QR payment to {receiver.name}",
        "confirmation_text": confirmation_text,
    }
@app.post("/payment/confirm", response_model=schemas.TransactionOut)
def confirm_payment(
    payment_id: int,
    db: Session = Depends(get_db),
):
    """
    Confirms a previously created pending voice payment for blind users.

    Requires an unexpired, VERIFIED device-local biometric challenge
    for this pending payment before execution. Does not require manual PIN entry.
    """

    pending = (
        db.query(models.PendingPayment)
        .filter(
            models.PendingPayment.id == payment_id,
            models.PendingPayment.status == "PENDING",
        )
        .first()
    )

    if not pending:
        raise HTTPException(
            status_code=404,
            detail="Pending payment not found or already processed",
        )

    # 1. Enforce biometric verification requirement
    now = datetime.utcnow()
    biometric_verification = (
        db.query(models.BiometricVerification)
        .filter(
            models.BiometricVerification.pending_payment_id == payment_id,
            models.BiometricVerification.status == "VERIFIED",
            models.BiometricVerification.expires_at > now,
        )
        .order_by(models.BiometricVerification.id.desc())
        .first()
    )

    if not biometric_verification:
        raise HTTPException(
            status_code=403,
            detail="Biometric verification is required before confirming this payment.",
        )

    sender = db.query(models.User).filter(
        models.User.id == pending.sender_id
    ).first()

    receiver = db.query(models.User).filter(
        models.User.id == pending.receiver_id
    ).first()

    if not sender or not receiver:
        raise HTTPException(
            status_code=404,
            detail="Payment account no longer exists",
        )

    try:
        transaction = crud.execute_transfer(
            db,
            sender.upi_id,
            receiver.upi_id,
            pending.amount,
            pin=None,
            raw_command=pending.command,
            verification_method="LOCAL_DEVICE_BIOMETRIC",
        )

        # Mark challenge consumed and pending payment confirmed
        biometric_verification.status = "CONSUMED"
        pending.status = "CONFIRMED"
        db.commit()

        return transaction

    except crud.InvalidPinError as e:
        raise HTTPException(status_code=401, detail=str(e))

    except crud.InsufficientFundsError as e:
        raise HTTPException(status_code=402, detail=str(e))

    except crud.UserNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/voice-payment", response_model=schemas.TransactionOut)
async def voice_payment(
    file: UploadFile = File(...),
    sender_upi: str = Form(...),
    pin: str = Form(...),
    db: Session = Depends(get_db),
):
    """
    Complete voice-payment pipeline.

    Audio
      -> speech recognition
      -> normalization
      -> payment command parsing
      -> receiver resolution
      -> secure transfer
    """

    suffix = os.path.splitext(file.filename or "")[1] or ".wav"
    temp_path = None

    try:
        # Save uploaded audio temporarily
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix,
        ) as temp_file:
            temp_path = temp_file.name
            content = await file.read()
            temp_file.write(content)

        

        # 1. Speech -> text
        try:
            result = transcribe_audio(temp_path)
        except SpeechServiceError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        # 2. Normalize ASR output (language-aware)
        normalized_text = normalize_speech_text(
            result["text"], result["language"]
        )

        # 3. Parse intent, amount and receiver
        try:
            amount, receiver_name, language = crud.parse_voice_command(
                normalized_text
            )
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=str(e),
            )

        # 4. Resolve receiver
        receiver = crud.get_user_by_name(
            db,
            receiver_name,
        )

        if not receiver:
            raise HTTPException(
                status_code=404,
                detail=f"No contact matching '{receiver_name}' found",
            )

        
        # 5. Execute the existing payment engine
        return crud.execute_transfer(
            db,
            sender_upi,
            receiver.upi_id,
            amount,
            pin,
            raw_command=normalized_text,
        )

    except crud.UserNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    except crud.InvalidPinError as e:
        raise HTTPException(status_code=401, detail=str(e))

    except crud.InsufficientFundsError as e:
        raise HTTPException(status_code=402, detail=str(e))

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)   
# ---------------------------------------------------------------------
# Transaction history
# ---------------------------------------------------------------------
@app.get("/transactions", response_model=list[schemas.TransactionOut])
def get_transactions(upi_id: str | None = None, db: Session = Depends(get_db)):
    return crud.list_transactions(db, upi_id)


@app.get(
    "/users/{upi_id}/transaction-history",
    response_model=schemas.TransactionHistoryResponse,
)
def get_user_transaction_history(
    upi_id: str,
    response: Response,
    limit: int = Query(20, ge=1, le=100, description="Number of transactions to return"),
    offset: int = Query(0, ge=0, description="Number of transactions to skip"),
    db: Session = Depends(get_db),
):
    """
    Returns paginated transaction history for a user with direction (SENT/RECEIVED)
    and resolved counterparty details.
    """
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    try:
        return crud.get_user_transaction_history(
            db,
            upi_id=upi_id,
            limit=limit,
            offset=offset,
        )
    except crud.UserNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

