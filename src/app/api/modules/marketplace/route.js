import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth";
import {
  createMarketplaceRequest,
  ensureUser,
  getProjectByIdAndUser,
  listMarketplaceRequests,
} from "@/lib/db/repo";
import { moduleTier } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const user = await ensureUser(session);
    const requests = await listMarketplaceRequests(user.id);
    return NextResponse.json({ requests });
  } catch (err) {
    console.error("[api/modules/marketplace] GET", err.message);
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const user = await ensureUser(session);
  if (moduleTier(user.plan, "marketplace") < 1) {
    return NextResponse.json(
      {
        error: "El Marketplace es exclusivo de Estudio y Pro. Mejora tu plan desde /planes.",
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
  const service = ["mixing", "mastering", "both"].includes(body?.service)
    ? body.service
    : "both";
  const trackTitle = String(body?.trackTitle || "Proyecto sin título").slice(0, 120);
  const durationMin = Math.min(30, Math.max(1, Number(body?.durationMin) || 3));
  const estimatedBudget = Math.min(100000, Math.max(0, Number(body?.estimatedBudget) || 0));
  const notes = String(body?.notes || "").slice(0, 500);

  try {
    const project = projectId
      ? await getProjectByIdAndUser(projectId, user.id)
      : null;
    if (projectId && !project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }
    const requestRecord = await createMarketplaceRequest({
      dbUserId: user.id,
      projectId: project?.id || null,
      trackTitle,
      service,
      durationMin,
      estimatedBudget,
      notes,
    });
    return NextResponse.json({ request: requestRecord }, { status: 201 });
  } catch (err) {
    console.error("[api/modules/marketplace] POST", err.message);
    return NextResponse.json({ error: "No se pudo crear la solicitud" }, { status: 500 });
  }
}