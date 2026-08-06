"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { X, Timer, Music, Zap, Save, Loader2 } from "lucide-react";
import { detectKey } from "@/lib/audio/key";
import { saveAudioModule } from "@/lib/api/modules";

export default function TapTempoKey({ plan, projectId, audioFile, buffer, onClose }) {
  const [bpm, setBpm] = useState(null);
  const [taps, setTaps] = useState([]);
  const [detectingKey, setDetectingKey] = useState(false);
  const [keyResult, setKeyResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const lastTapRef = useRef(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (lastTapRef.current) {
      const interval = now - lastTapRef.current;
      const newBpm = Math.round(60000 / interval);
      setTaps((prev) => [...prev.slice(-7), newBpm]);
      const avg = Math.round(taps.concat(newBpm).reduce((a, b) => a + b, 0) / (taps.length + 1));
      setBpm(avg);
    }
    lastTapRef.current = now;
  }, [taps]);

  const detectKeyFn = useCallback(async () => {
    if (!buffer) return;
    setDetectingKey(true);
    try {
      const result = await detectKey(buffer);
      setKeyResult(result);
    } catch (e) {
      console.error("[TapTempoKey] key", e);
    } finally {
      setDetectingKey(false);
    }
  }, [buffer]);

  const saveTempo = useCallback(async () => {
    if (bpm === null) return;
    setSaving(true);
    try {
      await saveAudioModule({
        kind: "tempo",
        projectId,
        bpm,
        keyName: keyResult?.key || null,
        source: keyResult ? "chroma" : "tap",
      });
      alert("BPM y tonalidad guardados en el proyecto.");
    } catch (e) {
      console.error("[TapTempoKey] save", e);
    } finally {
      setSaving(false);
    }
  }, [bpm, keyResult, projectId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-orange-500" />
          <h3 className="font-semibold text-stone-100">Tap Tempo & Key Finder</h3>
        </div>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-200">✕</button>
      </div>

      <p className="text-xs text-stone-500">
        Pulsa al ritmo de la canción para calcular el BPM. Detecta la tonalidad aproximada por cromagrama.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 p-4 text-center">
          <div className="text-xs text-stone-400 mb-1">BPM detectado</div>
          <div className="font-display text-5xl font-bold text-orange-500">{bpm ?? "—"}</div>
          <button onClick={handleTap} className="mt-4 inline-flex items-center justify-center gap-2 w-full rounded-lg bg-orange-500 px-4 py-3 text-lg font-bold text-white transition-colors hover:bg-orange-400 active:scale-[0.98]">
            <Zap className="h-5 w-5" /> <span className="text-2xl">TAP</span>
          </button>
          <p className="mt-2 text-xs text-stone-500">Pulsa 4+ veces al ritmo de la canción</p>
        </div>

        <div className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-stone-300">Tonalidad</span>
            <button onClick={detectKeyFn} disabled={detectingKey || !buffer} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
              {detectingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music className="h-4 w-4" />}
              {detectingKey ? "Detectando..." : "Detectar tonalidad"}
            </button>
          </div>
          {keyResult && (
            <div className="space-y-2">
              <div className="rounded-lg border border-indigo-400/30 bg-indigo-500/5 p-3">
                <div className="text-xs text-stone-400">Tonalidad principal</div>
                <div className="font-display text-2xl font-bold text-indigo-600">{keyResult.key}</div>
              </div>
              <div className="rounded-lg border border-amber-400/30 bg-amber-500/5 p-2">
                <div className="text-xs text-stone-400">Relativa</div>
                <div className="font-bold text-amber-600">{keyResult.altKey}</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <span>Confianza: {(keyResult.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {(bpm || keyResult) && (
        <button onClick={saveTempo} disabled={saving} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Guardando..." : "Guardar BPM y tonalidad en el proyecto"}
        </button>
      )}
    </div>
  );
}