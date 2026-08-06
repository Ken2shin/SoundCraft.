import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth";
import {
  ensureUser,
  getModuleUsage,
  getProjectByIdAndUser,
  incrementModuleUsage,
  saveChordGeneration,
} from "@/lib/db/repo";
import { rateLimit } from "@/lib/rate-limit";
import { moduleTier } from "@/lib/plans";
import { generateContent } from "@/lib/ai/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAILY_LIMIT = { free: 0, estudio: 3, pro: 20, enterprise: Infinity };

export async function POST(request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const projectId = String(body?.projectId || "").trim();
  const keyName = String(body?.key || "Do mayor").slice(0, 40);
  const mood = String(body?.mood || "predeterminada").slice(0, 60);

  if (!projectId) {
    return NextResponse.json({ error: "Falta projectId" }, { status: 400 });
  }

  const user = await ensureUser(session);
  const tier = moduleTier(user.plan, "chords");
  if (tier < 1) {
    return NextResponse.json(
      {
        error: "El generador de acordes es exclusivo de Estudio y Pro. Mejora tu plan desde /planes.",
        code: "PLAN_REQUIRED",
      },
      { status: 402 }
    );
  }

  const rl = rateLimit({ key: `chords:${session.uid}`, limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Demasiadas peticiones. Espera ${rl.retryAfter}s` },
      { status: 429 }
    );
  }

  try {
    const dailyLimit = DAILY_LIMIT[user.plan] ?? 0;
    const used = await getModuleUsage(user.id, "chords");
    if (used >= dailyLimit) {
      return NextResponse.json(
        {
          error: `Llegaste al límite diario de generaciones (${dailyLimit}). Vuelve mañana o mejora tu plan.`,
          code: "QUOTA_REACHED",
        },
        { status: 429 }
      );
    }

    const project = await getProjectByIdAndUser(projectId, user.id);
    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const prompt = [
      "Eres un productor musical experto. Genera una progresión de acordes para una canción.",
      `Tonalidad: ${keyName}.`,
      `Vibe / mood: ${mood}.`,
      "Responde SOLO JSON válido con este formato exacto:",
      '{"chords": ["C", "G", "Am", "F"], "description": "una frase breve en español explicando la progresión"}',
      "Devuelve únicamente el JSON, sin adornos ni markdown.",
    ].join("\n");

    const raw = await generateContent(prompt);
    const parsed = JSON.parse(raw.replace(/```json|```|```/g, "").trim());
    const chords = Array.isArray(parsed.chords) ? parsed.chords.slice(0, 12) : [];
    if (!chords.length) throw new Error("Respuesta IA sin acordes");

    const model = process.env.GEMINI_MODEL || "gemma-4-31b-it";
    await saveChordGeneration({
      dbUserId: user.id,
      projectId,
      keyName,
      mood,
      chords,
      model,
    });
    await incrementModuleUsage(user.id, "chords");

    return NextResponse.json({ chords, description: parsed.description || "", model });
  } catch (err) {
    console.error("[api/ai/chords]", err.message);
    return NextResponse.json({ error: "No se pudo generar la progresión." }, { status: 500 });
  }
}