from app.normalizer import normalize_speech_text


tests = [
    "सूरेश को आएदूवन्दल रूपायलू पमपिन्चू",
    "प्रियाखु रेंदूवन्दला रूपायलू पमपिन्चू",
]


for text in tests:
    print("INPUT :", text)
    print("OUTPUT:", normalize_speech_text(text))
    print()