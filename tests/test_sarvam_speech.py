"""Unit tests for the Sarvam speech adapter; no network or API key required."""

import base64
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from app.config import Settings
from app.speech import SpeechServiceError, synthesize_speech, transcribe_audio


class FakeSarvamClient:
    def __init__(self):
        self.transcribe_kwargs = None
        self.tts_kwargs = None
        self.speech_to_text = SimpleNamespace(transcribe=self.transcribe)
        self.text_to_speech = SimpleNamespace(convert=self.convert)

    def transcribe(self, **kwargs):
        self.transcribe_kwargs = kwargs
        return SimpleNamespace(
            transcript="సురేష్ కి ఐదు వందల రూపాయలు పంపించు",
            language_code="te-IN",
            language_probability=0.98,
            request_id="stt-request",
        )

    def convert(self, **kwargs):
        self.tts_kwargs = kwargs
        return SimpleNamespace(
            audios=[base64.b64encode(b"RIFF").decode("ascii")],
            request_id="tts-request",
        )


class SarvamSpeechTests(unittest.TestCase):
    def setUp(self):
        self.settings = Settings(
            razorpay_key_id=None,
            razorpay_key_secret=None,
            razorpay_webhook_secret=None,
            sarvam_api_key="unit-test-key",
        )
        self.client = FakeSarvamClient()

    def test_transcription_uses_saaras_auto_detect_and_maps_language(self):
        with TemporaryDirectory() as directory:
            audio_path = Path(directory) / "command.wav"
            audio_path.write_bytes(b"not-real-audio")

            with patch("app.speech.get_settings", return_value=self.settings), patch(
                "app.speech._get_client", return_value=self.client
            ):
                result = transcribe_audio(str(audio_path))

        self.assertEqual(result["text"], "సురేష్ కి ఐదు వందల రూపాయలు పంపించు")
        self.assertEqual(result["language"], "te")
        self.assertEqual(result["language_code"], "te-IN")
        self.assertEqual(result["request_id"], "stt-request")
        self.assertEqual(self.client.transcribe_kwargs["model"], "saaras:v3")
        self.assertEqual(self.client.transcribe_kwargs["mode"], "transcribe")
        self.assertEqual(self.client.transcribe_kwargs["language_code"], "unknown")

    def test_tts_returns_base64_wav_and_bulbul_settings(self):
        with patch("app.speech.get_settings", return_value=self.settings), patch(
            "app.speech._get_client", return_value=self.client
        ):
            result = synthesize_speech(
                text="సురేష్ కి ₹500 పంపాలా?",
                language_code="te-IN",
            )

        self.assertEqual(result["audio_codec"], "wav")
        self.assertEqual(result["sample_rate"], 24000)
        self.assertEqual(result["request_id"], "tts-request")
        self.assertEqual(self.client.tts_kwargs["model"], "bulbul:v3")
        self.assertEqual(self.client.tts_kwargs["speaker"], "shubh")
        self.assertEqual(self.client.tts_kwargs["language_code"], "te-IN")

    def test_missing_api_key_has_safe_error(self):
        no_key = Settings(None, None, None)
        with patch("app.speech.get_settings", return_value=no_key):
            with self.assertRaisesRegex(SpeechServiceError, "SARVAM_API_KEY"):
                synthesize_speech("Hello", "en-IN")


if __name__ == "__main__":
    unittest.main()
