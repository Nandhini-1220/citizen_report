import os
import json
from dotenv import load_dotenv
from groq import Groq

# Explicitly load .env from the backend root folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(BASE_DIR, ".env"))

_client = None

def get_groq_client():
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError(
                "GROQ_API_KEY environment variable is missing. "
                "Please add GROQ_API_KEY=your_key to backend/.env"
            )
        _client = Groq(api_key=api_key)
    return _client

EXTRACTION_PROMPT = """
You are the central intelligence brain for a municipal citizen call center.
Analyze the following citizen transcript and extract structured parameters in strictly valid JSON without formatting or backticks.

Transcript:
\"\"\"{transcript}\"\"\"

Output JSON Format:
{{
  "summary": "2 concise sentences explaining the problem clearly",
  "category": "Pothole / Road Maintenance | Water Leakage / Supply | Gas Hazard / Pipeline | Sewage / Waste Management | Electricity / Power Outage | Public Safety / Police",
  "department_name": "Road Maintenance | Water Supply | Gas & Energy | Sanitation | Electricity Board | Public Safety",
  "urgency": "Low | Medium | High | Emergency",
  "sentiment": "Positive | Neutral | Negative",
  "sentiment_score": 50.0,
  "is_suspicious": false,
  "suspicious_reason": null,
  "location_extracted": "Street, landmark, or sector name mentioned in text"
}}
"""

def extract_complaint_intelligence(transcript: str) -> dict:
    client = get_groq_client()
    completion = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": "You are a precise JSON extraction engine. Return only JSON."},
            {"role": "user", "content": EXTRACTION_PROMPT.format(transcript=transcript)}
        ],
        temperature=0.1,
        response_format={"type": "json_object"}
    )
    return json.loads(completion.choices[0].message.content)