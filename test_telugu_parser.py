from app.crud import parse_voice_command

tests = [
    "సురేష్ కి 500 రూపాయలు పంపు",
    "సురేష్‌కు ఐదు వందల రూపాయలు పంపించు",
    "ఐదు వందల రూపాయలు సురేష్‌కు పంపించు",
    "Suresh ki 500 rupayalu pampu",
    "Suresh ku 500 rupayalu pampinchandi",
]

for command in tests:
    try:
        result = parse_voice_command(command)
        print(f"PASS: {command}")
        print(f"     → {result}\n")
    except Exception as e:
        print(f"FAIL: {command}")
        print(f"     → {e}\n")