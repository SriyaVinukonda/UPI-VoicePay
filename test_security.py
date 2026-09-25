from app.security import hash_pin, verify_pin

pin = "1234"

hashed = hash_pin(pin)

print("Hashed PIN:", hashed)
print("Correct PIN:", verify_pin("1234", hashed))
print("Wrong PIN:", verify_pin("9999", hashed))