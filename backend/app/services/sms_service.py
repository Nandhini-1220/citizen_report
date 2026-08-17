import os
from pathlib import Path
from dotenv import load_dotenv, find_dotenv
from sqlalchemy.orm import Session
from app.models import SMSLog

load_dotenv(find_dotenv())

def send_sms_notification(db: Session, phone_number: str, ticket_id: str, message_body: str):
    """Prints SMS banner and safely logs dispatch to database."""
    clean_phone = phone_number.strip().replace(" ", "").replace("-", "")
    if not clean_phone.startswith("+"):
        clean_phone = f"+91{clean_phone}" if len(clean_phone) == 10 else f"+{clean_phone}"

    # Visual Console Banner
    print(f"\n==================== [AUTOMATED SMS DISPATCH] ====================")
    print(f"TO:       {clean_phone}")
    print(f"TICKET:   #{ticket_id}")
    print(f"MESSAGE:  {message_body}")
    print(f"STATUS:   LOGGED (CONSOLE SIMULATION)")
    print(f"===================================================================\n")

    # Non-blocking DB log
    try:
        log_entry = SMSLog(
            recipient_phone=clean_phone,
            message=message_body,
            status="LOGGED"
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[SMS Log Warning] Could not write to sms_logs table: {e}")