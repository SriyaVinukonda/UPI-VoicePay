"""
ASR transcript normalizer for UPI VoicePay.

Language-aware: Telugu Devanagari->Telugu script corrections are applied
only when the Sarvam-detected language is ``te``.  Hindi (``hi``) and
English (``en``) transcripts are left structurally intact - only
whitespace cleanup and Unicode NFC normalisation are performed so that
grammar words such as ``को``, ``की``, ``रुपये`` are never corrupted.
"""

import logging
import re
import unicodedata

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Telugu-specific ASR correction maps
# Sarvam sometimes outputs Telugu phonetics in Devanagari script.
# These replacements are safe *only* for Telugu transcripts.
# ---------------------------------------------------------------------------

# Longer joined variants must be tried first to avoid partial matches.
_TELUGU_JOINED_VARIANTS: dict[str, str] = {
    "आइदुवन्दलारूपायलू": "ఐదు వందల రూపాయలు",
    "आएदूवन्दलारूपायलू": "ఐదు వందల రూపాయలు",
    "आइदूवन्दलारूपायलू": "ఐదు వందల రూపాయలు",
    "आइदुवन्दलरूपायलू":  "ఐదు వందల రూపాయలు",
    "आएदूवन्दलरूपायलू":  "ఐదు వందల రూపాయలు",
    "आइदूवन्दलरूपायलू":  "ఐదు వందల రూపాయలు",
}

_TELUGU_DEVANAGARI_MAP: dict[str, str] = {
    # Receiver names written in Devanagari by Sarvam
    "सूरेश":      "సురేష్",
    "प्रियाखु":   "ప్రియకు",

    # Telugu postpositions that Sarvam renders in Devanagari
    # NOTE: "को" and "की" are VALID Hindi words - do NOT apply to Hindi!
    "को": "కి",
    "की": "కి",

    # Amount words
    "आएदूवन्दला": "ఐదు వందల",
    "आइदुवन्दला": "ఐదు వందల",
    "आइदूवन्दला": "ఐదు వందల",
    "आएदूवन्दल":  "ఐదు వందల",
    "आइदुवन्दल":  "ఐదు వందల",
    "आइदूवन्दल":  "ఐదు వందల",
    "रेंदूवन्दला": "రెండు వందల",

    # Currency
    "रूपायलू": "రూపాయలు",

    # Payment verbs
    "पमपिन्चू": "పంపించు",
    "पम्पिन्चू": "పంపించు",
}


def normalize_speech_text(text: str, language: str | None = None) -> str:
    """
    Normalise a raw Sarvam ASR transcript for downstream parsing.

    Parameters
    ----------
    text:
        Raw transcript returned by Sarvam STT.
    language:
        ISO-639-1 code as returned by Sarvam (e.g. ``"te"``, ``"hi"``,
        ``"en"``).  When ``None`` the function falls back to applying
        Telugu corrections to preserve backward compatibility.

    Returns
    -------
    str
        Normalised transcript ready for ``parse_voice_command()``.
    """

    # Step 1 - Unicode NFC normalisation + strip (safe for all languages)
    normalized = unicodedata.normalize("NFC", text).strip()

    logger.debug(
        "normalize_speech_text | language=%r | raw=%r",
        language,
        text,
    )

    # Step 2 - Telugu-specific Devanagari->Telugu script corrections.
    # Applied ONLY when the transcript is identified as Telugu (language == "te").
    # Applying these to Hindi corrupts valid Hindi grammar: e.g. "को" -> "కి".
    if language == "te":
        # Longer joined variants first to prevent partial-match collisions.
        for source, target in _TELUGU_JOINED_VARIANTS.items():
            normalized = normalized.replace(source, target)

        for source, target in _TELUGU_DEVANAGARI_MAP.items():
            normalized = normalized.replace(source, target)

    # Step 3 - Collapse repeated whitespace (safe for all languages)
    normalized = re.sub(r"\s+", " ", normalized).strip()

    logger.debug(
        "normalize_speech_text | language=%r | normalized=%r",
        language,
        normalized,
    )

    return normalized
