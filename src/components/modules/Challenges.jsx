"use client";
import { useState, useEffect, useCallback } from "react";
import { X, Trophy, Zap, Loader2, CheckCircle2, Clock, Target } from "lucide-react";
import { saveAudioModule } from "@/lib/api/modules";

const CHALLENGES = [
  { id: "eq-graves", title: "Limpia los graves", desc: "Corta 4 dB a 100 Hz con el EQ3 y escucha cómo se despeja la mezcla.", xp: 100 },
  { id: "voz-presencia", title: "Presencia vocal", desc: "Aplica el preset Voz y sube +3 dB en medios. Aísla la voz con el modo solo.", xp: 100 },
  { id: "bateria-pegada", title: "Batería con pegada", desc: "Usa el preset Batería y prueba 2 ajustes mirando el espectro.", xp: 100 },
  { id: "bajo-control", title: "Control de bajo", desc: "Escucha solo el bajo (filtro 40-250 Hz) y anota su rango dominante.", xp: 100 },
  { id: "balance-inicial", title: "Tu primer balance", desc: "En Flat, ecualiza hasta que la mezcla suene equilibrada sin picos.", xp: 100 },
  { id: "ref-match", title: "Match de referencia", desc: "Sube una referencia y compara tu espectro con el de ella (A/B).", xp: 100 },
  { id: "master-14", title: "Master a -14 LUFS", desc: "Normaliza tu mezcla a -14 LUFS y exporta el WAV.", xp: 100 },
  { id: "pitch-corr", title: "Corrige una nota", desc: "Usa Auto-Pitch, detecta una desviación y aplica 50% de corrección.", xp: 100 },
];

function todaysChallenges(date) {
  const day = date.getUTCDay(); // 0 = Sun
  const idx1 = day % CHALLENGES.length;
  const idx2 = (day + 3) % CHALLENGES.length;
  const base = date.toISOString().slice(0, 10);
  return [
    { ...CHALLENGES[idx1], challengeKey: `${CHALLENGES[idx1].id}-${base}-0` },
    { ...CHALLENGES[idx2], challengeKey: `${CHALLENGES[idx2].id}-${base}-1` },
  ];
}

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

export default function Challenges({ plan, projectId, onClose }) {
  const [todayChallenges, setTodayChallenges] = useState([]);
  const [progress, setProgress] = useState([]);
  const [totalXp, setTotalXp] = useState(0);
  const [completing, setCompleting] = useState(null);

  const load = useCallback(async () => {
    const today = new Date();
    setTodayChallenges(todaysChallenges(today));
    try {
      const res = await fetch("/api/modules/challenges");
      const json = await res.json();
      if (res.ok) {
        setProgress(json.progress || []);
        setTotalXp(json.totalXp || 0);
      }
    } catch (e) {
      console.error("[Challenges] load", e);
    }
  }, []);

  const complete = useCallback(async (challenge) => {
    setCompleting(challenge.challengeKey);
    try {
      await saveAudioModule({
        kind: "challenges",
        projectId,
        challengeKey: challenge.challengeKey,
        xp: challenge.xp,
      });
      setProgress((prev) => [...prev, { challenge_date: isoDay(new Date()), challenge_key: challenge.challengeKey, completed: true, xp: challenge.xp }]);
      setTotalXp((p) => p + challenge.xp);
    } catch (e) {
      console.error("[Challenges] complete", e);
    } finally {
      setCompleting(null);
    }
  }, [projectId]);

  const doneKeys = new Set(progress.filter((p) => p.completed).map((p) => p.challenge_key));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold text-stone-100">Retos diarios</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-600">
            <Zap className="h-3 w-3" /> {totalXp} XP
          </span>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200">✕</button>
        </div>
      </div>

      <p className="text-xs text-stone-500">
        Completa retos de producción diarios para ganar XP, mejorar tu técnica y desbloquear logros.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {todayChallenges.map((c) => {
          const done = doneKeys.has(c.challengeKey);
          const pending = completing === c.challengeKey;
          return (
            <div key={c.challengeKey} className={`rounded-xl border p-4 transition-all ${done ? "border-emerald-400/30 bg-emerald-500/5" : "border-[#3c3c3c]/10 bg-white/5 hover:border-indigo-400/30"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                      <Target className="h-2.5 w-2.5" /> Reto
                    </span>
                    {done && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  </div>
                  <h4 className="font-semibold text-stone-100">{c.title}</h4>
                  <p className="mt-1 text-xs text-stone-500">{c.desc}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 text-amber-500"><Zap className="h-3 w-3" /> {c.xp} XP</span>
                  </div>
                </div>
              </div>
              {done ? (
                <div className="mt-3 text-center text-emerald-600 text-sm font-medium">¡Completado!</div>
              ) : (
                <button onClick={() => complete(c)} disabled={pending} className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {pending ? "Registrando..." : "Marcar como completado"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 p-3 text-center">
        <p className="text-xs text-stone-500">Nuevos retos cada día a medianoche UTC. ¡Vuelve mañana para más XP!</p>
      </div>
    </div>
  );
}