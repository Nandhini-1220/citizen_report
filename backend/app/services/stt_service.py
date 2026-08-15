import os
from faster_whisper import WhisperModel

# Initialize lightweight base model on CPU with INT8 quantization
_stt_model = None

def get_stt_model():
    global _stt_model
    if _stt_model is None:
        _stt_model = WhisperModel("base", device="cpu", compute_type="int8")
    return _stt_model

def transcribe_and_translate_audio(file_path: str) -> dict:
    model = get_stt_model()
    # task="translate" auto-detects input language and outputs clean English
    segments, info = model.transcribe(file_path, task="translate", beam_size=5)
    translated_text = " ".join([seg.text.strip() for seg in segments])
    return {
        "language": info.language,
        "language_probability": info.language_probability,
        "translated_text": translated_text
    }