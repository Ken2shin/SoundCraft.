import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth";
import {
  deleteProject,
  ensureUser,
  getProjectByIdAndUser,
  updateProject,
} from "@/lib/db/repo";

export async function GET(request, { params }) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const user = await ensureUser(session);
    const project = await getProjectByIdAndUser(id, user.id);
    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (err) {
    console.error("[api/projects/:id] GET", err.message);
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // Whitelist estricta de campos
  const fields = {};
  if (typeof body.title === "string") {
    fields.title = body.title.trim().slice(0, 80);
    if (!fields.title) delete fields.title;
  }
  if (body.description !== undefined) {
    fields.description = String(body.description).trim().slice(0, 300) || null;
  }
  if (typeof body.audio_name === "string") {
    fields.audio_name = body.audio_name.trim().slice(0, 255) || null;
  }
  if (typeof body.audio_duration_ms === "number") {
    fields.audio_duration_ms = Math.max(0, Math.round(body.audio_duration_ms));
  }
  if (body.eq_state && typeof body.eq_state === "object") {
    const { low, mid, high, presetKey } = body.eq_state;
    const clamp = (v) =>
      Math.max(-12, Math.min(12, Math.round((Number(v) || 0) * 2) / 2));
    fields.eq_state = {
      low: clamp(low),
      mid: clamp(mid),
      high: clamp(high),
      presetKey: ["Flat", "Bateria", "Bajo", "Guitarra", "Voz"].includes(presetKey)
        ? presetKey
        : "Flat",
    };
  }
  if (typeof body.status === "string" && ["draft", "analyzed", "exported"].includes(body.status)) {
    fields.status = body.status;
  }

  try {
    const user = await ensureUser(session);
    const project = await updateProject(user.id, id, fields);
    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (err) {
    console.error("[api/projects/:id] PATCH", err.message);
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const user = await ensureUser(session);
    const deleted = await deleteProject(user.id, id);
    if (!deleted) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/projects/:id] DELETE", err.message);
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}