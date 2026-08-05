import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth";
import { ensureUser, getProjectByIdAndUser, insertAnalysis } from "@/lib/db/repo";
import { rateLimit } from "@/lib/rate-limit";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_MIME = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/x-m4a",
  "audio/mp4",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
]);

export async function POST(request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const rl = rateLimit({ key: `analyze:${session.uid}`, limit: 5, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Límite de análisis alcanzado. Espera ${rl.retryAfter}s` },
      { status: 429 }
    );
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });
  }

  const audio = form.get("audio");
  const projectId = String(form.get("projectId") || "").trim();

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo de audio" }, { status: 400 });
  }
  if (!projectId) {
    return NextResponse.json({ error: "Falta el projectId" }, { status: 400 });
  }

  const type = audio.type.toLowerCase();
  if (!ACCEPTED_MIME.has(type)) {
    return NextResponse.json(
      { error: "Formato no soportado. Usa MP3, WAV, AAC, M4A, OGG o FLAC." },
      { status: 415 }
    );
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "El archivo supera el límite de 10 MB" },
      { status: 413 }
    );
  }

  const pythonUrl = process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8000";

  try {
    const user = await ensureUser(session);
    const project = await getProjectByIdAndUser(projectId, user.id);
    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const forward = new FormData();
    forward.append("file", new Blob([await audio.arrayBuffer()], { type }), audio.name || "audio");

    const upstream = await fetch(`${pythonUrl}/analyze`, {
      method: "POST",
      body: forward,
      signal: AbortSignal.timeout(60_000),
    });

    if (!upstream.ok) {
      let detail = "El servicio de análisis no respondió";
      try {
        const err = await upstream.json();
        detail = err.detail || detail;
      } catch {}
      return NextResponse.json({ error: detail }, { status: 502 });
    }

    const metrics = await upstream.json();
    const analysis = await insertAnalysis({
      dbUserId: user.id,
      projectId,
      metrics,
      model: "librosa",
    });

    return NextResponse.json({ analysisId: analysis.id, metrics });
  } catch (err) {
    console.error("[api/analyze]", err.message);
    return NextResponse.json({ error: "Error al analizar el audio" }, { status: 500 });
  }
}