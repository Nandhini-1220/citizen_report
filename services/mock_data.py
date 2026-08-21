import random
import datetime
from sqlalchemy.orm import Session
from database import engine, Base
import models

def init_db():
    Base.metadata.create_all(bind=engine)

def seed_db(db: Session):
    # Check if we already have data
    if db.query(models.Department).first():
        return

    depts = [
        models.Department(name="Water Supply", description="Handles water issues"),
        models.Department(name="Electricity", description="Power outages and electrical faults"),
        models.Department(name="Police", description="Law enforcement and emergencies"),
        models.Department(name="Waste Management", description="Garbage collection and sanitation"),
        models.Department(name="Road Maintenance", description="Potholes and road repairs")
    ]
    db.add_all(depts)
    db.commit()

    dept_objs = db.query(models.Department).all()

    # Generate some mock calls and complaints
    for _ in range(50):
        timestamp = datetime.datetime.utcnow() - datetime.timedelta(hours=random.randint(0, 24))
        
        call = models.Call(
            caller_id=f"Citizen_{random.randint(1000, 9999)}",
            timestamp=timestamp,
            duration_seconds=random.randint(60, 600),
            transcription="Mock transcription text...",
            sentiment=random.choice(["Positive", "Neutral", "Negative"]),
            escalated=random.choice([True, False, False, False]),
            resolved_by_ai=random.choice([True, False])
        )
        db.add(call)
        db.commit()
        db.refresh(call)

        dept = random.choice(dept_objs)
        complaint = models.Complaint(
            call_id=call.id,
            category=dept.name,
            description="Mock complaint description...",
            urgency=random.choice(["Routine", "Urgent", "Emergency"]),
            status=random.choice(["Open", "In Progress", "Resolved"]),
            department_id=dept.id,
            sla_deadline=timestamp + datetime.timedelta(hours=random.randint(2, 48)),
            ward=f"Ward_{random.randint(1, 10)}",
            location_lat=40.7128 + random.uniform(-0.1, 0.1),
            location_lng=-74.0060 + random.uniform(-0.1, 0.1)
        )
        db.add(complaint)
    
    db.commit()

