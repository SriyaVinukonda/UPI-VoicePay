"""Tests for GET /users/{upi_id}/transaction-history endpoint.

Run with: python -m unittest tests/test_transaction_history.py
"""

from datetime import datetime, timedelta
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import Transaction, User
from app.security import hash_pin


class TransactionHistoryEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create an isolated in-memory SQLite database for testing
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.TestingSessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=cls.engine
        )
        Base.metadata.create_all(bind=cls.engine)

        def override_get_db():
            db = cls.TestingSessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=cls.engine)

    def setUp(self):
        # Clear tables between tests
        self.db = self.TestingSessionLocal()
        self.db.query(Transaction).delete()
        self.db.query(User).delete()
        self.db.commit()

        # Seed test users
        self.user_ramesh = User(
            name="Ramesh Kumar",
            upi_id="ramesh@voicepay",
            pin=hash_pin("1234"),
            balance=10000.0,
        )
        self.user_priya = User(
            name="Priya Sharma",
            upi_id="priya@voicepay",
            pin=hash_pin("1234"),
            balance=5000.0,
        )
        self.user_suresh = User(
            name="Suresh Patel",
            upi_id="suresh@voicepay",
            pin=hash_pin("1234"),
            balance=3000.0,
        )
        self.db.add_all([self.user_ramesh, self.user_priya, self.user_suresh])
        self.db.commit()
        self.db.refresh(self.user_ramesh)
        self.db.refresh(self.user_priya)
        self.db.refresh(self.user_suresh)

    def tearDown(self):
        self.db.close()

    def test_sent_transaction(self):
        """Ramesh sends money to Priya -> direction=SENT, counterparty is Priya."""
        now = datetime.utcnow()
        txn = Transaction(
            sender_id=self.user_ramesh.id,
            receiver_id=self.user_priya.id,
            amount=500.0,
            status="SUCCESS",
            reason=None,
            timestamp=now,
        )
        self.db.add(txn)
        self.db.commit()

        response = self.client.get("/users/ramesh@voicepay/transaction-history")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["total"], 1)
        self.assertEqual(len(data["items"]), 1)
        item = data["items"][0]
        self.assertEqual(item["direction"], "SENT")
        self.assertEqual(item["counterparty_name"], "Priya Sharma")
        self.assertEqual(item["counterparty_upi"], "priya@voicepay")
        self.assertEqual(item["amount"], 500.0)
        self.assertEqual(item["status"], "SUCCESS")
        self.assertIsNone(item["reason"])

    def test_received_transaction(self):
        """Priya sends money to Ramesh -> for Ramesh, direction=RECEIVED, counterparty is Priya."""
        now = datetime.utcnow()
        txn = Transaction(
            sender_id=self.user_priya.id,
            receiver_id=self.user_ramesh.id,
            amount=1200.0,
            status="SUCCESS",
            reason=None,
            timestamp=now,
        )
        self.db.add(txn)
        self.db.commit()

        response = self.client.get("/users/ramesh@voicepay/transaction-history")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["total"], 1)
        item = data["items"][0]
        self.assertEqual(item["direction"], "RECEIVED")
        self.assertEqual(item["counterparty_name"], "Priya Sharma")
        self.assertEqual(item["counterparty_upi"], "priya@voicepay")
        self.assertEqual(item["amount"], 1200.0)
        self.assertEqual(item["status"], "SUCCESS")

    def test_failed_transaction_with_reason(self):
        """Failed transaction preserves status=FAILED, reason, and handles missing counterparty safely."""
        now = datetime.utcnow()
        txn_failed = Transaction(
            sender_id=self.user_ramesh.id,
            receiver_id=self.user_suresh.id,
            amount=999999.0,
            status="FAILED",
            reason="Insufficient funds",
            timestamp=now,
        )
        # Transaction where receiver was not resolved (receiver_id = 0)
        txn_unknown_rcv = Transaction(
            sender_id=self.user_ramesh.id,
            receiver_id=0,
            amount=100.0,
            status="FAILED",
            reason="Receiver not found",
            timestamp=now - timedelta(minutes=5),
        )
        self.db.add_all([txn_failed, txn_unknown_rcv])
        self.db.commit()

        response = self.client.get("/users/ramesh@voicepay/transaction-history")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["total"], 2)
        item0 = data["items"][0]
        self.assertEqual(item0["status"], "FAILED")
        self.assertEqual(item0["reason"], "Insufficient funds")
        self.assertEqual(item0["counterparty_name"], "Suresh Patel")
        self.assertEqual(item0["counterparty_upi"], "suresh@voicepay")

        item1 = data["items"][1]
        self.assertEqual(item1["status"], "FAILED")
        self.assertEqual(item1["reason"], "Receiver not found")
        self.assertIsNone(item1["counterparty_name"])
        self.assertIsNone(item1["counterparty_upi"])

    def test_newest_first_ordering(self):
        """Transactions are sorted newest first."""
        base_time = datetime.utcnow()
        t1 = Transaction(
            sender_id=self.user_ramesh.id,
            receiver_id=self.user_priya.id,
            amount=100.0,
            status="SUCCESS",
            timestamp=base_time - timedelta(hours=2),
        )
        t2 = Transaction(
            sender_id=self.user_suresh.id,
            receiver_id=self.user_ramesh.id,
            amount=200.0,
            status="SUCCESS",
            timestamp=base_time - timedelta(hours=1),
        )
        t3 = Transaction(
            sender_id=self.user_ramesh.id,
            receiver_id=self.user_suresh.id,
            amount=300.0,
            status="SUCCESS",
            timestamp=base_time,
        )
        self.db.add_all([t1, t2, t3])
        self.db.commit()

        response = self.client.get("/users/ramesh@voicepay/transaction-history")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        amounts = [item["amount"] for item in data["items"]]
        self.assertEqual(amounts, [300.0, 200.0, 100.0])

    def test_pagination(self):
        """Pagination limit and offset behave correctly."""
        base_time = datetime.utcnow()
        for i in range(10):
            txn = Transaction(
                sender_id=self.user_ramesh.id,
                receiver_id=self.user_priya.id,
                amount=float(i + 1),
                status="SUCCESS",
                timestamp=base_time + timedelta(minutes=i),
            )
            self.db.add(txn)
        self.db.commit()

        # Page 1: limit 4, offset 0
        res1 = self.client.get("/users/ramesh@voicepay/transaction-history?limit=4&offset=0")
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()
        self.assertEqual(data1["total"], 10)
        self.assertEqual(data1["limit"], 4)
        self.assertEqual(data1["offset"], 0)
        self.assertEqual(len(data1["items"]), 4)
        self.assertEqual(data1["items"][0]["amount"], 10.0)
        self.assertEqual(data1["items"][3]["amount"], 7.0)

        # Page 2: limit 4, offset 4
        res2 = self.client.get("/users/ramesh@voicepay/transaction-history?limit=4&offset=4")
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertEqual(len(data2["items"]), 4)
        self.assertEqual(data2["items"][0]["amount"], 6.0)
        self.assertEqual(data2["items"][3]["amount"], 3.0)

        # Page 3: limit 4, offset 8
        res3 = self.client.get("/users/ramesh@voicepay/transaction-history?limit=4&offset=8")
        self.assertEqual(res3.status_code, 200)
        data3 = res3.json()
        self.assertEqual(len(data3["items"]), 2)
        self.assertEqual(data3["items"][0]["amount"], 2.0)
        self.assertEqual(data3["items"][1]["amount"], 1.0)

    def test_unknown_upi_returns_404(self):
        """Non-existent user UPI returns 404 Not Found."""
        response = self.client.get("/users/nonexistent@voicepay/transaction-history")
        self.assertEqual(response.status_code, 404)
        self.assertIn("not found", response.json()["detail"].lower())

    def test_invalid_query_parameters(self):
        """Validation errors for out-of-bounds limit or offset."""
        # limit < 1
        res1 = self.client.get("/users/ramesh@voicepay/transaction-history?limit=0")
        self.assertEqual(res1.status_code, 422)

        # limit > 100
        res2 = self.client.get("/users/ramesh@voicepay/transaction-history?limit=101")
        self.assertEqual(res2.status_code, 422)

        # offset < 0
        res3 = self.client.get("/users/ramesh@voicepay/transaction-history?offset=-1")
        self.assertEqual(res3.status_code, 422)


if __name__ == "__main__":
    unittest.main()
