from app.database import SessionLocal
from app.models import User


db = SessionLocal()

try:
    user = db.query(User).filter(
        User.upi_id == "ramesh@voicepay"
    ).first()

    if not user:
        print("User not found")
    else:
        print(f"Old balance: ₹{user.balance}")

        user.balance = 10000.0
        db.commit()
        db.refresh(user)

        print(f"New balance: ₹{user.balance}")

finally:
    db.close()