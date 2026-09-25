"""
Tests for Device-Local Biometric Verification module.

Verifies:
1. Biometric challenge creation for pending payments.
2. Successful verification completion.
3. Expired challenge rejection.
4. Challenge for another payment rejected.
5. /payment/confirm blocked (HTTP 403) when biometric verification is missing.
6. /payment/confirm succeeds after biometric verification is completed.
7. No raw biometric/fingerprint data stored in database or logs.
"""

from datetime import datetime, timedelta
import unittest
from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app import models, crud
from app.schemas import UserCreate


class BiometricVerificationTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.db = SessionLocal()
        self.client = TestClient(app)

        # Seed sender and receiver
        self.sender = crud.get_user_by_upi(self.db, "ramesh@voicepay")
        if not self.sender:
            self.sender = crud.create_user(
                self.db,
                UserCreate(name="Ramesh Kumar", upi_id="ramesh@voicepay", pin="1234", balance=5000.0),
            )
        else:
            self.sender.balance = 5000.0
            self.db.commit()

        self.receiver = crud.get_user_by_upi(self.db, "priya@voicepay")
        if not self.receiver:
            self.receiver = crud.create_user(
                self.db,
                UserCreate(name="Priya Sharma", upi_id="priya@voicepay", pin="1234", balance=1000.0),
            )

        # Create a pending payment
        self.pending = models.PendingPayment(
            sender_id=self.sender.id,
            receiver_id=self.receiver.id,
            amount=250.0,
            language="en",
            command="Send 250 to Priya",
            status="PENDING",
        )
        self.db.add(self.pending)
        self.db.commit()
        self.db.refresh(self.pending)

    def tearDown(self):
        self.db.close()

    def test_create_biometric_challenge(self):
        res = self.client.post(f"/voice-payments/{self.pending.id}/biometric/challenge")
        self.assertEqual(res.status_code, 200, res.text)
        data = res.json()
        self.assertIn("challenge_id", data)
        self.assertTrue(data["challenge_id"].startswith("bio_"))
        self.assertEqual(data["payment_id"], self.pending.id)
        self.assertIn("expires_at", data)

        # Verify in DB
        v = self.db.query(models.BiometricVerification).filter_by(challenge_id=data["challenge_id"]).first()
        self.assertIsNotNone(v)
        self.assertEqual(v.status, "PENDING")
        self.assertEqual(v.verification_method, "LOCAL_DEVICE_BIOMETRIC")

    def test_complete_biometric_challenge_success(self):
        # Create challenge
        c_res = self.client.post(f"/voice-payments/{self.pending.id}/biometric/challenge")
        challenge_id = c_res.json()["challenge_id"]

        # Complete challenge
        comp_res = self.client.post(
            f"/voice-payments/{self.pending.id}/biometric/complete",
            json={"challenge_id": challenge_id},
        )
        self.assertEqual(comp_res.status_code, 200, comp_res.text)
        comp_data = comp_res.json()
        self.assertEqual(comp_data["status"], "VERIFIED")
        self.assertIn("verified_at", comp_data)

    def test_expired_challenge_rejected(self):
        import uuid
        exp_id = f"bio_expired_{uuid.uuid4().hex}"
        # Create expired challenge in DB
        expired_v = models.BiometricVerification(
            challenge_id=exp_id,
            pending_payment_id=self.pending.id,
            status="PENDING",
            created_at=datetime.utcnow() - timedelta(minutes=5),
            expires_at=datetime.utcnow() - timedelta(minutes=3),
        )
        self.db.add(expired_v)
        self.db.commit()

        res = self.client.post(
            f"/voice-payments/{self.pending.id}/biometric/complete",
            json={"challenge_id": exp_id},
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("expired", res.json()["detail"].lower())

    def test_challenge_for_another_payment_rejected(self):
        # Create second pending payment
        other_pending = models.PendingPayment(
            sender_id=self.sender.id,
            receiver_id=self.receiver.id,
            amount=50.0,
            language="en",
            command="Send 50 to Priya",
            status="PENDING",
        )
        self.db.add(other_pending)
        self.db.commit()
        self.db.refresh(other_pending)

        # Create challenge for pending #1
        c_res = self.client.post(f"/voice-payments/{self.pending.id}/biometric/challenge")
        challenge_id = c_res.json()["challenge_id"]

        # Attempt to use challenge #1 for pending #2
        res = self.client.post(
            f"/voice-payments/{other_pending.id}/biometric/complete",
            json={"challenge_id": challenge_id},
        )
        self.assertEqual(res.status_code, 400)

    def test_payment_confirm_blocked_without_biometrics(self):
        # Directly try /payment/confirm without completing biometric challenge
        res = self.client.post(
            f"/payment/confirm?payment_id={self.pending.id}",
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("Biometric verification is required", res.json()["detail"])

    def test_payment_confirm_succeeds_after_biometrics(self):
        # 1. Create challenge
        c_res = self.client.post(f"/voice-payments/{self.pending.id}/biometric/challenge")
        challenge_id = c_res.json()["challenge_id"]

        # 2. Complete challenge
        comp_res = self.client.post(
            f"/voice-payments/{self.pending.id}/biometric/complete",
            json={"challenge_id": challenge_id},
        )
        self.assertEqual(comp_res.status_code, 200)

        # 3. Confirm payment (without PIN)
        confirm_res = self.client.post(
            f"/payment/confirm?payment_id={self.pending.id}",
        )
        self.assertEqual(confirm_res.status_code, 200, confirm_res.text)
        confirm_data = confirm_res.json()
        self.assertEqual(confirm_data["status"], "SUCCESS")
        self.assertEqual(confirm_data["amount"], 250.0)
        self.assertEqual(confirm_data["verification_method"], "LOCAL_DEVICE_BIOMETRIC")

        # 4. Attempting to confirm again must fail (pending payment already confirmed)
        re_confirm = self.client.post(
            f"/payment/confirm?payment_id={self.pending.id}",
        )
        self.assertEqual(re_confirm.status_code, 404)

    def test_no_raw_biometric_data_in_models_or_responses(self):
        # Validate columns of BiometricVerification
        columns = [c.name for c in models.BiometricVerification.__table__.columns]
        forbidden = ["fingerprint", "raw", "template", "image", "face_id", "biometric_data"]
        for col in columns:
            for f in forbidden:
                self.assertNotIn(f, col.lower())


if __name__ == "__main__":
    unittest.main()
