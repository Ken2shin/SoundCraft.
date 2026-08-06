import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth";
import {
  ensureUser,
  getProjectByIdAndUser,
  saveSuggestions,
} from "@/lib/db/repo";
import { rateLimit } from "@/lib/rate-limit";
import { suggestEQ } from "@/lib/ai/gemini";
import { canUseAI } from "@/lib/plans";

export async function POST(request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const user = await ensureUser(session);
  if (!canUseAI(user.plan)) {
    return NextResponse.json(
      {
        error: "El asistente de IA es exclusivo de Estudio y Pro. Mejora tu plan desde /planes.",
        code: "PLAN_REQUIRED",
      },
      { status: 402 }
    );
  }

  const rl = rateLimit({ key: `suggest:${session.uid}`, limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Demasiadas peticiones. Espera ${rl.retryAfter}s` },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const projectId = String(body?.projectId || "").trim();
  const instrument = String(body?.instrument || "Flat").slice(0, 40);
  const metrics = body?.metrics && typeof body.metrics === "object" ? body.metrics : null;

  if (!projectId || !metrics) {
    return NextResponse.json(
      { error: "Faltan projectId o metrics" },
      { status: 400 }
    );
  }

  try {
    const project = await getProjectByIdAndUser(projectId, user.id);
    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const suggestions = await suggestEQ(metrics, instrument);
    const model = process.env.GEMINI_MODEL || "gemma-4-31b-it";
    await saveSuggestions({ projectId, dbUserId: user.id, suggestions, model });

    return NextResponse.json({ suggestions, model });
  } catch (err) {
    console.error("[api/ai/suggest]", err.message);
    return NextResponse.json({ error: "Error al generar sugerencias" }, { status: 500 });
  }
}