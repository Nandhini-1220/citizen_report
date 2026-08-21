from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from database import get_db
import models
import schemas
import datetime

router = APIRouter()

@router.get("/metrics/overview", response_model=schemas.OverviewMetrics)
def get_overview_metrics(db: Session = Depends(get_db)):
    today = datetime.datetime.utcnow().date()
    
    # Total complaints today
    total_complaints = db.query(models.Complaint).filter(func.date(models.Complaint.timestamp) == today).count() if hasattr(models.Complaint, 'timestamp') else db.query(models.Complaint).count()
    
    # Escalated calls
    escalated_calls = db.query(models.Call).filter(models.Call.escalated == True).count()
    
    # AI Routing accuracy (mocked for now, but could be calculated)
    ai_routing_accuracy = 96.8
    
    # Avg resolution time (mock calculation)
    # In a real scenario, this would be avg of (resolved_at - timestamp)
    avg_resolution_time_hours = 3.2
    
    return schemas.OverviewMetrics(
        total_complaints_today=total_complaints or 1245, # Fallback to mockup data if none
        avg_resolution_time_hours=avg_resolution_time_hours,
        escalated_calls=escalated_calls or 87,
        ai_routing_accuracy_pct=ai_routing_accuracy
    )

@router.get("/metrics/categories", response_model=List[schemas.CategoryStats])
def get_category_stats(db: Session = Depends(get_db)):
    # Mock data to match the mockup roughly
    return [
        {"category": "Water Supply", "within_sla": 700, "sla_breached": 300},
        {"category": "Road Maintenance", "within_sla": 600, "sla_breached": 200},
        {"category": "Electricity", "within_sla": 400, "sla_breached": 100},
        {"category": "Waste Management", "within_sla": 400, "sla_breached": 100},
        {"category": "Police Request", "within_sla": 150, "sla_breached": 50},
    ]

@router.get("/metrics/sentiment", response_model=schemas.SentimentStats)
def get_sentiment_stats(db: Session = Depends(get_db)):
    positive = db.query(models.Call).filter(models.Call.sentiment == "Positive").count()
    neutral = db.query(models.Call).filter(models.Call.sentiment == "Neutral").count()
    negative = db.query(models.Call).filter(models.Call.sentiment == "Negative").count()
    
    total = positive + neutral + negative
    if total == 0:
        return {"positive": 35, "neutral": 37, "negative": 28} # mock percentages
    
    return {"positive": positive, "neutral": neutral, "negative": negative}

@router.get("/feed/live")
def get_live_feed():
    return [
        {"id": 4568, "status": "Routed to: Water Dept (99% confidence)", "action": "Transcribing...", "type": "info"},
        {"id": 4567, "status": "Escalated to: Supervisor (Urgency high)", "action": "Awaiting pickup", "type": "warning"},
        {"id": 4566, "status": "Resolved by chatbot (91% satisfaction)", "action": "Logged.", "type": "success"}
    ]
