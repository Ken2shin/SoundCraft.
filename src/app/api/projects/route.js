import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth";
import {
  countProjects,
  createProject,
  ensureUser,
  listProjects,
} from "@/lib/db/repo";
import { rateLimit } from "@/lib/rate-limit";
import { projectLimitFor } from "@/lib/plans";

export async function GET(request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  try {
    const user = await ensureUser(session);
    const projects = await listProjects(user.id);
    return NextResponse.json({ projects });
  } catch (err) {
    console.error("[api/projects] GET", err.message);
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const rl = rateLimit({ key: `projects:${session.uid}`, limit: 20, windowMs: 60_000 });
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

  const title = String(body?.title || "").trim().slice(0, 80);
  if (!title) {
    return NextResponse.json(
      { error: "El título es obligatorio" },
      { status: 400 }
    );
  }
  const description = body?.description
    ? String(body.description).trim().slice(0, 300)
    : null;

  try {
    const user = await ensureUser(session);
    console.log("[api/projects] POST user:", user.id, user.plan);
    const n = await countProjects(user.id);
    const limit = projectLimitFor(user.plan);
    console.log("[api/projects] count:", n, "limit:", limit, "plan:", user.plan);
    if (n >= limit) {
      const planName =
        user.plan === "estudio" ? "Estudio" : user.plan === "pro" ? "Pro" : "Free";
      return NextResponse.json(
        {
          error: `Límite del plan ${planName} alcanzado (${limit} proyectos). Actualízate a Estudio o Pro.`,
          code: "PLAN_LIMIT",
        },
        { status: 402 }
      );
    }
    const project = await createProject(user.id, { title, description });
    console.log("[api/projects] created project:", project.id);
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    console.error("[api/projects] POST error:", err.message);
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}