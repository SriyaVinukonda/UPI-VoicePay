from datetime import datetime
from pydantic import BaseModel, Field


class UserOut(BaseModel):
    id: int
    name: str
    upi_id: str
    balance: float

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    name: str
    upi_id: str
    pin: str = Field("1234", min_length=4, max_length=6)
    balance: float = 0.0


class PaymentRequest(BaseModel):
    sender_upi: str = Field(..., example="ramesh@voicepay")
    receiver_upi: str = Field(..., example="suresh@voicepay")
    amount: float = Field(..., gt=0, example=500)
    pin: str = Field(..., example="1234")


class VoiceCommandRequest(BaseModel):
    sender_upi: str = Field(..., example="ramesh@voicepay")
    command: str = Field(..., example="Send 500 rupees to Suresh")
    pin: str = Field(..., example="1234")


class TransactionOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    amount: float
    status: str
    reason: str | None
    raw_command: str | None
    verification_method: str | None = None
    timestamp: datetime

    class Config:
        from_attributes = True


class TransactionHistoryItem(BaseModel):
    id: int
    direction: str  # "SENT" | "RECEIVED"
    counterparty_name: str | None = None
    counterparty_upi: str | None = None
    amount: float
    status: str  # "SUCCESS" | "FAILED"
    reason: str | None = None
    verification_method: str | None = None
    timestamp: datetime

    class Config:
        from_attributes = True


class BiometricChallengeResponse(BaseModel):
    challenge_id: str
    expires_at: datetime
    payment_id: int


class BiometricCompleteRequest(BaseModel):
    challenge_id: str


class BiometricCompleteResponse(BaseModel):
    challenge_id: str
    verified_at: datetime
    status: str


class TransactionHistoryResponse(BaseModel):
    items: list[TransactionHistoryItem]
    total: int
    limit: int
    offset: int


class VoicePaymentPreview(BaseModel):
    payment_id: int
    amount: float
    receiver_name: str
    receiver_upi: str
    language: str
    command: str
    confirmation_text: str


class TextToSpeechRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2500)
    language_code: str = Field("en-IN", example="te-IN")
    speaker: str | None = Field(None, example="shubh")
    pace: float = Field(1.0, ge=0.5, le=2.0)


class TextToSpeechOut(BaseModel):
    audio_base64: str
    audio_codec: str
    sample_rate: int
    request_id: str | None


class VoiceConfirmationAudioOut(TextToSpeechOut):
    payment_id: int
    text: str
    language_code: str

class VoicePaymentConfirm(BaseModel):
    sender_upi: str = Field(..., example="ramesh@voicepay")
    receiver_upi: str = Field(..., example="suresh@voicepay")
    amount: float = Field(..., gt=0, example=500)
    pin: str = Field(..., min_length=4, max_length=6, example="1234")
    command: str | None = None


class RazorpayCheckoutOrderOut(BaseModel):
    gateway_order_id: int
    payment_id: int
    key_id: str
    razorpay_order_id: str
    amount_paise: int
    currency: str
    name: str
    description: str


class RazorpayVerificationRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class GatewayPaymentStatusOut(BaseModel):
    gateway_order_id: int
    payment_id: int
    gateway: str
    razorpay_order_id: str
    razorpay_payment_id: str | None
    amount_paise: int
    currency: str
    status: str
