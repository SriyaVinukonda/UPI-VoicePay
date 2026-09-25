from pathlib import Path

from app.speech import transcribe_audio


TESTS = [
    {
        "file": "tests/audio/telugu_test_1.wav",
        "expected": "సురేష్‌కు ఐదు వందల రూపాయలు పంపించు",
    },
    {
        "file": "tests/audio/telugu_test_2.wav",
        "expected": "ప్రియకు రెండు వందల రూపాయలు పంపించు",
    },
]


for test in TESTS:
    audio_file = Path(test["file"])

    print("\n" + "=" * 60)
    print(f"FILE: {audio_file}")
    print(f"EXPECTED: {test['expected']}")

    try:
        result = transcribe_audio(str(audio_file))

        print(f"RECOGNIZED: {result['text']}")
        print(f"LANGUAGE: {result['language']}")
        print(f"LANGUAGE CONFIDENCE: {result['language_probability']:.3f}")

    except Exception as e:
        print(f"ERROR: {e}")