from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    username = Column(String, unique=True, nullable=True)
    password_hash = Column(String, nullable=True)

    complaints = relationship("Complaint", back_populates="department")


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(String, unique=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    category = Column(String)
    summary = Column(Text)
    raw_transcript = Column(Text, nullable=True)
    urgency = Column(String, default="Medium")
    sentiment = Column(String, default="Neutral")
    sentiment_score = Column(Float, default=0.0)
    is_suspicious = Column(Boolean, default=False)
    suspicious_reason = Column(String, nullable=True)
    lat = Column(Float)
    lng = Column(Float)
    location_name = Column(String, nullable=True)
    status = Column(String, default="REGISTERED")  # REGISTERED, ACKNOWLEDGED, PENDING_VERIFICATION, RESOLVED, FAKE_CALL
    report_count = Column(Integer, default=1)
    assigned_officer = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    acknowledged_at = Column(DateTime, nullable=True)
    deadline_set = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    rating = Column(Integer, nullable=True)
    feedback_notes = Column(Text, nullable=True)
    feedback_submitted_at = Column(DateTime, nullable=True)

    # Resolution proof & verification metadata
    resolution_image = Column(String, nullable=True)
    resolution_lat = Column(Float, nullable=True)
    resolution_lng = Column(Float, nullable=True)
    resolved_notes = Column(Text, nullable=True)
    is_verified_by_admin = Column(Boolean, default=False)

    department = relationship("Department", back_populates="complaints")
    subscribers = relationship("CallerSubscriber", back_populates="complaint")


class CallerSubscriber(Base):
    __tablename__ = "caller_subscribers"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"))
    phone_number = Column(String, index=True)
    subscribed_at = Column(DateTime, default=datetime.utcnow, nullable=True)

    complaint = relationship("Complaint", back_populates="subscribers")


class BlacklistedNumber(Base):
    __tablename__ = "blacklisted_numbers"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String, unique=True, index=True)
    reason = Column(String, default="Marked as fake/fraudulent complaint by municipal administration.")
    blacklisted_at = Column(DateTime, default=datetime.utcnow)
    ticket_id = Column(String, nullable=True)


class SMSLog(Base):
    __tablename__ = "sms_logs"

    id = Column(Integer, primary_key=True, index=True)
    recipient_phone = Column(String)
    complaint_id = Column(Integer, nullable=True)
    message = Column(Text)
    status = Column(String, default="SENT")
    sent_at = Column(DateTime, default=datetime.utcnow)