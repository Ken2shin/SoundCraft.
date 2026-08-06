import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth";
import {
  ensureUser,
  getChallengeProgress,
  getTotalXp,
  markChallengeComplete,
} from "@/lib/db/repo";
import { moduleTier } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Retos rotativos por día de la semana (índice 0 = lunes).
const RETOS = [
  { key: "eq-clean-graves", title: "EQ limpio en graves", desc: "Reduce 4 dB en graves (20-400 Hz) y escucha cómo se despeja la mezcla con el preset Flat.", xp: 100 },
  { key: "voz-presencia", title: "Presencia vocal", desc: "Aplica el preset de Voz y realza +3 dB en medios. Aísla la voz con la herramienta de solo.", xp: 100 },
  { key: "bateria-pegada", title: "Batería con pegada", desc: "Usa el preset de Batería y prueba 2 ajustes de EQ3 mirando el espectro.", xp: 100 },
  { key: "bajo-controlado", title: "Control de bajo", desc: "Escucha solo el bajo con el filtro de frecuencia y escribe qué rango domina.", xp: 100 },
  { key: "balance-3-bandas", title: "Tu primer balance", desc: "En Flat, empieza cortando aros y subiendo algo complejo hasta que suene equilibrado.", xp: 100 },
  { key: "metrica-rel", title: "Compara con referencia", desc: "Sube una referencia (A/B Reference) y compara tu espectro con el de tu pista.", xp: 100 },
  { key: "ssnapshot-master", title: "Prueba Instant Master", desc: "Normaliza tu mezcla a -14 LUFS y exporta tu mejora como WAV.", xp: 100 },
];

function todaysChallenges(date) {
  const day = (date.getUTCDay() + 6) % 7; // 0 = lunes
  // Ofrecemos 2 retos por día: el del día y uno rotativo extra.
  const primary = RETOS[day % RETOS.length];
  const secondary = RETOS[(day + 3) % RETOS.length];
  return [primary, secondary].map((r, i) => ({ ...r, challengeKey: `${r.key}-${date.toISOString().slice(0, 10)}-${i}` }));
}

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const user = await ensureUser(session);
    const today = new Date();
    const challenges = todaysChallenges(today).map((c) => ({
      challengeKey: c.challengeKey,
      title: c.title,
      desc: c.desc,
      xp: c.xp,
    }));
    const progress = await getChallengeProgress(user.id);
    const totalXp = await getTotalXp(user.id);
    const doneKeys = new Set(progress.filter((p) => p.completed).map((p) => p.challenge_key));
    return NextResponse.json({
      date: isoDay(today),
      challenges: challenges.map((c) => ({ ...c, completed: doneKeys.has(c.challengeKey) })),
      totalXp,
    });
  } catch (err) {
    console.error("[api/modules/challenges] GET", err.message);
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
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

  const user = await ensureUser(session);
  if (moduleTier(user.plan, "challenges") < 1) {
    return NextResponse.json(
      { error: "Los retos están disponibles en todos los planes." },
      { status: 200 }
    );
  }

  const today = new Date();
  const challenges = todaysChallenges(today).map((c) => c.challengeKey);
  const requestedKey = String(body?.challengeKey || "");
  if (!challenges.includes(requestedKey)) {
    return NextResponse.json({ error: "Reto inválido para hoy" }, { status: 400 });
  }

  try {
    const challenge = todaysChallenges(today).find((c) => c.challengeKey === requestedKey);
    await markChallengeComplete(user.id, isoDay(today), challenge.challengeKey, challenge.xp);
    const progress = await getChallengeProgress(user.id);
    const totalXp = await getTotalXp(user.id);
    return NextResponse.json({ done: true, totalXp, progress });
  } catch (err) {
    console.error("[api/modules/challenges]", err.message);
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}