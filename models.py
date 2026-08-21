from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)

class Call(Base):
    __tablename__ = "calls"
    id = Column(Integer, primary_key=True, index=True)
    caller_id = Column(String, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    duration_seconds = Column(Integer)
    transcription = Column(String)
    sentiment = Column(String) # Positive, Neutral, Negative
    escalated = Column(Boolean, default=False)
    resolved_by_ai = Column(Boolean, default=False)
    
    complaint = relationship("Complaint", back_populates="call", uselist=False)

class Complaint(Base):
    __tablename__ = "complaints"
    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey("calls.id"))
    category = Column(String, index=True) # Water, Electricity, Police, etc.
    description = Column(String)
    urgency = Column(String) # Routine, Urgent, Emergency
    status = Column(String, default="Open") # Open, In Progress, Resolved
    department_id = Column(Integer, ForeignKey("departments.id"))
    sla_deadline = Column(DateTime)
    resolved_at = Column(DateTime, nullable=True)
    ward = Column(String)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    
    call = relationship("Call", back_populates="complaint")
    department = relationship("Department")
