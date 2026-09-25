"""Regression tests for Devanagari-script Telugu ASR output."""

import unittest

from app.normalizer import normalize_speech_text


class TeluguAsrNormalizationTests(unittest.TestCase):
    def test_trailing_devanagari_vowel_sign_is_removed(self):
        raw_text = "सूरेश को आइदूवन्दला रूपायलू पमपिन्चू"

        normalized = normalize_speech_text(raw_text, language="te")

        self.assertEqual(
            normalized,
            "సురేష్ కి ఐదు వందల రూపాయలు పంపించు",
        )


if __name__ == "__main__":
    unittest.main()
