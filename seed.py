"""
Seed the database with dummy users + starting balances so you have
data to demo against immediately.

Run:  python seed.py
"""

from app.database import Base, engine, SessionLocal
from app import models
from app.security import hash_pin

Base.metadata.create_all(bind=engine)

DUMMY_USERS = [
    {"name": "Ramesh", "upi_id": "ramesh@voicepay", "pin": "1234", "balance": 10000.0},
    {"name": "Suresh", "upi_id": "suresh@voicepay", "pin": "1111", "balance": 2000.0},
    {"name": "Priya", "upi_id": "priya@voicepay", "pin": "2222", "balance": 7500.0},
    {"name": "Anjali", "upi_id": "anjali@voicepay", "pin": "3333", "balance": 1000.0},
]


def seed():
    db = SessionLocal()
    try:
        for u in DUMMY_USERS:
            existing = (
                db.query(models.User).filter(models.User.upi_id == u["upi_id"]).first()
            )
            if existing:
                print(f"Skipping {u['upi_id']} (already exists)")
                continue
            db.add(
                models.User(
                    **{**u, "pin": hash_pin(u["pin"])}
                )
            )
            print(f"Added {u['name']} ({u['upi_id']}) with balance {u['balance']}")
        db.commit()
        print("\nSeeding complete.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
