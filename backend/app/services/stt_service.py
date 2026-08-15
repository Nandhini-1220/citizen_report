import os
import tempfile
from faster_whisper import WhisperModel

_stt_model = None

def get_stt_model():
    """
    Lazy-loads faster-whisper base model in INT8 quantization for fast, lightweight CPU inference.
    """
    global _stt_model
    if _stt_model is None:
        print("[STT] Loading faster-whisper (base model, CPU int8)...")
        _stt_model = WhisperModel("base", device="cpu", compute_type="int8")
        print("[STT] Model loaded successfully.")
    return _stt_model

def transcribe_and_translate_audio(audio_path: str) -> dict:
    """
    Transcribes and auto-translates spoken audio from any language to clean English.
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found at: {audio_path}")

    model = get_stt_model()
    
    # task="translate" translates any spoken language directly into English
    segments, info = model.transcribe(
        audio_path,
        task="translate",
        beam_size=5,
        vad_filter=True, # Filters out background silence/noise
        vad_parameters=dict(min_silence_duration_ms=500)
    )

    translated_text = " ".join([seg.text.strip() for seg in segments]).strip()

    return {
        "detected_language": info.language,
        "language_probability": round(info.language_probability, 3),
        "duration_seconds": round(info.duration, 2),
        "translated_text": translated_text if translated_text else "Audio recording was silent or unclear."
    }