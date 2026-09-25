from app.database import SessionLocal
from app.models import User
from app.security import hash_pin


db = SessionLocal()

try:
    users = db.query(User).all()

    for user in users:
        # Migrate every plaintext demo PIN, not only one test account.
        if not user.pin.startswith("$argon2"):
            user.pin = hash_pin(user.pin)
            print(f"Migrated PIN for {user.upi_id}")

    db.commit()

    print("PIN migration complete.")

finally:
    db.close()
