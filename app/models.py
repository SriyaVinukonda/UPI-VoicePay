"""
ORM models.

User        -> simulates a bank/UPI-linked account (this stands in for
               the "own UPI" system — no real NPCI integration needed
               for the demo).
Transaction -> an immutable log row created for every payment attempt,
               successful or failed. This is what makes the DB
               "work properly": balances only ever change inside a
               single atomic DB transaction together with the log row.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    upi_id = Column(String, unique=True, index=True, nullable=False)
    pin = Column(
    String,
    nullable=False,
    default="",
)  # Argon2 password hash of the user's UPI PIN.
    balance = Column(Float, nullable=False, default=0.0)

    sent = relationship(
        "Transaction",
        foreign_keys="Transaction.sender_id",
        back_populates="sender",
    )
    received = relationship(
        "Transaction",
        foreign_keys="Transaction.receiver_id",
        back_populates="receiver",
    )


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, nullable=False)  # SUCCESS | FAILED
    reason = Column(String, nullable=True)   # failure reason, if any
    raw_command = Column(String, nullable=True)  # original voice command text
    verification_method = Column(String, nullable=True, default="LOCAL_DEVICE_BIOMETRIC")
    timestamp = Column(DateTime, default=datetime.utcnow)

    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent")
    receiver = relationship(
        "User", foreign_keys=[receiver_id], back_populates="received"
    )


class PendingPayment(Base):
    __tablename__ = "pending_payments"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    language = Column(String, nullable=False)
    command = Column(String, nullable=False)
    status = Column(String, nullable=False, default="PENDING")
    created_at = Column(DateTime, default=datetime.utcnow)


class BiometricVerification(Base):
    """
    Stores short-lived biometric challenges for pending voice payments.
    Never stores fingerprint/face image, template, biometric ID, or raw biometric data.
    """
    __tablename__ = "biometric_verifications"

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(String, unique=True, index=True, nullable=False)
    pending_payment_id = Column(
        Integer,
        ForeignKey("pending_payments.id"),
        nullable=False,
        index=True,
    )
    status = Column(String, nullable=False, default="PENDING")  # PENDING, VERIFIED, EXPIRED, FAILED, CONSUMED
    verification_method = Column(String, nullable=False, default="LOCAL_DEVICE_BIOMETRIC")
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    verified_at = Column(DateTime, nullable=True)

    pending_payment = relationship("PendingPayment", backref="biometric_verifications")


class GatewayOrder(Base):
    """Maps one VoicePay intent to one Razorpay Checkout order."""

    __tablename__ = "gateway_orders"

    id = Column(Integer, primary_key=True, index=True)
    pending_payment_id = Column(
        Integer,
        ForeignKey("pending_payments.id"),
        nullable=False,
        unique=True,
        index=True,
    )
    provider = Column(String, nullable=False, default="razorpay")
    provider_order_id = Column(String, nullable=False, unique=True, index=True)
    provider_payment_id = Column(String, nullable=True, unique=True, index=True)
    amount_paise = Column(Integer, nullable=False)
    currency = Column(String, nullable=False, default="INR")
    receipt = Column(String, nullable=False, unique=True)
    status = Column(String, nullable=False, default="CREATED")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
