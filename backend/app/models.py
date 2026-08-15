from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base  # <--- Make sure it imports from app.database

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    sla_hours = Column(Integer, default=24)
    username = Column(String, unique=True)
    password_hash = Column(String)

    complaints = relationship("Complaint", back_populates="dept")

class Complaint(Base):
    __tablename__ = "complaints"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(String, unique=True, index=True)
    raw_transcript = Column(Text, nullable=True)
    translated_transcript = Column(Text, nullable=True)
    summary = Column(Text, nullable=False)
    category = Column(String, index=True)
    urgency = Column(String, default="Medium")
    sentiment = Column(String, default="Neutral")
    sentiment_score = Column(Float, default=50.0)
    is_suspicious = Column(Boolean, default=False)
    suspicious_reason = Column(Text, nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"))
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    location_name = Column(String, nullable=True)
    status = Column(String, default="REGISTERED")
    report_count = Column(Integer, default=1)
    assigned_officer = Column(String, nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    deadline_set = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    dept = relationship("Department", back_populates="complaints")
    subscribers = relationship("CallerSubscriber", back_populates="complaint", cascade="all, delete-orphan")

class CallerSubscriber(Base):
    __tablename__ = "caller_subscribers"
    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"))
    phone_number = Column(String, index=True)
    registered_at = Column(DateTime, default=datetime.utcnow)

    complaint = relationship("Complaint", back_populates="subscribers")

class SMSLog(Base):
    __tablename__ = "sms_logs"
    id = Column(Integer, primary_key=True, index=True)
    recipient_phone = Column(String, nullable=False)
    ticket_id = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow)