import os
import io
import tempfile
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from app.database import engine, SessionLocal, Base, get_db
from app.models import Complaint, Department, CallerSubscriber, SMSLog
from app.services.stt_service import transcribe_and_translate_audio
from app.services.llm_service import extract_complaint_intelligence
from app.services.dedupe_service import find_duplicate_complaint, index_new_complaint, clear_and_rebuild_index
from app.services.sms_service import send_sms_notification

# Initialize database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Municipal Voice AI Grievance Platform")

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    """Sync in-memory FAISS semantic index with existing DB records on boot."""
    db = SessionLocal()
    try:
        active_tickets = db.query(Complaint).all()
        clear_and_rebuild_index(active_tickets)
    finally:
        db.close()


# -------------------------------------------------------------
# 1. AUTHENTICATION (STAFF & ADMIN ONLY)
# -------------------------------------------------------------

class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/api/auth/login")
def staff_login(payload: LoginRequest, db: Session = Depends(get_db)):
    u = payload.username.strip().lower()
    p = payload.password.strip()

    # 1. Super Admin Account
    if u == "admin" and p == "admin123":
        return {
            "status": "SUCCESS",
            "role": "admin",
            "name": "City Administrator",
            "department": "All"
        }

    # 2. Hardcoded Fallback Dictionary for Robust Officer Demo Login
    OFFICER_CREDS = {
        "water_admin": ("Water Supply", "water123"),
        "road_admin": ("Road Maintenance", "road123"),
        "gas_admin": ("Gas & Energy", "gas123"),
        "sanitation_admin": ("Sanitation", "sanitation123"),
        "electric_admin": ("Electricity Board", "electric123"),
        "police_admin": ("Public Safety", "police123"),
    }

    if u in OFFICER_CREDS and p == OFFICER_CREDS[u][1]:
        dept_name = OFFICER_CREDS[u][0]
        return {
            "status": "SUCCESS",
            "role": "officer",
            "name": f"Officer ({dept_name})",
            "department": dept_name
        }

    # 3. Database Dynamic Officer Check
    dept = db.query(Department).filter(
        (func.lower(Department.username) == u) &
        (Department.password_hash == p)
    ).first()

    if dept:
        return {
            "status": "SUCCESS",
            "role": "officer",
            "name": f"Officer ({dept.name})",
            "department": dept.name
        }

    raise HTTPException(status_code=401, detail="Invalid username or password.")


# -------------------------------------------------------------
# 2. CITIZEN VOICE INGESTION & PUBLIC TRACKING (NO LOGIN)
# -------------------------------------------------------------

@app.post("/api/complaints/call-ingest")
async def ingest_voice_call(
    audio: UploadFile = File(...),
    caller_phone: str = Form(...),
    lat: float = Form(13.0827),
    lng: float = Form(80.2707),
    db: Session = Depends(get_db)
):
    # Save audio temporarily for Whisper inference
    suffix = os.path.splitext(audio.filename)[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        # Step A: Multilingual STT Translation
        stt_result = transcribe_and_translate_audio(tmp_path)
        transcript = stt_result["translated_text"]

        # Step B: LLM Parameter Extraction
        intel = extract_complaint_intelligence(transcript)

        # Step C: Match target Department
        dept_name = intel["department_name"]
        clean_dept_word = dept_name.split()[0].strip()
        department = db.query(Department).filter(
            (Department.name.ilike(f"%{clean_dept_word}%")) |
            (Department.name.ilike(f"%{dept_name}%"))
        ).first()

        if not department:
            department = db.query(Department).first()

        # Step D: Spatial & Semantic Deduplication
        active_dict = {c.id: c for c in db.query(Complaint).filter(Complaint.status != "RESOLVED").all()}
        duplicate = find_duplicate_complaint(intel["summary"], lat, lng, active_dict)

        if duplicate:
            # Increment caller counter and add subscriber
            duplicate.report_count += 1
            subscriber = CallerSubscriber(complaint_id=duplicate.id, phone_number=caller_phone)
            db.add(subscriber)
            db.commit()
            db.refresh(duplicate)

            send_sms_notification(
                db, caller_phone, duplicate.ticket_id,
                f"Helpline: Linked to existing incident #{duplicate.ticket_id}. Total Callers: {duplicate.report_count}. Track: http://localhost:5173/track/{duplicate.ticket_id}"
            )

            return {
                "status": "MERGED_DUPLICATE",
                "message": f"Merged with incident #{duplicate.ticket_id}",
                "complaint": {
                    "id": duplicate.id,
                    "ticket_id": duplicate.ticket_id,
                    "category": duplicate.category,
                    "summary": duplicate.summary,
                    "urgency": duplicate.urgency,
                    "report_count": duplicate.report_count,
                    "status": duplicate.status
                }
            }

        # Step E: Create New Master Complaint
        dept_code = clean_dept_word[:3].upper() if clean_dept_word else "GEN"
        ticket_code = f"{dept_code}-{str(uuid.uuid4().hex[:4]).upper()}"
        
        new_complaint = Complaint(
            ticket_id=ticket_code,
            department_id=department.id if department else None,
            category=intel["category"],
            summary=intel["summary"],
            raw_transcript=transcript,
            urgency=intel["urgency"],
            sentiment=intel["sentiment"],
            sentiment_score=intel["sentiment_score"],
            is_suspicious=intel["is_suspicious"],
            suspicious_reason=intel["suspicious_reason"],
            lat=lat,
            lng=lng,
            location_name=intel["location_extracted"],
            status="REGISTERED",
            report_count=1
        )
        db.add(new_complaint)
        db.commit()
        db.refresh(new_complaint)

        # Index vector in FAISS
        index_new_complaint(new_complaint.id, new_complaint.summary)

        # Link primary caller
        subscriber = CallerSubscriber(complaint_id=new_complaint.id, phone_number=caller_phone)
        db.add(subscriber)
        db.commit()

        # Send initial confirmation notification
        send_sms_notification(
            db, caller_phone, new_complaint.ticket_id,
            f"Helpline: Registered #{new_complaint.ticket_id} ({new_complaint.category}). Track: http://localhost:5173/track/{new_complaint.ticket_id}"
        )

        return {
            "status": "CREATED",
            "complaint": {
                "id": new_complaint.id,
                "ticket_id": new_complaint.ticket_id,
                "category": new_complaint.category,
                "summary": new_complaint.summary,
                "urgency": new_complaint.urgency,
                "report_count": new_complaint.report_count,
                "status": new_complaint.status
            }
        }
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.get("/api/complaints/{ticket_id}")
def get_complaint_status(ticket_id: str, db: Session = Depends(get_db)):
    comp = db.query(Complaint).filter(Complaint.ticket_id == ticket_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Grievance record not found.")

    dept_name = comp.department_rel.name if comp.department_rel else comp.category
    return {
        "id": comp.id,
        "ticket_id": comp.ticket_id,
        "category": comp.category,
        "summary": comp.summary,
        "urgency": comp.urgency,
        "status": comp.status,
        "lat": comp.lat,
        "lng": comp.lng,
        "location_name": comp.location_name,
        "department": dept_name,
        "report_count": comp.report_count,
        "assigned_officer": comp.assigned_officer,
        "created_at": comp.created_at.isoformat() if comp.created_at else None,
        "acknowledged_at": comp.acknowledged_at.isoformat() if comp.acknowledged_at else None,
        "deadline_set": comp.deadline_set.isoformat() if comp.deadline_set else None,
        "resolved_at": comp.resolved_at.isoformat() if comp.resolved_at else None,
    }


# -------------------------------------------------------------
# 3. OFFICER WORKSPACE & TRIAGE
# -------------------------------------------------------------

@app.get("/api/officer/tickets")
def get_officer_tickets(dept: str = Query("Water Supply"), db: Session = Depends(get_db)):
    query = db.query(Complaint)
    if dept != "All":
        clean_keyword = dept.split(" ")[0].strip()
        department = db.query(Department).filter(
            (Department.name.ilike(f"%{clean_keyword}%")) |
            (Department.name.ilike(f"%{dept}%"))
        ).first()

        if department:
            query = query.filter(
                (Complaint.department_id == department.id) |
                (Complaint.category.ilike(f"%{clean_keyword}%"))
            )
        else:
            query = query.filter(Complaint.category.ilike(f"%{clean_keyword}%"))

    complaints = query.order_by(Complaint.created_at.desc()).all()
    
    # Fallback to all complaints if specific filter is empty and All is requested
    if not complaints and dept == "All":
        complaints = db.query(Complaint).order_by(Complaint.created_at.desc()).all()

    return [
        {
            "id": c.id,
            "ticket_id": c.ticket_id,
            "summary": c.summary,
            "category": c.category,
            "urgency": c.urgency,
            "status": c.status,
            "report_count": c.report_count,
            "lat": c.lat,
            "lng": c.lng,
            "location_name": c.location_name,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "acknowledged_at": c.acknowledged_at.isoformat() if c.acknowledged_at else None,
            "deadline_set": c.deadline_set.isoformat() if c.deadline_set else None,
            "resolved_at": c.resolved_at.isoformat() if c.resolved_at else None,
            "assigned_officer": c.assigned_officer
        }
        for c in complaints
    ]


@app.post("/api/officer/acknowledge/{ticket_id}")
def acknowledge_complaint(
    ticket_id: str,
    officer_name: str = Form(...),
    deadline_hours: int = Form(4),
    db: Session = Depends(get_db)
):
    comp = db.query(Complaint).filter(Complaint.ticket_id == ticket_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Complaint not found")

    comp.status = "ACKNOWLEDGED"
    comp.assigned_officer = officer_name
    comp.acknowledged_at = datetime.utcnow()
    comp.deadline_set = datetime.utcnow() + timedelta(hours=deadline_hours)
    db.commit()

    # Notify all linked citizens
    for sub in comp.subscribers:
        send_sms_notification(
            db, sub.phone_number, comp.ticket_id,
            f"Update: #{comp.ticket_id} acknowledged by Officer {officer_name}. Promised SLA: {deadline_hours} hrs. Track: http://localhost:5173/track/{comp.ticket_id}"
        )

    return {"status": "SUCCESS", "message": "Ticket acknowledged."}


@app.post("/api/officer/resolve/{ticket_id}")
def resolve_complaint(ticket_id: str, db: Session = Depends(get_db)):
    comp = db.query(Complaint).filter(Complaint.ticket_id == ticket_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Complaint not found")

    comp.status = "RESOLVED"
    comp.resolved_at = datetime.utcnow()
    db.commit()

    # Notify all linked citizens
    for sub in comp.subscribers:
        send_sms_notification(
            db, sub.phone_number, comp.ticket_id,
            f"Resolved: Incident #{comp.ticket_id} marked resolved by department field unit. Thank you!"
        )

    return {"status": "SUCCESS", "message": "Ticket resolved."}


# -------------------------------------------------------------
# 4. SUPER ADMIN COMMAND CENTER & AUDIT PDF GENERATOR
# -------------------------------------------------------------

@app.get("/api/dashboard/overview")
def get_dashboard_overview(db: Session = Depends(get_db)):
    total = db.query(Complaint).count()
    active = db.query(Complaint).filter(Complaint.status != "RESOLVED").count()
    resolved = db.query(Complaint).filter(Complaint.status == "RESOLVED").count()
    emergency = db.query(Complaint).filter(Complaint.urgency.in_(["Emergency", "High"])).count()
    return {"total": total, "active": active, "resolved": resolved, "emergency": emergency}


@app.get("/api/dashboard/live-feed")
def get_live_feed(db: Session = Depends(get_db)):
    items = db.query(Complaint).order_by(Complaint.created_at.desc()).limit(50).all()
    return [
        {
            "id": c.id,
            "ticket_id": c.ticket_id,
            "summary": c.summary,
            "category": c.category,
            "urgency": c.urgency,
            "status": c.status,
            "report_count": c.report_count,
            "lat": c.lat,
            "lng": c.lng,
            "created_at": c.created_at.isoformat() if c.created_at else None
        }
        for c in items
    ]


class ReportRequest(BaseModel):
    format: Optional[str] = "PDF"


@app.post("/api/reports/generate")
def generate_audit_report(payload: ReportRequest, db: Session = Depends(get_db)):
    complaints = db.query(Complaint).order_by(Complaint.created_at.desc()).all()
    
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    
    # PDF Header
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(50, 750, "Municipal Incident Audit Report")
    
    pdf.setFont("Helvetica", 10)
    pdf.drawString(50, 735, f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')} | Total Grievances: {len(complaints)}")
    pdf.line(50, 725, 550, 725)

    y = 700
    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawString(50, y, "Ticket ID")
    pdf.drawString(130, y, "Category")
    pdf.drawString(270, y, "Priority")
    pdf.drawString(340, y, "Status")
    pdf.drawString(420, y, "Callers")
    y -= 15

    pdf.setFont("Helvetica", 8)
    for c in complaints:
        if y < 60:
            pdf.showPage()
            y = 750
        pdf.drawString(50, y, f"#{c.ticket_id}")
        pdf.drawString(130, y, str(c.category)[:22])
        pdf.drawString(270, y, str(c.urgency))
        pdf.drawString(340, y, str(c.status))
        pdf.drawString(420, y, str(c.report_count))
        y -= 16

    pdf.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": "attachment; filename=Municipal_Incident_Report.pdf"}
    )