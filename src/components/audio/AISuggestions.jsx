"use client";
import { useState } from "react";
import {
  AlertTriangle,
  AudioLines,
  Check,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { BANDS } from "@/lib/audio/presets";
import { analyzeAudioInBrowser } from "@/lib/audio/browserAnalyzer";

const STATUS = {
  idle: "idle",
  analyzing: "analyzing",
  ready: "ready",
  suggesting: "suggesting",
  done: "done",
  error: "error",
};

export default function AISuggestions({ projectId, audioFile, instrument, onApply, isPro }) {
  const [status, setStatus] = useState(STATUS.idle);
  const [metrics, setMetrics] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [applied, setApplied] = useState(new Set());
  const [error, setError] = useState(null);

  const runAnalysis = async () => {
    if (!audioFile) {
      setStatus(STATUS.error);
      setError("Sube un archivo de audio para poder analizarlo.");
      return;
    }
    setError(null);
    setStatus(STATUS.analyzing);
    try {
      const metrics = await analyzeAudioInBrowser(audioFile);
      setMetrics(metrics);
      setStatus(STATUS.ready);
      await runSuggestions(metrics);
    } catch (err) {
      console.error("[AISuggestions] análisis:", err);
      setStatus(STATUS.error);
      setError("No se pudo analizar el audio en el navegador. Prueba con otro archivo.");
    }
  };

  const runSuggestions = async (metricsData = metrics) => {
    if (!metricsData) return;
    setError(null);
    setStatus(STATUS.suggesting);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          instrument,
          metrics: metricsData,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al generar sugerencias");
      setSuggestions(json.suggestions || []);
      setStatus(STATUS.done);
    } catch (err) {
      setStatus(STATUS.error);
      setError(err.message);
    }
  };

  const bandLabel = (id) => BANDS.find((b) => b.id === id)?.label || id;

  return (
    <div className="rounded-2xl border border-[#1cb0f6]/25 bg-gradient-to-br from-[#1cb0f6]/[0.07] to-[#58cc02]/[0.04] p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-indigo-600">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            Asistente de IA
          </h3>
          <p className="mt-0.5 text-xs text-stone-400">
            Análisis espectral en tu navegador + recomendaciones de EQ con IA en lenguaje natural.
          </p>
        </div>
        <button
          type="button"
          onClick={runAnalysis}
          disabled={status === STATUS.analyzing || status === STATUS.suggesting}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
        >
          {(status === STATUS.analyzing || status === STATUS.suggesting) ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          {status === STATUS.analyzing
            ? "Analizando audio…"
            : status === STATUS.suggesting
              ? "Consultando IA…"
              : "Analizar y sugerir"}
        </button>
      </div>

      {!isPro && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-[11px] text-stone-400">
          <AudioLines className="h-3 w-3" />
          Análisis incluido en Free · La exportación HD es exclusiva de Pro
        </p>
      )}

      {metrics && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "RMS", value: metrics.rms?.toFixed(3) ?? "—" },
            { label: "Centroide", value: metrics.spectral_centroid ? `${Math.round(metrics.spectral_centroid)} Hz` : "—" },
            { label: "Roll-off", value: metrics.spectral_rolloff ? `${Math.round(metrics.spectral_rolloff)} Hz` : "—" },
            { label: "Banda dominante", value: metrics.dominant_band ?? "—" },
          ].map((m) => (
            <div key={m.label} className="rounded-lg border border-[#3c3c3c]/10 bg-[#3c3c3c]/[0.04] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-stone-500">{m.label}</p>
              <p className="font-mono text-sm font-semibold text-stone-200">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-3 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      {suggestions.length > 0 && (
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {suggestions.map((s) => {
            const isApplied = applied.has(s.id);
            return (
              <div
                key={s.id}
                className={`rounded-xl border p-3 transition-colors ${
                  isApplied
                    ? "border-emerald-400/40 bg-emerald-500/[0.06]"
                    : "border-[#3c3c3c]/10 bg-[#3c3c3c]/[0.04]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-stone-200">{s.title}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                      s.value > 0
                        ? "bg-amber-400/15 text-amber-600"
                        : "bg-cyan-400/15 text-[#1cb0f6]"
                    }`}
                  >
                    {s.value > 0 ? "+" : ""}
                    {s.value} dB · {bandLabel(s.band)}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-400">{s.description}</p>
                <button
                  type="button"
                  onClick={() => {
                    onApply(s.band, s.value);
                    setApplied((prev) => new Set(prev).add(s.id));
                  }}
                  disabled={isApplied}
                  className={`mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isApplied
                      ? "cursor-default bg-emerald-500/10 text-emerald-600"
                      : "bg-[#3c3c3c]/10 text-[#3c3c3c] hover:bg-[#3c3c3c]/15"
                  }`}
                >
                  {isApplied ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Aplicado
                    </>
                  ) : (
                    "Aplicar al EQ"
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
