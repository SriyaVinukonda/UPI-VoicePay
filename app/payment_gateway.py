"""Small, testable adapter around Razorpay's server-side APIs."""

from __future__ import annotations

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import hashlib
import hmac
from typing import Any

from .config import Settings


class GatewayError(RuntimeError):
    """Payment-gateway failure that is safe to return as an API error."""


class GatewayNotConfiguredError(GatewayError):
    pass


class GatewaySdkUnavailableError(GatewayError):
    pass


class GatewayProviderError(GatewayError):
    pass


def amount_to_paise(amount: float) -> int:
    """Convert a rupee amount to Razorpay's integer currency subunits."""

    try:
        rupees = Decimal(str(amount))
        if not rupees.is_finite():
            raise ValueError("Payment amount must be finite")
        paise = (rupees * Decimal("100")).quantize(
            Decimal("1"), rounding=ROUND_HALF_UP
        )
    except (InvalidOperation, ValueError) as exc:
        raise ValueError("Payment amount must be a valid positive number") from exc

    if paise <= 0:
        raise ValueError("Payment amount must be greater than zero")
    return int(paise)


class RazorpayGateway:
    """Razorpay Standard Checkout server integration."""

    provider_name = "razorpay"

    def __init__(self, settings: Settings):
        if not settings.razorpay_is_configured:
            raise GatewayNotConfiguredError(
                "Razorpay is not configured. Set RAZORPAY_KEY_ID and "
                "RAZORPAY_KEY_SECRET before creating a checkout order."
            )
        self.settings = settings

    def create_order(
        self,
        *,
        amount_paise: int,
        receipt: str,
        notes: dict[str, str],
    ) -> dict[str, Any]:
        """Create one Razorpay order for one server-side payment intent."""

        try:
            import razorpay
        except ImportError as exc:
            raise GatewaySdkUnavailableError(
                "Razorpay SDK is unavailable. Install project requirements."
            ) from exc

        try:
            client = razorpay.Client(
                auth=(
                    self.settings.razorpay_key_id,
                    self.settings.razorpay_key_secret,
                )
            )
            return client.order.create(
                data={
                    "amount": amount_paise,
                    "currency": self.settings.razorpay_currency,
                    "receipt": receipt,
                    "notes": notes,
                }
            )
        except Exception as exc:
            raise GatewayProviderError(
                "Razorpay could not create the payment order. Try again shortly."
            ) from exc

    def verify_checkout_signature(
        self,
        *,
        order_id: str,
        payment_id: str,
        signature: str,
    ) -> bool:
        """Verify Checkout's success payload using the server-held secret."""

        message = f"{order_id}|{payment_id}".encode("utf-8")
        expected = hmac.new(
            self.settings.razorpay_key_secret.encode("utf-8"),
            message,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    def verify_webhook_signature(self, raw_body: bytes, signature: str) -> bool:
        """Verify Razorpay's raw webhook-body HMAC without parsing it first."""

        secret = self.settings.razorpay_webhook_secret
        if not secret:
            raise GatewayNotConfiguredError(
                "Razorpay webhook validation is not configured. Set "
                "RAZORPAY_WEBHOOK_SECRET."
            )
        expected = hmac.new(
            secret.encode("utf-8"), raw_body, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)
