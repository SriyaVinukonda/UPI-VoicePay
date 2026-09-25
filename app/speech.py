"""Sarvam AI speech-to-text and text-to-speech integration.

The Sarvam SDK is imported only when a speech request is made. That keeps
configuration errors actionable and lets the rest of the service start while
credentials are being set up.
"""

from __future__ import annotations

import base64
from collections.abc import Mapping
from pathlib import Path
from typing import Any

from .config import get_settings


class SpeechServiceError(RuntimeError):
    """A safe, user-facing error raised by the cloud speech provider."""


LANGUAGE_ALIASES = {
    "te-in": "te",
    "hi-in": "hi",
    "en-in": "en",
}


def _response_value(response: Any, key: str, default: Any = None) -> Any:
    """Read a field from either an SDK model or a dictionary response."""
    if isinstance(response, Mapping):
        return response.get(key, default)
    return getattr(response, key, default)


def _get_client() -> Any:
    settings = get_settings()
    if not settings.sarvam_api_key:
        raise SpeechServiceError(
            "Sarvam speech is not configured. Add SARVAM_API_KEY to .env and restart FastAPI."
        )

    try:
        from sarvamai import SarvamAI
    except ImportError as exc:
        raise SpeechServiceError(
            "Sarvam SDK is not installed. Run 'pip install -r requirements.txt' and restart FastAPI."
        ) from exc

    return SarvamAI(api_subscription_key=settings.sarvam_api_key)


def _project_language(language_code: str | None) -> str:
    """Keep the compact language values expected by the existing parser."""
    if not language_code:
        return "unknown"
    normalized = language_code.lower()
    return LANGUAGE_ALIASES.get(normalized, language_code.split("-", 1)[0].lower())


def transcribe_audio(
    audio_path: str,
    language: str | None = None,
) -> dict[str, Any]:
    """Transcribe short audio with Sarvam Saaras and normalize response fields.

    ``SARVAM_STT_LANGUAGE_CODE=unknown`` lets Sarvam auto-detect Telugu,
    Hindi, or English. The original BCP-47 value is also returned for clients
    that need it, while ``language`` remains compatible with this project.
    """
    settings = get_settings()
    path = Path(audio_path)
    if not path.is_file():
        raise SpeechServiceError("The uploaded audio file could not be read.")

    request: dict[str, Any] = {
    "model": settings.sarvam_stt_model,
    "language_code": (
        {
            "en": "en-IN",
            "hi": "hi-IN",
            "te": "te-IN",
        }.get(language)
        if language in {"en", "hi", "te"}
        else settings.sarvam_stt_language_code
    ),
}
    # Sarvam documents mode as a Saaras v3-only setting.
    if settings.sarvam_stt_model == "saaras:v3":
        request["mode"] = settings.sarvam_stt_mode

    try:
        with path.open("rb") as audio_file:
            response = _get_client().speech_to_text.transcribe(
                file=audio_file,
                **request,
            )
    except SpeechServiceError:
        raise
    except Exception as exc:
        raise SpeechServiceError(
            "Sarvam speech-to-text failed. Check SARVAM_API_KEY, network access, and Sarvam API usage."
        ) from exc

    text = str(_response_value(response, "transcript", "")).strip()
    if not text:
        raise SpeechServiceError("Sarvam returned an empty transcription. Please record the command again.")

    language_code = _response_value(response, "language_code")
    language_probability = _response_value(response, "language_probability")
    project_lang = _project_language(language_code)

    print(
        f"[Sarvam ASR] raw_transcript={ascii(text)}, bcp47={language_code!r}, "
        f"project_language={project_lang!r}, probability={language_probability}"
    )

    return {
        "text": text,
        "language": project_lang,
        "language_code": language_code,
        "language_probability": language_probability,
        "request_id": _response_value(response, "request_id"),
    }


def synthesize_speech(
    text: str,
    language_code: str,
    speaker: str | None = None,
    pace: float = 1.0,
) -> dict[str, Any]:
    """Create a base64-encoded WAV confirmation using Sarvam Bulbul."""
    cleaned_text = text.strip()
    if not cleaned_text:
        raise SpeechServiceError("Text is required to generate speech.")

    settings = get_settings()
    try:
        response = _get_client().text_to_speech.convert(
            text=cleaned_text,
            language_code=language_code,
            speaker=speaker or settings.sarvam_tts_speaker,
            pace=pace,
            model=settings.sarvam_tts_model,
            speech_sample_rate=settings.sarvam_tts_sample_rate,
            output_audio_codec="wav",
        )
    except SpeechServiceError:
        raise
    except Exception as exc:
        raise SpeechServiceError(
            "Sarvam text-to-speech failed. Check SARVAM_API_KEY, network access, and Sarvam API usage."
        ) from exc

    audios = _response_value(response, "audios", []) or []
    if not isinstance(audios, list) or not audios or not isinstance(audios[0], str):
        raise SpeechServiceError("Sarvam returned no playable audio.")

    # Validate that the value can safely be handed to a client as base64 WAV.
    try:
        base64.b64decode(audios[0], validate=True)
    except (ValueError, TypeError) as exc:
        raise SpeechServiceError("Sarvam returned invalid audio data.") from exc

    return {
        "audio_base64": audios[0],
        "audio_codec": "wav",
        "sample_rate": settings.sarvam_tts_sample_rate,
        "request_id": _response_value(response, "request_id"),
    }
