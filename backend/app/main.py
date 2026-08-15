import os
import uuid
import shutil
import random
import tempfile
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import engine, get_db, Base
from app.models import Department, Complaint, CallerSubscriber, SMSLog
from app.services.stt_service import transcribe_and_translate_audio
from app.services.llm_service import extract_complaint_intelligence
from app.services.dedupe_service import find_duplicate_complaint, index_new_complaint
from app.services.sms_service import send_sms_notification

# Auto-create all tables in SQLite database
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Citizen Intelligence Platform API")

# Configure CORS for Vite React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cross-platform temp audio upload directory
UPLOAD_DIR = os.path.join(tempfile.gettempdir(), "citizen_audio_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# 1. Citizen Call Ingestion (STT + Groq LLM + FAISS Deduplication)
# ---------------------------------------------------------------------------
@app.post("/api/complaints/call-ingest")
async def ingest_citizen_call(
    audio: Optional[UploadFile] = File(None),
    raw_text: Optional[str] = Form(None),
    caller_phone: str = Form(...),
    lat: float = Form(...),
    lng: float = Form(...),
    db: Session = Depends(get_db)
):
    if not audio and not raw_text:
        raise HTTPException(status_code=400, detail="Provide either an audio recording or raw text.")

    # A. Speech-to-Text translation via faster-whisper
    if audio:
        file_ext = audio.filename.split(".")[-1] if "." in audio.filename else "webm"
        temp_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}.{file_ext}")
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)
        
        try:
            stt_res = transcribe_and_translate_audio(temp_path)
            transcript = stt_res.get("translated_text", "").strip()
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
    else:
        transcript = raw_text.strip()

    if not transcript:
        transcript = "Citizen reported municipal grievance via voice call."

    # B. Extract structured parameters via Groq (Llama 3)
    ai_data = extract_complaint_intelligence(transcript)

    # C. Resolve Department from extracted department_name
    dept_name = ai_data.get("department_name", "General Administration")
    dept = db.query(Department).filter(Department.name.ilike(f"%{dept_name}%")).first()
    if not dept:
        dept = db.query(Department).first()
    dept_id = dept.id if dept else 1

    # D. Deduplication check (FAISS cosine similarity + Haversine distance <= 500m)
    open_complaints = {c.id: c for c in db.query(Complaint).filter(Complaint.status != "RESOLVED").all()}
    duplicate_match = find_duplicate_complaint(ai_data["summary"], lat, lng, open_complaints)

    if duplicate_match:
        duplicate_match.report_count += 1
        
        # Link new subscriber phone number
        sub = CallerSubscriber(complaint_id=duplicate_match.id, caller_phone=caller_phone)
        db.add(sub)
        db.commit()
        db.refresh(duplicate_match)

        # Dispatch duplicate confirmation SMS
        sms_msg = (
            f"Your report regarding '{duplicate_match.category}' has been linked with active Ticket #{duplicate_match.ticket_id} "
            f"(Reported by {duplicate_match.report_count} citizens). Track status: http://localhost:5173/track/{duplicate_match.ticket_id}"
        )
        send_sms_notification(db, caller_phone, duplicate_match.ticket_id, sms_msg)
        
        return {
            "status": "MERGED_DUPLICATE",
            "complaint": {
                "id": duplicate_match.id,
                "ticket_id": duplicate_match.ticket_id,
                "category": duplicate_match.category,
                "summary": duplicate_match.summary,
                "status": duplicate_match.status,
                "report_count": duplicate_match.report_count,
                "urgency": duplicate_match.urgency
            }
        }

    # E. Create Master Incident Record
    prefix = dept.name[:3].upper() if dept else "CIT"
    ticket_id = f"{prefix}-{random.randint(1000, 9999)}"

    new_complaint = Complaint(
        ticket_id=ticket_id,
        raw_transcript=transcript,
        translated_transcript=transcript,
        summary=ai_data.get("summary", transcript),
        category=ai_data.get("category", "General Grievance"),
        urgency=ai_data.get("urgency", "Medium"),
        sentiment=ai_data.get("sentiment", "Neutral"),
        sentiment_score=float(ai_data.get("sentiment_score", 50.0)),
        is_suspicious=bool(ai_data.get("is_suspicious", False)),
        suspicious_reason=ai_data.get("suspicious_reason"),
        department_id=dept_id,
        lat=lat,
        lng=lng,
        location_name=ai_data.get("location_extracted", "GPS Location"),
        status="REGISTERED",
        report_count=1,
        created_at=datetime.utcnow()
    )
    db.add(new_complaint)
    db.commit()
    db.refresh(new_complaint)

    # Link initial caller as subscriber
    db.add(CallerSubscriber(complaint_id=new_complaint.id, caller_phone=caller_phone))
    db.commit()

    # Index embedding into FAISS for rolling deduplication
    index_new_complaint(new_complaint.id, new_complaint.summary)

    # Dispatch registration SMS
    reg_sms = (
        f"Citizen Helpline: Your complaint #{new_complaint.ticket_id} regarding '{new_complaint.category}' is registered. "
        f"Assigned to {dept.name if dept else 'Department'}. Track: http://localhost:5173/track/{new_complaint.ticket_id}"
    )
    send_sms_notification(db, caller_phone, new_complaint.ticket_id, reg_sms)

    return {
        "status": "CREATED",
        "complaint": {
            "id": new_complaint.id,
            "ticket_id": new_complaint.ticket_id,
            "category": new_complaint.category,
            "summary": new_complaint.summary,
            "status": new_complaint.status,
            "report_count": new_complaint.report_count,
            "urgency": new_complaint.urgency
        }
    }


# ---------------------------------------------------------------------------
# 2. Public Citizen Status Tracking Route
# ---------------------------------------------------------------------------
@app.get("/api/complaints/{ticket_id}")
def get_complaint_by_ticket(ticket_id: str, db: Session = Depends(get_db)):
    complaint = db.query(Complaint).filter(Complaint.ticket_id == ticket_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return {
        "id": complaint.id,
        "ticket_id": complaint.ticket_id,
        "category": complaint.category,
        "summary": complaint.summary,
        "urgency": complaint.urgency,
        "sentiment": complaint.sentiment,
        "status": complaint.status,
        "report_count": complaint.report_count,
        "lat": complaint.lat,
        "lng": complaint.lng,
        "location_name": complaint.location_name,
        "created_at": complaint.created_at.isoformat() if complaint.created_at else None,
        "acknowledged_at": complaint.acknowledged_at.isoformat() if complaint.acknowledged_at else None,
        "deadline_set": complaint.deadline_set.isoformat() if complaint.deadline_set else None,
        "resolved_at": complaint.resolved_at.isoformat() if complaint.resolved_at else None,
        "assigned_officer": complaint.assigned_officer,
        "department": complaint.dept.name if complaint.dept else "Unassigned"
    }


# ---------------------------------------------------------------------------
# 3. Officer Portal Workflow Routes (Scoped Queue, Acknowledge & Resolve)
# ---------------------------------------------------------------------------
@app.get("/api/officer/tickets")
def get_officer_department_tickets(dept: str = Query("Water Supply"), db: Session = Depends(get_db)):
    department = db.query(Department).filter(Department.name.ilike(f"%{dept}%")).first()
    if not department:
        return []

    complaints = (
        db.query(Complaint)
        .filter(Complaint.department_id == department.id)
        .order_by(Complaint.created_at.desc())
        .all()
    )

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
            "deadline_set": c.deadline_set.isoformat() if c.deadline_set else None,
            "assigned_officer": c.assigned_officer
        }
        for c in complaints
    ]

@app.post("/api/officer/acknowledge/{ticket_id}")
def acknowledge_ticket(
    ticket_id: str,
    officer_name: str = Form(...),
    deadline_hours: int = Form(...),
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.ticket_id == ticket_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    complaint.status = "ACKNOWLEDGED"
    complaint.assigned_officer = officer_name
    complaint.acknowledged_at = datetime.utcnow()
    complaint.deadline_set = datetime.utcnow() + timedelta(hours=deadline_hours)
    db.commit()

    formatted_deadline = complaint.deadline_set.strftime("%b %d at %I:%M %p")
    for sub in complaint.subscribers:
        dept_name = complaint.dept.name if complaint.dept else "Department"
        ack_sms = (
            f"Update on #{complaint.ticket_id}: Officer {officer_name} ({dept_name}) has acknowledged your issue. "
            f"Target completion deadline: {formatted_deadline}."
        )
        send_sms_notification(db, sub.caller_phone, complaint.ticket_id, ack_sms)

    return {"status": "ACKNOWLEDGED", "ticket_id": complaint.ticket_id, "deadline_set": complaint.deadline_set}

@app.post("/api/officer/resolve/{ticket_id}")
def resolve_ticket(ticket_id: str, db: Session = Depends(get_db)):
    complaint = db.query(Complaint).filter(Complaint.ticket_id == ticket_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    complaint.status = "RESOLVED"
    complaint.resolved_at = datetime.utcnow()
    db.commit()

    for sub in complaint.subscribers:
        res_sms = (
            f"Issue Resolved: Complaint #{complaint.ticket_id} ({complaint.category}) has been marked RESOLVED. "
            f"Thank you for reporting."
        )
        send_sms_notification(db, sub.caller_phone, complaint.ticket_id, res_sms)

    return {"status": "RESOLVED", "ticket_id": complaint.ticket_id}


# ---------------------------------------------------------------------------
# 4. Admin Command Center & Live Feed Routes
# ---------------------------------------------------------------------------
@app.get("/api/dashboard/overview")
def get_dashboard_overview(db: Session = Depends(get_db)):
    total = db.query(Complaint).count()
    resolved = db.query(Complaint).filter(Complaint.status == "RESOLVED").count()
    emergency = db.query(Complaint).filter(Complaint.urgency == "Emergency").count()
    active = total - resolved

    return {
        "total": total,
        "active": active,
        "resolved": resolved,
        "emergency": emergency
    }

@app.get("/api/dashboard/live-feed")
def get_live_feed(db: Session = Depends(get_db)):
    complaints = db.query(Complaint).order_by(Complaint.created_at.desc()).limit(50).all()
    return [
        {
            "id": c.id,
            "ticket_id": c.ticket_id,
            "category": c.category,
            "summary": c.summary,
            "urgency": c.urgency,
            "sentiment": c.sentiment,
            "report_count": c.report_count,
            "status": c.status,
            "lat": c.lat,
            "lng": c.lng,
            "is_suspicious": c.is_suspicious,
            "created_at": c.created_at.isoformat() if c.created_at else None
        }
        for c in complaints
    ]


# ---------------------------------------------------------------------------
# 5. On-the-Fly PDF Audit Report Generation
# ---------------------------------------------------------------------------
class ReportRequest(BaseModel):
    format: str = "PDF"

@app.post("/api/reports/generate")
def generate_audit_report(payload: ReportRequest, db: Session = Depends(get_db)):
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors

        report_filename = f"Municipal_Incident_Audit_{uuid.uuid4().hex[:8]}.pdf"
        report_path = os.path.join(tempfile.gettempdir(), report_filename)

        doc = SimpleDocTemplate(report_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        elements = []
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            name="TitleStyle",
            parent=styles["Heading1"],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#0f172a"),
            alignment=1
        )

        elements.append(Paragraph("MUNICIPAL INCIDENT & GRIEVANCE AUDIT REPORT", title_style))
        elements.append(Spacer(1, 10))

        sub_text = f"Generated on: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')} | Automated AI Triage Platform"
        elements.append(Paragraph(sub_text, styles["Normal"]))
        elements.append(Spacer(1, 15))

        complaints = db.query(Complaint).order_by(Complaint.created_at.desc()).limit(25).all()

        table_data = [["Ticket", "Category", "Summary", "Urgency", "Callers", "Status"]]
        for c in complaints:
            table_data.append([
                c.ticket_id,
                c.category[:18],
                Paragraph(c.summary[:80] + "..." if len(c.summary) > 80 else c.summary, styles["Normal"]),
                c.urgency,
                str(c.report_count),
                c.status
            ])

        col_widths = [65, 85, 210, 60, 45, 75]
        t = Table(table_data, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ]))
        elements.append(t)

        doc.build(elements)
        return FileResponse(
            report_path,
            media_type="application/pdf",
            filename=f"Municipal_Incident_Audit_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF Generation failed: {str(e)}")