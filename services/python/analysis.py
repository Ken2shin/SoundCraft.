"""Análisis espectral de audio con librosa (mono, primeros 60 s)."""
import io

import numpy as np
import librosa

# Bandas de frecuencia del ecualizador de 3 bandas (Hz)
BANDS = [
    ("low", 20.0, 250.0),
    ("mid", 250.0, 4000.0),
    ("high", 4000.0, 20000.0),
]

DEFAULT_SR = 22050
MAX_SECONDS = 60.0


def analyze(audio_bytes: bytes, sample_rate: int = DEFAULT_SR,
            max_seconds: float = MAX_SECONDS):
    """Decodifica el audio y extrae métricas espectrales agregadas (media).

    Devuelve un dict JSON-serializable listo para consumir por la API Next.js
    y por el modelo de lenguaje para generar sugerencias de EQ.
    """
    if not audio_bytes:
        raise ValueError("El archivo de audio está vacío.")

    y, sr = librosa.load(io.BytesIO(audio_bytes), sr=sample_rate, mono=True)
    if y.size == 0:
        raise ValueError("El archivo está vacío o no se pudo decodificar.")

    if y.shape[0] > int(max_seconds * sr):
        y = y[: int(max_seconds * sr)]

    duration = float(len(y) / sr)

    centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
    rolloff = float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr, roll_percent=0.85)))
    rms = float(np.mean(librosa.feature.rms(y=y)))
    zcr = float(np.mean(librosa.feature.zero_crossing_rate(y=y)))

    stft = np.abs(librosa.stft(y=y))
    freqs = librosa.fft_frequencies(sr=sr)

    band_energy = {}
    for name, lo, hi in BANDS:
        mask = (freqs >= lo) & (freqs <= hi)
        band_energy[name] = float(np.mean(stft[mask])) if mask.any() else 0.0

    dominant_band = max(band_energy, key=band_energy.get)

    return {
        "duration": round(duration, 3),
        "sample_rate": sr,
        "spectral_centroid": round(centroid, 1),
        "spectral_rolloff": round(rolloff, 1),
        "rms": rms,
        "zero_crossing_rate": zcr,
        "band_energy_low": band_energy["low"],
        "band_energy_mid": band_energy["mid"],
        "band_energy_high": band_energy["high"],
        "dominant_band": dominant_band,
        "note": "Análisis mono de los primeros 60 segundos a 22.05 kHz.",
    }