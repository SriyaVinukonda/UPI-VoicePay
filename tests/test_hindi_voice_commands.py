"""
Regression tests for Hindi voice-payment commands and safety.

Verifies that:
1. normalize_speech_text() does NOT alter Hindi words (e.g. को, रुपये, भेजो)
   when language is 'hi', 'unknown', or None.
2. parse_voice_command() correctly extracts amount, receiver, and language
   for canonical Hindi, Hinglish, Devanagari numerals, and Hindi number word patterns.
3. FastAPI endpoints (/voice-payment/preview, /payment/confirm) correctly handle
   Hindi payment previews and confirmations.
"""

import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.normalizer import normalize_speech_text
from app.crud import parse_voice_command, create_user, get_user_by_upi
from app.database import Base, SessionLocal, engine
from app.main import app
from app.schemas import UserCreate


class HindiNormalizationTests(unittest.TestCase):
    """Normalization must never corrupt Hindi grammar or vocabulary."""

    def test_hindi_words_preserved_when_language_is_hi(self):
        # Must preserve valid Hindi words: को, रुपये, रुपया, भेजो, भेजें, प्रिया, सुरेश
        raw = "प्रिया को 1000 रुपये भेजो"
        normalized = normalize_speech_text(raw, language="hi")
        self.assertEqual(normalized, raw)
        self.assertIn("को", normalized)
        self.assertNotIn("కి", normalized)

    def test_hindi_words_preserved_when_language_is_none_or_unknown(self):
        raw = "सुरेश को पाँच सौ रुपये भेजें"
        normalized_none = normalize_speech_text(raw, language=None)
        self.assertEqual(normalized_none, raw)
        self.assertIn("को", normalized_none)
        self.assertNotIn("కి", normalized_none)

        normalized_unknown = normalize_speech_text(raw, language="unknown")
        self.assertEqual(normalized_unknown, raw)
        self.assertIn("को", normalized_unknown)

    def test_telugu_normalization_applies_only_for_telugu(self):
        # Telugu text with mixed Devanagari / ASR artifacts
        telugu_raw = "రమేష్ కి 500 పంపు"
        normalized_te = normalize_speech_text(telugu_raw, language="te")
        self.assertIsNotNone(normalized_te)


class HindiVoiceCommandParserTests(unittest.TestCase):
    """parse_voice_command() must handle canonical Hindi & Hinglish commands."""

    def _check(self, command, expected_amount, expected_receiver, expected_lang="hi"):
        amount, receiver, lang = parse_voice_command(command)
        self.assertAlmostEqual(
            amount, expected_amount, places=2,
            msg=f"Amount mismatch for: {command!r}",
        )
        self.assertEqual(
            receiver.lower(), expected_receiver.lower(),
            msg=f"Receiver mismatch for: {command!r}",
        )
        self.assertEqual(
            lang, expected_lang,
            msg=f"Language mismatch for: {command!r}",
        )

    def test_sample_1_priya_1000_rupaye_bhejo(self):
        # प्रिया को 1000 रुपये भेजो
        self._check("प्रिया को 1000 रुपये भेजो", 1000, "Priya")

    def test_sample_2_priya_ek_hazar_rupaye_bhejo(self):
        # प्रिया को एक हजार रुपये भेजो
        self._check("प्रिया को एक हजार रुपये भेजो", 1000, "Priya")

    def test_sample_3_ek_hazar_rupaye_priya_ko_bhejo(self):
        # एक हजार रुपये प्रिया को भेजो
        self._check("एक हजार रुपये प्रिया को भेजो", 1000, "Priya")

    def test_sample_4_suresh_ko_paanch_sau_rupaye_bhejo(self):
        # सुरेश को पाँच सौ रुपये भेजो
        self._check("सुरेश को पाँच सौ रुपये भेजो", 500, "Suresh")
        # variant with पांच
        self._check("सुरेश को पांच सौ रुपये भेजो", 500, "Suresh")

    def test_sample_5_hinglish_receiver_first(self):
        # Priya ko 1000 rupaye bhejo
        self._check("Priya ko 1000 rupaye bhejo", 1000, "Priya")

    def test_sample_6_hinglish_amount_first(self):
        # 1000 rupaye Priya ko bhejo
        self._check("1000 rupaye Priya ko bhejo", 1000, "Priya")

    def test_devanagari_numerals(self):
        # सुरेश को ५०० रुपये भेजो
        self._check("सुरेश को ५०० रुपये भेजो", 500, "Suresh")
        # प्रिया को १००० रुपये भेजो
        self._check("प्रिया को १००० रुपये भेजो", 1000, "Priya")

    def test_hindi_name_mappings(self):
        # रमेश -> Ramesh
        self._check("रमेश को 100 रुपये भेजो", 100, "Ramesh")
        # सुरेश -> Suresh
        self._check("सुरेश को 200 रुपये भेजो", 200, "Suresh")
        # प्रिया -> Priya
        self._check("प्रिया को 300 रुपये भेजो", 300, "Priya")
        # अंजलि -> Anjali
        self._check("अंजलि को 400 रुपये भेजो", 400, "Anjali")

    def test_hindi_number_words(self):
        # दस (10), बीस (20), पचास (50), सौ (100), एक सौ (100)
        self._check("रमेश को दस रुपये भेजो", 10, "Ramesh")
        self._check("सुरेश को बीस रुपये भेजो", 20, "Suresh")
        self._check("प्रिया को पचास रुपये भेजो", 50, "Priya")
        self._check("अंजलि को सौ रुपये भेजो", 100, "Anjali")
        self._check("रमेश को एक सौ रुपये भेजो", 100, "Ramesh")
        self._check("सुरेश को हजार रुपये भेजो", 1000, "Suresh")
        self._check("अंजलि को हज़ार रुपये भेजो", 1000, "Anjali")


class HindiEndpointIntegrationTests(unittest.TestCase):
    """Verify Hindi preview and confirmation through FastAPI endpoints."""

    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.db = SessionLocal()
        self.client = TestClient(app)

        # Ensure seed users exist
        if not get_user_by_upi(self.db, "ramesh@voicepay"):
            create_user(self.db, UserCreate(name="Ramesh Kumar", upi_id="ramesh@voicepay", pin="1234", balance=10000.0))
        if not get_user_by_upi(self.db, "priya@voicepay"):
            create_user(self.db, UserCreate(name="Priya Sharma", upi_id="priya@voicepay", pin="1234", balance=5000.0))

    def tearDown(self):
        self.db.close()

    @patch("app.main.transcribe_audio")
    def test_preview_and_confirm_hindi_payment(self, mock_transcribe):
        mock_transcribe.return_value = {
            "text": "प्रिया को 1000 रुपये भेजो",
            "language": "hi",
            "language_code": "hi-IN",
        }

        # 1. Preview
        response = self.client.post(
            "/voice-payment/preview",
            files={"file": ("test.wav", b"fake-audio-bytes", "audio/wav")},
            data={"sender_upi": "ramesh@voicepay"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        preview_data = response.json()
        self.assertEqual(preview_data["amount"], 1000.0)
        self.assertEqual(preview_data["language"], "hi")
        self.assertIn("Priya", preview_data["receiver_name"])
        payment_id = preview_data["payment_id"]

        # 2. Biometric verification
        c_res = self.client.post(f"/voice-payments/{payment_id}/biometric/challenge")
        self.assertEqual(c_res.status_code, 200, c_res.text)
        challenge_id = c_res.json()["challenge_id"]

        comp_res = self.client.post(
            f"/voice-payments/{payment_id}/biometric/complete",
            json={"challenge_id": challenge_id},
        )
        self.assertEqual(comp_res.status_code, 200, comp_res.text)

        # 3. Confirm
        confirm_res = self.client.post(
            f"/payment/confirm?payment_id={payment_id}",
            data={"pin": "1234"},
        )
        self.assertEqual(confirm_res.status_code, 200, confirm_res.text)
        confirm_data = confirm_res.json()
        self.assertEqual(confirm_data["status"], "SUCCESS")
        self.assertEqual(confirm_data["amount"], 1000.0)


if __name__ == "__main__":
    unittest.main()
