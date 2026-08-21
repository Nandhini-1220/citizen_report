from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None

class Department(DepartmentBase):
    id: int
    class Config:
        from_attributes = True

class ComplaintBase(BaseModel):
    category: str
    description: str
    urgency: str
    status: str
    department_id: int
    ward: str
    sla_deadline: datetime
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None

class Complaint(ComplaintBase):
    id: int
    call_id: int
    resolved_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class CallBase(BaseModel):
    caller_id: str
    duration_seconds: int
    transcription: str
    sentiment: str
    escalated: bool
    resolved_by_ai: bool

class Call(CallBase):
    id: int
    timestamp: datetime
    complaint: Optional[Complaint] = None
    class Config:
        from_attributes = True

class OverviewMetrics(BaseModel):
    total_complaints_today: int
    avg_resolution_time_hours: float
    escalated_calls: int
    ai_routing_accuracy_pct: float
    
class CategoryStats(BaseModel):
    category: str
    within_sla: int
    sla_breached: int

class SentimentStats(BaseModel):
    positive: int
    neutral: int
    negative: int
