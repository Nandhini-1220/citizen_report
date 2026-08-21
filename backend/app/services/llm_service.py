import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

VALID_DEPARTMENTS = [
    "Water Supply",
    "Road Maintenance",
    "Gas & Energy",
    "Sanitation",
    "Electricity Board",
    "Public Safety"
]

CIVIC_CATEGORIES = [
    "Pothole / Road Damage",
    "Water Leakage / Contamination",
    "Garbage / Sewage Overflow",
    "Streetlight / Power Outage",
    "Gas Leakage / Pipeline Fault",
    "Traffic Hazard / Public Safety"
]

def extract_complaint_intelligence(transcript: str) -> dict:
    """
    Evaluates citizen audio transcript.
    Strictly filters out non-civic issues, random chatter, greetings, or tech issues.
    """
    if not transcript or len(transcript.strip()) < 8:
        return {
            "is_civic_complaint": False,
            "rejection_reason": "Audio transcript is too short or silent.",
            "category": "Invalid",
            "department_name": "None",
            "summary": "",
            "urgency": "Low",
            "location_extracted": "",
            "sentiment": "Neutral",
            "sentiment_score": 0.0,
            "is_suspicious": True,
            "suspicious_reason": "Inaudible or insufficient voice input."
        }

    system_prompt = f"""
You are an expert AI Municipal Grievance Triage Officer.
Your job is to analyze transcripts from citizen voice calls and determine if they describe a REAL civic/municipal issue.

MUNICIPAL DOMAINS ONLY:
- Roads, potholes, pavements
- Drainage, sewage, garbage disposal, sanitation
- Streetlights, power cuts, exposed electrical wires
- Drinking water supply, pipeline leaks, water contamination
- Public safety, fallen trees, traffic obstruction

NON-CIVIC / INVALID TOPICS:
- Personal computer, laptop, software, or phone errors
- Casual greetings, apologies ("I'm sorry", "hello", "thank you")
- Private domestic disputes, business inquiries, unrelated noise

Return ONLY a raw JSON object with these exact keys:
{{
  "is_civic_complaint": true | false,
  "rejection_reason": "Explanation if not a valid civic complaint, else null",
  "category": "One of {CIVIC_CATEGORIES} or 'General Issue'",
  "department_name": "One of {VALID_DEPARTMENTS}",
  "summary": "Clear, concise 1-2 sentence description of the civic problem",
  "location_extracted": "Street, area, or landmark mentioned, or null",
  "urgency": "Low" | "Medium" | "High" | "Emergency",
  "sentiment": "Angry" | "Frustrated" | "Neutral" | "Polite",
  "sentiment_score": -1.0 to 1.0,
  "is_suspicious": false,
  "suspicious_reason": null
}}
"""

    try:
        chat_completion = client.chat.completions.create(
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Citizen Voice Transcript:\n\"\"\"{transcript}\"\"\""}
    ],
    model="openai/gpt-oss-20b",
    temperature=0.1,
    response_format={"type": "json_object"}
)

        content = chat_completion.choices[0].message.content
        return json.loads(content)

    except Exception as e:
        print(f"[LLM Error] Fallback extraction triggered: {e}")
        return {
            "is_civic_complaint": False,
            "rejection_reason": "Failed to extract valid municipal grievance.",
            "category": "General Issue",
            "department_name": "Water Supply",
            "summary": transcript,
            "urgency": "Medium",
            "location_extracted": None,
            "sentiment": "Neutral",
            "sentiment_score": 0.0,
            "is_suspicious": False,
            "suspicious_reason": None
        }