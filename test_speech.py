from app.speech import transcribe_audio

AUDIO_FILE = "telugu_test_2.wav"

result = transcribe_audio(AUDIO_FILE)

print("\n--- TRANSCRIPTION RESULT ---")
print("Text:", result["text"])
print("Language:", result["language"])
print("Confidence:", result["language_probability"])