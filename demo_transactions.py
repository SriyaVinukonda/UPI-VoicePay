"""
Standalone demo (no server needed) that proves the DB updates correctly:
  1. prints starting balances
  2. runs a normal voice-command payment (success case)
  3. runs a payment that should fail (insufficient funds)
  4. prints ending balances + full transaction log

Run:  python demo_transactions.py
(Run seed.py first if you haven't.)
"""

from app.database import SessionLocal
from app import crud


def print_balances(db, title):
    print(f"\n--- {title} ---")
    for u in crud.list_users(db):
        print(f"  {u.name:10s} ({u.upi_id:20s}) balance = Rs.{u.balance:.2f}")


def main():
    db = SessionLocal()
    try:
        print_balances(db, "BEFORE")

        # 1) Successful voice-command payment
        print("\n>> Voice command: 'Send 500 rupees to Suresh' (from ramesh@voicepay)")
        try:
            amount, name = crud.parse_voice_command("Send 500 rupees to Suresh")
            receiver = crud.get_user_by_name(db, name)
            txn = crud.execute_transfer(
                db,
                sender_upi="ramesh@voicepay",
                receiver_upi=receiver.upi_id,
                amount=amount,
                pin="1234",
                raw_command="Send 500 rupees to Suresh",
            )
            print(f"   SUCCESS -> transaction id {txn.id}, status {txn.status}")
        except Exception as e:
            print(f"   FAILED -> {e}")

        # 2) Payment that should fail: Anjali only has 1000, tries to send 5000
        print("\n>> Direct payment: anjali@voicepay tries to send Rs.5000 to priya@voicepay")
        try:
            txn = crud.execute_transfer(
                db,
                sender_upi="anjali@voicepay",
                receiver_upi="priya@voicepay",
                amount=5000,
                pin="3333",
            )
            print(f"   SUCCESS -> transaction id {txn.id}, status {txn.status}")
        except Exception as e:
            print(f"   FAILED as expected -> {e}")

        print_balances(db, "AFTER")

        print("\n--- Full transaction log ---")
        for t in crud.list_transactions(db):
            print(
                f"  id={t.id} sender_id={t.sender_id} receiver_id={t.receiver_id} "
                f"amount=Rs.{t.amount:.2f} status={t.status} reason={t.reason}"
            )
    finally:
        db.close()


if __name__ == "__main__":
    main()
