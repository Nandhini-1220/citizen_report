import os
from faster_whisper import WhisperModel

# Use 'base' or 'small' for better multilingual accuracy (base is recommended for speed + accuracy)
MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")

# Load model once on CPU / CUDA
whisper_model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")

def transcribe_and_translate_audio(audio_path: str) -> dict:
    """
    Transcribes audio in regional languages (Tamil, Hindi, Telugu, English)
    and translates it directly into structured English text.
    """
    # Context prompt helps Whisper understand civic vocabulary and Indian accents
    initial_prompt = "Municipal corporation grievance regarding water leakage, potholes, drainage, streetlights, garbage, power cut, Chennai, Tamil Nadu."

    segments, info = whisper_model.transcribe(
        audio_path,
        task="translate",       # Automatically translates Tamil/Hindi/Telugu to English
        initial_prompt=initial_prompt,
        beam_size=5,            # Higher beam size prevents hallucination
        vad_filter=True,        # Strips background silence & mic breathing noise
        vad_parameters=dict(min_silence_duration_ms=500)
    )

    full_text = " ".join([segment.text for segment in segments]).strip()

    return {
        "detected_language": info.language,
        "language_probability": info.language_probability,
        "translated_text": full_text
    }