"""Offline tests for the security-critical Razorpay HMAC checks.

Run with: python -m unittest tests/test_razorpay_gateway.py
"""

import hashlib
import hmac
import unittest

from app.config import Settings
from app.payment_gateway import RazorpayGateway, amount_to_paise


class RazorpayGatewayTests(unittest.TestCase):
    def setUp(self):
        self.gateway = RazorpayGateway(
            Settings(
                razorpay_key_id="rzp_test_key",
                razorpay_key_secret="checkout_secret",
                razorpay_webhook_secret="webhook_secret",
            )
        )

    def test_amount_is_converted_to_integer_paise(self):
        self.assertEqual(amount_to_paise(299), 29900)
        self.assertEqual(amount_to_paise(99.99), 9999)
        with self.assertRaises(ValueError):
            amount_to_paise(float("nan"))

    def test_checkout_signature_uses_server_order_id(self):
        order_id = "order_local_source_of_truth"
        payment_id = "pay_123"
        signature = hmac.new(
            b"checkout_secret",
            f"{order_id}|{payment_id}".encode(),
            hashlib.sha256,
        ).hexdigest()

        self.assertTrue(
            self.gateway.verify_checkout_signature(
                order_id=order_id,
                payment_id=payment_id,
                signature=signature,
            )
        )
        self.assertFalse(
            self.gateway.verify_checkout_signature(
                order_id="order_from_client",
                payment_id=payment_id,
                signature=signature,
            )
        )

    def test_webhook_signature_checks_the_raw_body(self):
        body = b'{"event":"payment.captured"}'
        signature = hmac.new(
            b"webhook_secret", body, hashlib.sha256
        ).hexdigest()

        self.assertTrue(self.gateway.verify_webhook_signature(body, signature))
        self.assertFalse(self.gateway.verify_webhook_signature(b"{}", signature))


if __name__ == "__main__":
    unittest.main()
