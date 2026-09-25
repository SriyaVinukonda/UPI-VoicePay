from app.database import SessionLocal
from app.models import User
from app.crud import create_user
from app.security import verify_pin
from app.schemas import UserCreate

db = SessionLocal()

try:
    user_data = UserCreate(
        name="SecurityTest",
        upi_id="securitytest@voicepay",
        pin="5678",
        balance=1000.0,
    )

    user = create_user(db, user_data)

    print("UPI:", user.upi_id)
    print("PIN is hashed:", user.pin.startswith("$argon2"))
    print("Correct PIN:", verify_pin("5678", user.pin))
    print("Wrong PIN:", verify_pin("1234", user.pin))

finally:
    db.close()