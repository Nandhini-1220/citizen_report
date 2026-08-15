import os
import re
import json
import requests
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from app.models import SMSLog

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(BASE_DIR, ".env"))

def sanitize_phone_number(phone_str: str) -> str:
    """Extracts raw digits from strings like '+91 98401 23456' -> '9840123456'."""
    digits = re.sub(r"\D", "", phone_str)
    # If 12 digits starting with 91 (India), strip the 91 for Indian bulk gateways
    if len(digits) == 12 and digits.startswith("91"):
        return digits[2:]
    return digits

def send_real_sms(recipient_phone: str, message: str) -> dict:
    """
    Attempts delivery via Fast2SMS (for India) or Twilio (Global).
    Falls back gracefully if keys are missing.
    """
    clean_digits = sanitize_phone_number(recipient_phone)
    
    # 1. Try Fast2SMS (Direct SMS to Indian Mobiles)
    fast2sms_key = os.getenv("FAST2SMS_API_KEY")
    if fast2sms_key and not fast2sms_key.startswith("your_"):
        url = "https://www.fast2sms.com/dev/bulkV2"
        payload = {
            "route": "q", # Quick SMS route
            "message": message,
            "language": "english",
            "flash": 0,
            "numbers": clean_digits,
        }
        headers = {
            "authorization": fast2sms_key,
            "Content-Type": "application/x-www-form-urlencoded"
        }
        try:
            res = requests.post(url, data=payload, headers=headers, timeout=10)
            data = res.json()
            if data.get("return") is True:
                print(f"[REAL SMS SENT via Fast2SMS] -> To: {clean_digits}")
                return {"provider": "fast2sms", "status": "DELIVERED", "details": data}
            else:
                print(f"[Fast2SMS Warning] Gateway returned: {data}")
        except Exception as e:
            print(f"[Fast2SMS Error] {e}")

    # 2. Try Twilio (International / Global Deliveries)
    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
    twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
    twilio_from = os.getenv("TWILIO_FROM_NUMBER")
    if twilio_sid and twilio_token and twilio_from:
        try:
            from twilio.rest import Client
            client = Client(twilio_sid, twilio_token)
            # Ensure + prefix for E.164 international format
            to_formatted = f"+{clean_digits}" if not recipient_phone.startswith("+") else recipient_phone
            msg_obj = client.messages.create(
                body=message,
                from_=twilio_from,
                to=to_formatted
            )
            print(f"[REAL SMS SENT via Twilio] -> SID: {msg_obj.sid}")
            return {"provider": "twilio", "status": "DELIVERED", "sid": msg_obj.sid}
        except Exception as e:
            print(f"[Twilio Error] {e}")

    # 3. Terminal Log Notice (if API keys not yet configured)
    print(f"\n[REAL SMS FALLBACK - LOGGED TO CONSOLE]")
    print(f"Target Mobile: {recipient_phone}")
    print(f"Message Body: \"{message}\"\n")
    return {"provider": "console_fallback", "status": "QUEUED"}


def send_sms_notification(db: Session, recipient_phone: str, ticket_id: str, message: str):
    """Saves SMS to database audit log and triggers cellular network dispatch."""
    sms_entry = SMSLog(
        recipient_phone=recipient_phone,
        ticket_id=ticket_id,
        message=message,
        sent_at=datetime.utcnow()
    )
    db.add(sms_entry)
    db.commit()
    
    # Send actual SMS over cellular network
    return send_real_sms(recipient_phone, message)