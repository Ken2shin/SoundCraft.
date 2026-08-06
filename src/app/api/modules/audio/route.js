import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth";
import {
  ensureUser,
  getModuleUsage,
  getProjectByIdAndUser,
  incrementModuleUsage,
  savePitchAnalysis,
  saveStemExport,
  saveReferenceAnalysis,
  saveMaster,
  saveConversion,
  saveTempoDetection,
} from "@/lib/db/repo";
import { moduleTier } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HANDLERS = {
  both: null,
  pitch: savePitchAnalysis,
  stems: saveStemExport,
  reference: saveReferenceAnalysis,
  master: saveMaster,
  conversion: saveConversion,
  tempo: saveTempoDetection,
};

// Límite diario según módulo (0 = infinito). Enterprise sin límite.
const DAILY_LIMITS = {
  pitch: { free: 0, estudio: 10, pro: 50, enterprise: Infinity },
  stems: { free: 0, estudio: 2, pro: 20, enterprise: Infinity },
  reference: { free: 0, estudio: 5, pro: 30, enterprise: Infinity },
  master: { free: 0, estudio: 2, pro: 15, enterprise: Infinity },
  conversion: { free: 0, estudio: 5, pro: 25, enterprise: Infinity },
  tempo: { free: 5, estudio: 10, pro: 30, enterprise: Infinity },
};

function numeric(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

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

  const kind = String(body?.kind || "");
  const projectId = String(body?.projectId || "");
  if (!projectId || !(kind in HANDLERS) || kind === "both") {
    return NextResponse.json({ error: "Tipo de módulo o proyecto inválido" }, { status: 400 });
  }

  const user = await ensureUser(session);
  const tier = moduleTier(user.plan, kind);
  if (tier < 1) {
    return NextResponse.json(
      {
        error: "Este módulo es exclusivo de Estudio y Pro. Mejora tu plan desde /planes.",
        code: "PLAN_REQUIRED",
      },
      { status: 402 }
    );
  }

  // Quota diaria
  const dailyLimit = DAILY_LIMITS[kind]?.[user.plan] ?? 0;
  if (dailyLimit !== Infinity && dailyLimit > 0) {
    const used = await getModuleUsage(user.id, kind);
    if (used >= dailyLimit) {
      return NextResponse.json(
        {
          error: `Llegaste al límite diario de este módulo (${dailyLimit}). Vuelve mañana o mejora tu plan.`,
          code: "QUOTA_REACHED",
        },
        { status: 429 }
      );
    }
    await incrementModuleUsage(user.id, kind);
  }

  try {
    const project = await getProjectByIdAndUser(projectId, user.id);
    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    let saved;
    switch (kind) {
      case "pitch":
        saved = await savePitchAnalysis({
          dbUserId: user.id,
          projectId,
          note: String(body?.note || "?").slice(0, 12),
          cents: numeric(body?.cents),
          correctionCents: numeric(body?.correctionCents),
          tStart: body?.tStart == null ? null : numeric(body.tStart),
          tEnd: body?.tEnd == null ? null : numeric(body.tEnd),
        });
        break;
      case "stems": {
        saved = await saveStemExport({
          dbUserId: user.id,
          projectId,
          stemType: String(body?.stemType || "full").slice(0, 20),
          filterLow: body?.filterLow == null ? null : numeric(body.filterLow),
          filterHigh: body?.filterHigh == null ? null : numeric(body.filterHigh),
          sampleRate: body?.sampleRate == null ? null : Math.round(numeric(body.sampleRate)),
        });
        break;
      }
      case "reference":
        saved = await saveReferenceAnalysis({
          dbUserId: user.id,
          projectId,
          referenceName: String(body?.referenceName || "referencia").slice(0, 80),
          metrics: body?.metrics || {},
        });
        break;
      case "master":
        saved = await saveMaster({
          dbUserId: user.id,
          projectId,
          targetLufs: numeric(body?.targetLufs),
          measuredLufs: numeric(body?.measuredLufs),
          gainDb: numeric(body?.gainDb),
          sampleRate: body?.sampleRate == null ? 44100 : Math.round(numeric(body.sampleRate)),
        });
        break;
      case "conversion":
        saved = await saveConversion({
          dbUserId: user.id,
          projectId,
          sourceFormat: String(body?.sourceFormat || "wav").slice(0, 10),
          targetFormat: String(body?.targetFormat || "wav").slice(0, 10),
          bitDepth: body?.bitDepth == null ? null : Math.round(numeric(body.bitDepth)),
          sampleRate: body?.sampleRate == null ? null : Math.round(numeric(body.sampleRate)),
          channels: body?.channels == null ? null : Math.round(numeric(body.channels)),
        });
        break;
      case "tempo":
        saved = await saveTempoDetection({
          dbUserId: user.id,
          projectId,
          bpm: body?.bpm == null ? null : Math.round(numeric(body.bpm)),
          keyName: String(body?.keyName || "").slice(0, 20) || null,
          source: String(body?.source || "tap").slice(0, 10),
        });
        break;
      default:
        return NextResponse.json({ error: "Módulo no soportado" }, { status: 400 });
    }

    return NextResponse.json({ id: saved?.id || null });
  } catch (err) {
    console.error("[api/modules/audio]", err.message);
    return NextResponse.json({ error: "No se pudo guardar el resultado" }, { status: 500 });
  }
}