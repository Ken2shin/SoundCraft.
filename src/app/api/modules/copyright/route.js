import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth";
import {
  ensureUser,
  getCopyrightMetadata,
  getProjectByIdAndUser,
  saveCopyrightMetadata,
} from "@/lib/db/repo";
import { moduleTier } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "Falta projectId" }, { status: 400 });
  }

  try {
    const user = await ensureUser(session);
    const project = await getProjectByIdAndUser(projectId, user.id);
    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }
    const data = await getCopyrightMetadata(user.id, projectId);
    return NextResponse.json({ metadata: data });
  } catch (err) {
    console.error("[api/modules/copyright] GET", err.message);
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const user = await ensureUser(session);
  if (moduleTier(user.plan, "copyright") < 1) {
    return NextResponse.json(
      {
        error: "El registro de autoría es exclusivo de Estudio y Pro. Mejora tu plan desde /planes.",
        code: "PLAN_REQUIRED",
      },
      { status: 402 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const projectId = String(body?.projectId || "").trim();
  const audioHash = String(body?.audioHash || "").slice(0, 128);
  if (!projectId || !audioHash) {
    return NextResponse.json({ error: "Faltan projectId o audioHash" }, { status: 400 });
  }

  const fields = {
    title: String(body?.title || "").slice(0, 120),
    artist: String(body?.artist || "").slice(0, 120),
    album: String(body?.album || "").slice(0, 120),
    year: Number(body?.year) || null,
    isrc: String(body?.isrc || "").slice(0, 20),
    upc: String(body?.upc || "").slice(0, 20),
    genre: String(body?.genre || "").slice(0, 60),
    notes: String(body?.notes || "").slice(0, 500),
  };

  try {
    const project = await getProjectByIdAndUser(projectId, user.id);
    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }
    const saved = await saveCopyrightMetadata({ dbUserId: user.id, projectId, fields, audioHash });
    return NextResponse.json({ id: saved.id });
  } catch (err) {
    console.error("[api/modules/copyright] POST", err.message);
    return NextResponse.json({ error: "No se pudo guardar el registro" }, { status: 500 });
  }
}