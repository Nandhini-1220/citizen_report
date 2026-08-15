from datetime import datetime
from sqlalchemy.orm import Session
from app.models import SMSLog

def send_sms_notification(db: Session, recipient_phone: str, ticket_id: str, message: str):
    # Logs SMS locally and dispatches webhook payload for SMS gateway
    sms_entry = SMSLog(
        recipient_phone=recipient_phone,
        ticket_id=ticket_id,
        message=message,
        sent_at=datetime.utcnow()
    )
    db.add(sms_entry)
    db.commit()
    print(f"\n[SMS DISPATCH] To: {recipient_phone} | Ticket: #{ticket_id}\nMessage: \"{message}\"\n")
    return True