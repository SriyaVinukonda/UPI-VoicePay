from app.speech import transcribe_audio
from app.normalizer import normalize_speech_text
from app import crud


audio_file = "tests/audio/telugu_test_1.wav"

# 1. Speech → text
result = transcribe_audio(audio_file)

raw_text = result["text"]

print("\nASR OUTPUT:")
print(raw_text)

# 2. Normalize ASR output
normalized_text = normalize_speech_text(raw_text)

print("\nNORMALIZED:")
print(normalized_text)

# 3. Parse payment command
amount, receiver, language = crud.parse_voice_command(normalized_text)

print("\nPARSED PAYMENT:")
print("Amount   :", amount)
print("Receiver :", receiver)
print("Language :", language)