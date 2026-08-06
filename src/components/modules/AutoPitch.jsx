"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, X, Mic, Music } from "lucide-react";
import { detectPitch, mergePitchSegments, freqToNote } from "@/lib/audio/pitch";
import { saveAudioModule } from "@/lib/api/modules";

export default function AutoPitch({ plan, projectId, audioFile, buffer, onClose }) {
  const [segments, setSegments] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [correction, setCorrection] = useState(50);
  const [previewActive, setPreviewActive] = useState(false);
  const pitchShiftRef = useRef(null);
  const analyzedRef = useRef(false);

  const runAnalysis = useCallback(async () => {
    if (!buffer) return;
    setAnalyzing(true);
    try {
      const raw = await detectPitch(buffer, { frameMs: 40, hopMs: 20 });
      const segs = mergePitchSegments(raw);
      setSegments(segs);
    } catch (err) {
      console.error("[AutoPitch]", err);
    } finally {
      setAnalyzing(false);
    }
  }, [buffer]);

  useEffect(() => {
    if (buffer && !segments.length && !analyzedRef.current) {
      analyzedRef.current = true;
      runAnalysis();
    }
  }, [buffer, segments.length, runAnalysis]);

  const applyCorrection = async () => {
    if (!buffer || !segments.length) return;
    const main = segments[0];
    try {
      await saveAudioModule({
        kind: "pitch",
        projectId,
        note: main.note,
        cents: main.avgCents,
        correctionCents: Math.round(main.avgCents * (correction / 100)),
        tStart: main.start,
        tEnd: main.end,
      });
    } catch (e) {
      console.error("[AutoPitch] save", e);
    }
    alert(`Corrección aplicada (${correction}%): nota principal ${main.note}, desviación media ${main.avgCents} cents.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-indigo-500" />
          <h3 className="font-semibold text-stone-100">Auto-Pitch / Corrector de notas</h3>
        </div>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-200"><X className="h-5 w-5" /></button>
      </div>

      <p className="text-xs text-stone-500">
        Detecta la nota vocal en cada segmento, muestra la desviación en cents y permite corregir la afinación global.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={runAnalysis}
          disabled={analyzing || !buffer}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music className="h-4 w-4" />}
          {analyzing ? "Analizando..." : "Detectar notas"}
        </button>
        {segments.length && (
          <button onClick={applyCorrection} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
            Aplicar corrección ({correction}%)
          </button>
        )}
      </div>

      {analyzing && <p className="text-sm text-stone-400">Analizando audio...</p>}

      {segments.length > 0 && (
        <div className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 p-3 max-h-60 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#3c3c3c]/10 text-stone-400">
                <th className="pb-2">Nota</th>
                <th className="pb-2">Desviación (cents)</th>
                <th className="pb-2">Inicio</th>
                <th className="pb-2">Fin</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((s, i) => (
                <tr key={i} className="border-b border-[#3c3c3c]/5">
                  <td className="py-1 font-mono text-stone-100">{s.note}</td>
                  <td className="py-1 font-mono text-stone-100">
                    {s.avgCents > 0 ? "+" : ""}{s.avgCents}
                  </td>
                  <td className="py-1 text-stone-400">{s.start.toFixed(1)}s</td>
                  <td className="py-1 text-stone-400">{s.end.toFixed(1)}s</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4">
            <label className="block text-xs text-stone-500 mb-1">
              Intensidad de corrección: {correction}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={correction}
              onChange={(e) => setCorrection(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <p className="mt-1 text-xs text-stone-500">
              0% = sin corrección &middot; 100% = afinación perfecta a la nota detectada.
            </p>
          </div>
        </div>
      )}

      {!segments.length && !analyzing && buffer && (
        <p className="text-center text-stone-500 py-4">Pulsa Detectar notas para analizar la afinaci&oacute;n vocal.</p>
      )}
    </div>
  );
}