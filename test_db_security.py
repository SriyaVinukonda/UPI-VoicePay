from app.database import SessionLocal
from app.models import User
from app.security import verify_pin


db = SessionLocal()

try:
    user = db.query(User).filter(
        User.upi_id == "ramesh@voicepay"
    ).first()

    print("User:", user.upi_id)
    print("PIN is hashed:", user.pin.startswith("$argon2"))

    print("Correct PIN:", verify_pin("1234", user.pin))
    print("Wrong PIN:", verify_pin("9999", user.pin))

finally:
    db.close()