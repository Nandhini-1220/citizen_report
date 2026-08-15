import os
import json
import re
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(BASE_DIR, ".env"))

_client = None

def get_groq_client():
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY is not set in backend/.env file.")
        _client = Groq(api_key=api_key)
    return _client

EXTRACTION_SYSTEM_PROMPT = """You are the core cognitive intelligence engine of a municipal 311 / emergency grievance dispatch system.
Your job is to analyze citizen transcripts and output strictly valid JSON conforming exactly to the requested schema.

Output Schema Rules:
1. "summary": Exactly 1-2 factual sentences summarizing the problem clearly without conversational fluff.
2. "category": Must be one of ["Pothole / Road Maintenance", "Water Leakage / Supply", "Gas Hazard / Pipeline", "Sewage / Waste Management", "Electricity / Power Outage", "Public Safety / Police", "General Grievance"].
3. "department_name": Must be one of ["Road Maintenance", "Water Supply", "Gas & Energy", "Sanitation", "Electricity Board", "Public Safety", "General Administration"].
4. "urgency": Must be one of ["Low", "Medium", "High", "Emergency"]. Gas leaks, open live wires, flooding, or collapsing structures must be "Emergency" or "High".
5. "sentiment": One of ["Positive", "Neutral", "Negative"].
6. "sentiment_score": Float between 0.0 (extreme distress/anger) to 100.0 (calm/happy). Default 50.0.
7. "is_suspicious": Boolean (true if prank, alien sighting, nonsensical joke, or abusive spam; otherwise false).
8. "suspicious_reason": Short reason if suspicious, else null.
9. "location_extracted": Exact landmark, street, sector, or ward mentioned in text, or null if none."""

USER_PROMPT_TEMPLATE = """Citizen Spoken Transcript:
\"\"\"{transcript}\"\"\"

Analyze the transcript and return ONLY raw JSON matching the required schema."""

def clean_json_string(raw_str: str) -> str:
    """Removes markdown code fences if present."""
    raw_str = raw_str.strip()
    if raw_str.startswith("```json"):
        raw_str = raw_str[7:]
    elif raw_str.startswith("```"):
        raw_str = raw_str[3:]
    if raw_str.endswith("```"):
        raw_str = raw_str[:-3]
    return raw_str.strip()

def extract_complaint_intelligence(transcript: str) -> dict:
    """
    Extracts structured parameters from an English transcript in a single fast Groq API pass.
    """
    client = get_groq_client()

    try:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                {"role": "user", "content": USER_PROMPT_TEMPLATE.format(transcript=transcript)}
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )

        raw_content = completion.choices[0].message.content
        cleaned_json = clean_json_string(raw_content)
        parsed = json.loads(cleaned_json)

        # Fallback defaults for missing keys
        return {
            "summary": parsed.get("summary", transcript),
            "category": parsed.get("category", "General Grievance"),
            "department_name": parsed.get("department_name", "General Administration"),
            "urgency": parsed.get("urgency", "Medium"),
            "sentiment": parsed.get("sentiment", "Neutral"),
            "sentiment_score": float(parsed.get("sentiment_score", 50.0)),
            "is_suspicious": bool(parsed.get("is_suspicious", False)),
            "suspicious_reason": parsed.get("suspicious_reason", None),
            "location_extracted": parsed.get("location_extracted", None)
        }

    except Exception as e:
        print(f"[LLM ERROR] Groq extraction encountered an error: {e}")
        # Graceful fallback so caller pipeline never breaks
        return {
            "summary": transcript[:150] if transcript else "Citizen grievance received.",
            "category": "General Grievance",
            "department_name": "General Administration",
            "urgency": "Medium",
            "sentiment": "Neutral",
            "sentiment_score": 50.0,
            "is_suspicious": False,
            "suspicious_reason": None,
            "location_extracted": None
        }