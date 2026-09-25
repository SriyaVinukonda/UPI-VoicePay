# 🎙️ VoicePay — Multilingual Voice-Enabled UPI-Style Payments

> **Speak. Verify. Pay.**

VoicePay is a multilingual, voice-powered UPI-style payment application that allows users to initiate simulated payments using natural voice commands in **English, Hindi, and Telugu**.

The project combines **AI-powered speech processing, multilingual voice interaction, mobile application development, payment simulation, biometric authentication, OTP verification, QR payments, phone-number payments, and transaction management** into a single mobile-first application.

---

## 📱 Project Overview

Traditional digital payment applications require users to navigate through multiple screens, search for contacts, enter amounts, and manually confirm transactions.

VoicePay explores a **voice-first payment experience** where users can simply speak a command such as:

> 🎙️ **"Send ₹500 to Suresh"**

The application processes the voice command, identifies the payment details, presents a payment preview, asks for confirmation, performs biometric verification, and completes the simulated transaction.

## 🌐 Multilingual Voice Interaction
VoicePay supports three languages:
Language	Code
English	en
Hindi	hi
Telugu	te


The selected language controls the voice interaction, speech processing, confirmation prompts, and voice feedback throughout the payment session.

## 🔐 Biometric Payment Verification
Before a simulated payment is completed, VoicePay requires biometric verification.
The payment flow follows:
Voice Command
      ↓
Payment Preview
      ↓
User Confirmation
      ↓
Biometric Verification
      ↓
Payment Confirmation
      ↓
Transaction Result

The application uses device biometric authentication where supported.

## 🔢 OTP Verification
VoicePay includes an OTP-based confirmation experience as part of the simulated payment workflow.
A verification code is displayed through an in-app OTP banner and is used during the payment confirmation process.
The interface is designed to clearly communicate the verification state while keeping the payment flow simple.

## 📷 QR Payments
VoicePay supports QR-based payment initiation.
Users can scan a supported QR code and proceed through the payment preview and verification flow.

## 📲 Phone Number Payments
Payments can also be initiated using a recipient's phone number.
Example:
Send ₹500 to 9876543210

## 💰 Balance Management
The application provides a dedicated balance screen where users can view their simulated account balance.
The balance is maintained by the backend's local payment ledger.

## 📜 Transaction History
VoicePay includes a transaction history interface showing:
- Sent payments
- Received payments
- Failed transactions
- Transaction amounts
- Recipient information
- UPI-style IDs
- Timestamps
- Transaction status
- Failure reasons
Users can select individual transactions to view additional details.

## 🔊 Multilingual Voice Feedback
Important payment events are communicated using text-to-speech.
For example:
Payment successful.
₹500 has been sent to Suresh.

Voice feedback is localized according to the selected language.

## 🎨 Mobile-First User Interface
The mobile interface is designed around a simple voice-first payment experience.
The application includes:
- Large voice interaction interface
- Purple payment-themed design
- Language selection
- Quick payment actions
- Balance screen
- Transaction history
- QR payment
- Phone-number payment
- OTP verification
- Biometric confirmation
- Localized voice feedback
- Payment success and failure screens
- Payment cancellation flow

  
VoicePay uses Sarvam AI for multilingual speech recognition and implements its own UPI-style payment simulation using FastAPI and a local SQLite ledger. No Razorpay or other third-party payment gateway is used.

## 🏗️ Architecture Diagram:

Voice Command
      ↓
Sarvam AI Speech Recognition
      ↓
Speech-to-Text
      ↓
VoicePay NLP / Command Parser
      ↓
Payment Intent Extraction
      ↓
Payment Preview
      ↓
User Confirmation
      ↓
OTP Verification
      ↓
Biometric Authentication
      ↓
VoicePay Payment Engine
      ↓
SQLite Simulated Ledger
      ↓
Transaction Result

## 🧩 Technology stack:

📱 Mobile Application
- React Native
- Expo
- Expo Router
- TypeScript
- Expo Audio
- Expo Camera
- Expo Speech
- Expo Local Authentication
- Expo Clipboard
- React Native Safe Area Context
  
⚙️ Backend
- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- Pydantic
- SQLite
  
🤖 AI / Speech Processing
- Sarvam AI
- Multilingual ASR processing
- Voice command parsing
- Telugu speech normalization
- Hindi voice command processing
- Number-word extraction
- Payment intent extraction
- Natural-language command processing

## 🔐 Security Workflow
VoicePay uses multiple confirmation layers in the simulated payment flow:
Voice Command
      ↓
Payment Preview
      ↓
User Confirmation
      ↓
OTP / Confirmation
      ↓
Biometric Authentication
      ↓
Backend Verification
      ↓
Transaction Confirmation
      ↓
Ledger Update

PIN-related security uses password hashing rather than storing plaintext PINs.

## 🎯 Project Objectives
The project explores the integration of:
- Voice-first financial interfaces
- Multilingual accessibility
- Speech recognition
- Natural-language processing
- Payment intent extraction
- Mobile application development
- Secure transaction workflows
- Biometric authentication
- OTP-based confirmation
- QR-based payment interaction
- Phone-number payment interaction
- Full-stack API architecture
  
## 🔮 Future Improvements
Potential future improvements include:
- Support for additional Indian languages
- Improved recognition of regional accents
- Offline speech processing
- More robust conversational payment assistance
- Advanced fraud detection
- Real-time payment notifications
- Cloud-hosted backend
- Production-grade authentication
- Improved accessibility features
- More advanced voice intent classification
- Integration with appropriate regulated payment infrastructure

## ⚠️Project disclaimer:
VoicePay is an academic and demonstration project implementing a UPI-style payment simulation. It does not connect to real banks, NPCI, Razorpay, or live UPI infrastructure. No real money is transferred through the application. All users, balances, transactions, and payment operations are simulated using a local payment ledger.




