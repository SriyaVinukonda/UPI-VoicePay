# UPI VoicePay — Sarvam speech, FastAPI backend, and Razorpay Checkout

This project has two deliberately separate payment paths:

- A **local UPI-style SQLite ledger** for the academic demo. It atomically
  debits one demo account, credits another, and logs each attempt.
- **Razorpay Standard Checkout** for a real, test-ready merchant collection
  flow. The server creates orders, verifies Checkout signatures, and validates
  signed payment webhooks.

Razorpay Checkout collects into the configured merchant account. It does not
replace NPCI or a bank-partner integration for peer-to-peer UPI transfers.

Use this as the backend your Android app / Kotlin voice pipeline calls. You
can exercise the demo-ledger routes through Swagger or the demo script, and
use Razorpay Test Mode when you want to demonstrate a real Checkout flow.

## What "the database works properly" means here

Every payment goes through one function, `execute_transfer()` in
`app/crud.py`, which:
1. Checks the sender exists and the receiver exists
2. If `verification_method` is `LOCAL_DEVICE_BIOMETRIC`, confirms that a
   `VERIFIED` biometric challenge exists for this pending payment (no PIN
   required)
3. Checks the sender has enough balance
4. Debits the sender and credits the receiver **in the same DB transaction**
5. Writes a `Transaction` row (SUCCESS or FAILED, with a reason)
6. Commits everything together — if any step fails, it rolls back, so
   balances can never get out of sync with the transaction log

## Project structure

```
upi_voicepay_backend/
├── app/
│   ├── __init__.py
│   ├── database.py      # SQLite engine/session setup
│   ├── models.py        # Demo-ledger and gateway-order tables
│   ├── schemas.py        # Pydantic request/response models
│   ├── crud.py           # Transfer logic + voice command parser
│   ├── payment_gateway.py # Razorpay order and HMAC adapter
│   ├── gateway_routes.py  # Razorpay Checkout routes
│   ├── speech.py          # Sarvam Saaras STT + Bulbul TTS client
│   └── main.py            # FastAPI application
├── .env.example           # Test Mode configuration template
├── seed.py                # Adds dummy users with starting balances
├── demo_transactions.py   # Runs sample transactions, no server needed
├── requirements.txt
└── README.md
```

## 1. Setup

Requires Python 3.10+.

```bash
cd upi_voicepay_backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env`, then add your Sarvam API key:

```env
SARVAM_API_KEY=your_sarvam_api_key
```

The key is read only by the FastAPI server. Do not put it in Postman,
Android code, screenshots, or Git.

## 2. Add dummy data (users + starting balances)

```bash
python seed.py
```

This creates `voicepay.db` (SQLite file, auto-generated — nothing to
install) and adds 4 dummy accounts:

| Name   | UPI ID           | PIN  | Starting balance |
|--------|-------------------|------|-------------------|
| Ramesh | ramesh@voicepay   | 1234 | ₹10000            |
| Suresh | suresh@voicepay   | 1111 | ₹2000             |
| Priya  | priya@voicepay    | 2222 | ₹7500             |
| Anjali | anjali@voicepay   | 3333 | ₹1000             |

Run it again any time to reset/add more — it skips users that already exist.
To fully reset, just delete `voicepay.db` and re-run `seed.py`.

## 3. Option A — See it work without a server

```bash
python demo_transactions.py
```

This prints balances before and after, runs one successful voice-command
payment and one payment that's supposed to fail (insufficient funds), and
prints the full transaction log — proof the DB updates correctly.

## 3. Option B — Run the actual API server

```bash
uvicorn app.main:app --reload
```

Then open **http://127.0.0.1:8000/docs** — FastAPI's interactive Swagger
UI, where you can call every endpoint by clicking buttons (great for a
project demo/viva).

### Endpoints

| Method | Path                          | Purpose                                   |
|--------|-------------------------------|--------------------------------------------|
| GET    | `/users`                      | List all dummy accounts                    |
| GET    | `/users/{upi_id}/balance`     | Check one account's balance                |
| POST   | `/users`                      | Add a new dummy account                    |
| POST   | `/pay`                        | Direct transfer (sender_upi, receiver_upi, amount, pin) |
| POST   | `/voice-command`              | Simulated voice pipeline (sender_upi, command text, pin) |
| POST   | `/transcribe`                 | Sarvam Saaras audio-to-text |
| POST   | `/voice-payment/preview`      | Speech-to-payment proposal; does not transfer money |
| POST   | `/text-to-speech`             | Sarvam Bulbul text-to-WAV response |
| POST   | `/voice-payment/{id}/confirmation-audio` | Spoken confirmation for a pending payment |
| POST   | `/voice-payments/{id}/razorpay/order` | Create a server-side Razorpay Checkout order from a voice preview |
| POST   | `/payments/razorpay/verify` | Verify the Checkout signature sent by the mobile client |
| POST   | `/payments/razorpay/webhook` | Validate Razorpay's signed `payment.captured` or `payment.failed` webhooks |
| GET    | `/payments/razorpay/{id}` | Read the local status of a Razorpay order |
| GET    | `/transactions`                | Full transaction log (optionally `?upi_id=`) |
| GET    | `/users/{upi_id}/transaction-history` | Paginated transaction history with SENT/RECEIVED direction and counterparty details (`?limit=20&offset=0`) |

### Example: get user transaction history

Fetch paginated transaction history for a user (newest first):

```bash
# First page (default limit 20, offset 0)
curl http://127.0.0.1:8000/users/ramesh@voicepay/transaction-history

# Custom pagination
curl "http://127.0.0.1:8000/users/ramesh@voicepay/transaction-history?limit=5&offset=0"
```

Example JSON response:
```json
{
  "items": [
    {
      "id": 1,
      "direction": "SENT",
      "counterparty_name": "Priya Sharma",
      "counterparty_upi": "priya@voicepay",
      "amount": 1000.0,
      "status": "SUCCESS",
      "reason": null,
      "timestamp": "2026-09-15T10:30:00"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```


### Example: simulate a voice payment

```bash
curl -X POST http://127.0.0.1:8000/voice-command \
  -H "Content-Type: application/json" \
  -d '{
    "sender_upi": "ramesh@voicepay",
    "command": "Send 500 rupees to Suresh",
    "pin": "1234"
  }'
```

Then check both balances updated:

```bash
curl http://127.0.0.1:8000/users/ramesh@voicepay/balance
curl http://127.0.0.1:8000/users/suresh@voicepay/balance
```

Ramesh should have gone from ₹5000 → ₹4500, Suresh from ₹2000 → ₹2500.

### Example: a payment that should fail

```bash
curl -X POST http://127.0.0.1:8000/pay \
  -H "Content-Type: application/json" \
  -d '{
    "sender_upi": "anjali@voicepay",
    "receiver_upi": "priya@voicepay",
    "amount": 5000,
    "pin": "3333"
  }'
```

Anjali only has ₹1000, so this returns a 402 error and gets logged in
`/transactions` as `FAILED` with reason `Insufficient funds` — nobody's
balance changes.

## 4. Razorpay Checkout in Test Mode

The checkout integration uses Razorpay because it supports Indian payment
methods, including UPI, through its hosted Standard Checkout. It keeps the
secret key on the server and sends only the public key ID and order ID to the
mobile client.

1. Install dependencies with `pip install -r requirements.txt`.
2. Copy `.env.example` to `.env` and put in **Test Mode** keys from the
   Razorpay Dashboard. Do not commit `.env` or use live keys for a college
   demo.
3. Record a command and call `/voice-payment/preview` to create a server-side
   `payment_id`.
4. Call `POST /voice-payments/{payment_id}/razorpay/order`. The response
   contains `key_id`, `razorpay_order_id`, `amount_paise`, `currency`, and
   checkout display text. Pass those values to the Razorpay Android Checkout
   SDK. Do not let the app select its own amount or order ID.
5. After a successful Checkout callback, send its `razorpay_payment_id`,
   `razorpay_order_id`, and `razorpay_signature` to
   `POST /payments/razorpay/verify`. The API uses the server-stored order ID
   and key secret to validate the HMAC before marking the payment
   `AUTHORIZED`.
6. Configure `POST /payments/razorpay/webhook` in the Razorpay Test Mode
   dashboard and set the same webhook secret in `.env`. The endpoint verifies
   the raw body with `X-Razorpay-Signature`, then marks the local order
   `CAPTURED` only on `payment.captured`.

The verification endpoint is intentionally not the final fulfilment signal.
Use the webhook or the status endpoint to wait for `CAPTURED`, since a valid
Checkout response can still be awaiting capture.

Razorpay documents the required server-created order, server-side Checkout
signature verification, and raw-body webhook validation here:

- https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
- https://razorpay.com/docs/webhooks/validate-test/

## 5. Sarvam speech flow

`/voice-command` accepts plain text for quick tests and parses sentences like:
- `"Send 500 to Ramesh"`
- `"Send ₹500 to Ramesh"`
- `"Send 500 rupees to Ramesh"`

For real voice input, send a short audio file to `/transcribe` or
`/voice-payment/preview`. The backend sends it to Sarvam Saaras with language
auto-detection, normalizes the transcript, extracts the amount and receiver,
and creates a pending payment. Call
`/voice-payment/{payment_id}/confirmation-audio` to obtain Sarvam Bulbul's
base64-encoded WAV confirmation before requesting the user's PIN.

Sarvam's REST STT endpoint is intended for quick clips (under 30 seconds).
Audio is sent to Sarvam's cloud API, so do not describe this version as
on-device or fully offline speech recognition.

## 6. Connecting this to your Android/Kotlin app later

This backend is designed so your Kotlin app only needs to speak HTTP:
- Run `uvicorn` on a machine reachable from your phone/emulator
  (for an emulator, `10.0.2.2` maps to your host machine's `127.0.0.1`)
- Your app uploads a short recording to `/voice-payment/preview`; the server
  calls Sarvam STT and returns a pending payment plus confirmation text
- Your app calls `/voice-payment/{payment_id}/confirmation-audio`, decodes the
  returned base64 WAV, and plays the spoken confirmation to the user
- Your app requests a biometric challenge via
  `POST /voice-payments/{payment_id}/biometric/challenge` and completes it
  via `POST /voice-payments/{payment_id}/biometric/complete` after the device
  local fingerprint / Face ID check passes
- Your app then calls `POST /payment/confirm` — no PIN field is required;
  the server checks the `VERIFIED` biometric challenge and executes the transfer
- The app uses the public Razorpay key ID and order ID returned by this API,
  then posts the Checkout callback payload to `/payments/razorpay/verify`

## 7. Included Expo mobile app

The `mobile/` folder is an Expo React Native client included in this package.
It sends recorded audio to the Sarvam-backed endpoints and plays the
server-generated Sarvam confirmation WAV. Copy `mobile/.env.example` to
`mobile/.env`; use `http://10.0.2.2:8000` for an Android emulator, or your
computer's LAN IP for a physical phone. Do not put `SARVAM_API_KEY` in the
mobile app.

The Expo app supports **Telugu**, **Hindi**, and **English** voice commands.
Sarvam auto-detects the language from the recorded audio. The spoken
confirmation and on-screen labels are returned in the same language.

The mobile app no longer has a manual PIN keypad. Authorization relies
exclusively on voice confirmation followed by device-local biometric
verification (see Sections 8 and 9).

## 8. Device-Local Biometric Verification

VoicePay uses device-local biometric verification (fingerprint / Face ID) as
the sole transaction-authorization factor after voice confirmation. No UPI PIN
is typed or transmitted.

### Security Architecture & Privacy Rule

- **Zero Raw Biometric Exposure**: Raw biometric templates, fingerprint images,
  Face ID scans, or biometric hashes are **never** captured, uploaded, logged,
  transmitted, or stored — on the device, in transit, or on the backend.
- **Device-Local Attestation**: The mobile client uses `expo-local-authentication`
  to invoke the device's secure hardware enclave / Trusted Execution
  Environment. Only a pass/fail result leaves the device.
- **Challenge-Response Workflow**:
  1. The client requests a cryptographically random, short-lived (2-minute
     expiry) challenge from
     `POST /voice-payments/{payment_id}/biometric/challenge`.
  2. The mobile OS prompts for fingerprint / Face ID **locally on device**.
  3. Upon local biometric success, the client posts
     `POST /voice-payments/{payment_id}/biometric/complete`.
  4. The backend marks the challenge `VERIFIED` and stores only the timestamp
     and status — no biometric data.
  5. `POST /payment/confirm` checks for an active `VERIFIED` challenge before
     executing the transfer. If missing, expired, or unverified, it returns
     `HTTP 403 Forbidden`.

### Biometric database schema (what IS stored)

| Column | Value stored |
|---|---|
| `id` | UUID |
| `pending_payment_id` | FK to pending payment |
| `status` | PENDING → VERIFIED / EXPIRED / FAILED |
| `created_at` | timestamp |
| `expires_at` | `created_at + 2 minutes` |
| `verified_at` | timestamp (only when VERIFIED) |
| `verification_method` | `LOCAL_DEVICE_BIOMETRIC` (constant string) |

No fingerprint image, template, biometric ID, or hash is ever stored.

### Physical-Device Testing

1. Install dependencies:
   ```bash
   cd mobile
   npx expo install expo-local-authentication
   ```
2. Enroll at least one fingerprint / Face ID in the device settings.
3. Start the Expo dev server:
   ```bash
   npx expo start
   ```
4. Open the app on a physical device via Expo Go or a development build.
5. Speak a payment command, e.g. "Send ₹100 to Priya".
6. Listen to the spoken confirmation. Say **"yes"** or **"confirm"**.
7. The Biometric Verification modal appears showing the recipient and amount.
8. To test cancellation: tap Cancel — the transaction stays unconfirmed with
   Retry / Cancel options.
9. Touch the fingerprint sensor / use Face ID: the prompt passes, the backend
   challenge is marked `VERIFIED`, the transfer executes, and the history
   screen shows `🔒 Biometric verified`.

### Academic / Demo Simulation Notice

> **This is a demonstration simulation, not real bank-grade UPI authentication.**
>
> - Real UPI authentication is regulated by NPCI and requires bank-partner
>   integration, FIDO2/WebAuthn attestation, and hardware security modules.
> - This demo replaces a traditional UPI PIN with a device-local biometric
>   pass/fail result to illustrate the concept for academic purposes.
> - The backend stores only a status flag (`VERIFIED`) — never biometric data.
> - Clearly label this distinction in your project report and viva presentation.

## 9. Accessibility — Blind-User Payment Flow

VoicePay is designed so a visually impaired user can complete a full payment
without looking at the screen.

| Step | What happens |
|------|-------------|
| 1. Voice command | User speaks "Send ₹100 to Priya" in Telugu, Hindi, or English |
| 2. Spoken confirmation | App reads back "Sending ₹100 to Priya. Say yes to confirm." via Sarvam TTS |
| 3. Voice confirmation | User says "yes" / "confirm" / "ha" (Hindi) / "avunu" (Telugu) |
| 4. Biometric prompt | Device-native fingerprint / Face ID prompt appears |
| 5. Biometric pass | Device authenticates locally; no data leaves the device |
| 6. Transfer | Backend verifies challenge, debits sender, credits receiver |
| 7. Spoken result | App reads "Payment of ₹100 to Priya successful" via TTS |

### Accessibility implementation details

- All interactive elements have `accessibilityRole` and `accessibilityLabel`
  set for screen-reader (TalkBack / VoiceOver) compatibility.
- There is no manual PIN keypad in the voice payment flow. PIN entry was
  removed to eliminate a screen-dependent step.
- The OTP demo banner is for visual demo purposes only and does not affect
  the payment authorization path.
- The biometric modal announces the pending recipient and amount before
  prompting for the fingerprint.

## Notes for your project report

- This is a **simulation**, not a real UPI integration — that's normal
  and expected for a student major project. NPCI doesn't grant sandbox
  access to individual students, so this pattern (a self-hosted ledger
  standing in for a bank) is the standard approach for these projects.
- The biometric authorization here replaces a demo PIN with a device-local
  pass/fail result. In production you would integrate FIDO2/WebAuthn
  attestation and bank-partner HSM verification instead.
- No raw biometric data, fingerprint image, or biometric template is stored
  anywhere in this project, consistent with your project's privacy goals.
- No sensitive real banking data is stored anywhere.

