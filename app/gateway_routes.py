"""Razorpay checkout routes for a voice-payment intent.

Razorpay Standard Checkout collects money for the configured merchant account.
It does not itself provide an NPCI peer-to-peer transfer rail, so the existing
SQLite transfer endpoints remain clearly labelled as the project's demo ledger.
"""

import json

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from . import models, schemas
from .config import get_settings
from .database import get_db
from .payment_gateway import GatewayError, RazorpayGateway, amount_to_paise


router = APIRouter(tags=["Razorpay checkout"])


def _status_response(order: models.GatewayOrder) -> dict:
    return {
        "gateway_order_id": order.id,
        "payment_id": order.pending_payment_id,
        "gateway": order.provider,
        "razorpay_order_id": order.provider_order_id,
        "razorpay_payment_id": order.provider_payment_id,
        "amount_paise": order.amount_paise,
        "currency": order.currency,
        "status": order.status,
    }


@router.post(
    "/voice-payments/{payment_id}/razorpay/order",
    response_model=schemas.RazorpayCheckoutOrderOut,
)
def create_razorpay_order(payment_id: int, db: Session = Depends(get_db)):
    """Create one server-side checkout order for a stored voice preview.

    The client cannot provide its own amount or recipient. This prevents a
    change to the spoken transaction details between preview and checkout.
    """

    pending = (
        db.query(models.PendingPayment)
        .filter(models.PendingPayment.id == payment_id)
        .first()
    )
    if not pending:
        raise HTTPException(status_code=404, detail="Pending payment not found")

    order = (
        db.query(models.GatewayOrder)
        .filter(models.GatewayOrder.pending_payment_id == pending.id)
        .first()
    )
    settings = get_settings()
    if order:
        if order.status == "CAPTURED":
            raise HTTPException(status_code=409, detail="Payment has already been captured")
        if not settings.razorpay_key_id:
            raise HTTPException(status_code=503, detail="Razorpay is not configured")
        return {
            "gateway_order_id": order.id,
            "payment_id": pending.id,
            "key_id": settings.razorpay_key_id,
            "razorpay_order_id": order.provider_order_id,
            "amount_paise": order.amount_paise,
            "currency": order.currency,
            "name": settings.checkout_name,
            "description": f"Voice payment {pending.id}",
        }

    if pending.status != "PENDING":
        raise HTTPException(
            status_code=409,
            detail="This voice-payment request cannot start a new checkout",
        )

    try:
        amount_paise = amount_to_paise(pending.amount)
        gateway = RazorpayGateway(settings)
        receipt = f"voicepay_{pending.id}"
        provider_order = gateway.create_order(
            amount_paise=amount_paise,
            receipt=receipt,
            notes={
                "voicepay_payment_id": str(pending.id),
                "receiver_id": str(pending.receiver_id),
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except GatewayError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    provider_order_id = provider_order.get("id")
    if not provider_order_id:
        raise HTTPException(
            status_code=502,
            detail="Razorpay returned an order without an ID",
        )

    order = models.GatewayOrder(
        pending_payment_id=pending.id,
        provider="razorpay",
        provider_order_id=provider_order_id,
        amount_paise=amount_paise,
        currency=settings.razorpay_currency,
        receipt=receipt,
        status="CREATED",
    )
    pending.status = "GATEWAY_ORDER_CREATED"
    db.add(order)
    db.commit()
    db.refresh(order)

    return {
        "gateway_order_id": order.id,
        "payment_id": pending.id,
        "key_id": settings.razorpay_key_id,
        "razorpay_order_id": order.provider_order_id,
        "amount_paise": order.amount_paise,
        "currency": order.currency,
        "name": settings.checkout_name,
        "description": f"Voice payment {pending.id}",
    }


@router.post(
    "/payments/razorpay/verify",
    response_model=schemas.GatewayPaymentStatusOut,
)
def verify_razorpay_checkout(
    response: schemas.RazorpayVerificationRequest,
    db: Session = Depends(get_db),
):
    """Validate the client Checkout result with the server-held key secret."""

    order = (
        db.query(models.GatewayOrder)
        .filter(
            models.GatewayOrder.provider == "razorpay",
            models.GatewayOrder.provider_order_id == response.razorpay_order_id,
        )
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Razorpay order not found")

    if order.status == "CAPTURED":
        return _status_response(order)

    if order.provider_payment_id and order.provider_payment_id != response.razorpay_payment_id:
        raise HTTPException(
            status_code=409,
            detail="A different payment has already been authorized for this order",
        )

    try:
        gateway = RazorpayGateway(get_settings())
        verified = gateway.verify_checkout_signature(
            order_id=order.provider_order_id,
            payment_id=response.razorpay_payment_id,
            signature=response.razorpay_signature,
        )
    except GatewayError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    if not verified:
        raise HTTPException(status_code=400, detail="Invalid Razorpay payment signature")

    order.provider_payment_id = response.razorpay_payment_id
    order.status = "AUTHORIZED"
    pending = db.get(models.PendingPayment, order.pending_payment_id)
    if pending:
        pending.status = "GATEWAY_AUTHORIZED"
    db.commit()
    db.refresh(order)
    return _status_response(order)


@router.post("/payments/razorpay/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle retry-safe, raw-body-signed Razorpay payment status events."""

    raw_body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature")
    if not signature:
        raise HTTPException(status_code=400, detail="Missing Razorpay signature")

    try:
        gateway = RazorpayGateway(get_settings())
        if not gateway.verify_webhook_signature(raw_body, signature):
            raise HTTPException(status_code=400, detail="Invalid Razorpay webhook signature")
        payload = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid webhook JSON") from exc
    except GatewayError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    event = payload.get("event")
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    provider_order_id = entity.get("order_id")
    provider_payment_id = entity.get("id")
    if not provider_order_id:
        return {"status": "ignored", "reason": "Webhook has no order ID"}

    order = (
        db.query(models.GatewayOrder)
        .filter(
            models.GatewayOrder.provider == "razorpay",
            models.GatewayOrder.provider_order_id == provider_order_id,
        )
        .first()
    )
    if not order:
        return {"status": "ignored", "reason": "Order does not belong to VoicePay"}

    pending = db.get(models.PendingPayment, order.pending_payment_id)
    if event == "payment.captured" and order.status != "CAPTURED":
        order.provider_payment_id = provider_payment_id or order.provider_payment_id
        order.status = "CAPTURED"
        if pending:
            pending.status = "GATEWAY_CAPTURED"
        db.commit()
    elif event == "payment.failed" and order.status != "CAPTURED":
        order.provider_payment_id = provider_payment_id or order.provider_payment_id
        order.status = "FAILED"
        if pending:
            pending.status = "GATEWAY_FAILED"
        db.commit()

    return {"status": "received", "event": event}


@router.get(
    "/payments/razorpay/{gateway_order_id}",
    response_model=schemas.GatewayPaymentStatusOut,
)
def get_razorpay_payment_status(
    gateway_order_id: int,
    db: Session = Depends(get_db),
):
    order = db.get(models.GatewayOrder, gateway_order_id)
    if not order or order.provider != "razorpay":
        raise HTTPException(status_code=404, detail="Razorpay order not found")
    return _status_response(order)
