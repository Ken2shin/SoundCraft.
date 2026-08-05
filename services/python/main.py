"""
SoundCraft AI - Analizador de audio (FastAPI + librosa).

Levantar el servicio:
    cd services/python
    pip install -r requirements.txt
    uvicorn main:app --host 0.0.0.0 --port 8000

Docs interactivas: http://127.0.0.1:8000/docs
"""
import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

import analysis

MAX_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)

app = FastAPI(
    title="SoundCraft AI Analyst",
    description="Análisis espectral de audio con librosa.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS.split(",") if o.strip()],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=False,
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "soundcraft-ai-analyst"}


@app.post("/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    content_type = (file.content_type or "").lower()
    filename = (file.filename or "").lower()

    if not content_type.startswith("audio/"):
        if not filename.endswith((".wav", ".mp3", ".m4a", ".aac", ".ogg", ".flac")):
            raise HTTPException(
                status_code=400,
                detail="El archivo debe ser de audio (MP3, WAV, M4A, AAC, OGG o FLAC).",
            )

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="El archivo supera los 10 MB.")
    if not data:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    try:
        metrics = analysis.analyze(data)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:  # noqa: BLE001 - error de dims/formato del decodificador
        raise HTTPException(status_code=422, detail=f"No se pudo analizar el audio: {exc}")

    return metrics