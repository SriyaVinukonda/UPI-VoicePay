"""Runtime configuration for the VoicePay backend.

Secrets are read from environment variables. They must never be committed to
the repository or returned by an API endpoint.
"""

from dataclasses import dataclass
from functools import lru_cache
import os

try:
    from dotenv import load_dotenv
except ImportError:  # Allows offline security tests before dependencies install.
    def load_dotenv() -> bool:
        return False


# A local .env is convenient for development. Production should inject these
# values through the hosting environment instead.
load_dotenv()


@dataclass(frozen=True)
class Settings:
    razorpay_key_id: str | None
    razorpay_key_secret: str | None
    razorpay_webhook_secret: str | None
    razorpay_currency: str = "INR"
    checkout_name: str = "UPI VoicePay"
    sarvam_api_key: str | None = None
    sarvam_stt_model: str = "saaras:v3"
    sarvam_stt_mode: str = "transcribe"
    sarvam_stt_language_code: str = "unknown"
    sarvam_tts_model: str = "bulbul:v3"
    sarvam_tts_speaker: str = "shubh"
    sarvam_tts_sample_rate: int = 24000

    @property
    def razorpay_is_configured(self) -> bool:
        return bool(self.razorpay_key_id and self.razorpay_key_secret)

    @property
    def sarvam_is_configured(self) -> bool:
        return bool(self.sarvam_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings(
        razorpay_key_id=os.getenv("RAZORPAY_KEY_ID"),
        razorpay_key_secret=os.getenv("RAZORPAY_KEY_SECRET"),
        razorpay_webhook_secret=os.getenv("RAZORPAY_WEBHOOK_SECRET"),
        razorpay_currency=os.getenv("RAZORPAY_CURRENCY", "INR"),
        checkout_name=os.getenv("CHECKOUT_NAME", "UPI VoicePay"),
        sarvam_api_key=os.getenv("SARVAM_API_KEY"),
        sarvam_stt_model=os.getenv("SARVAM_STT_MODEL", "saaras:v3"),
        sarvam_stt_mode=os.getenv("SARVAM_STT_MODE", "transcribe"),
        sarvam_stt_language_code=os.getenv("SARVAM_STT_LANGUAGE_CODE", "unknown"),
        sarvam_tts_model=os.getenv("SARVAM_TTS_MODEL", "bulbul:v3"),
        sarvam_tts_speaker=os.getenv("SARVAM_TTS_SPEAKER", "shubh"),
        sarvam_tts_sample_rate=int(os.getenv("SARVAM_TTS_SAMPLE_RATE", "24000")),
    )
