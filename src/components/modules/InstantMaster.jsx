"use client";
import { useState, useCallback } from "react";
import { Loader2, X, Scale, FileUp, Volume2 } from "lucide-react";
import { computeLufs, normalizeLufs, encodeWav, downloadBlob } from "@/lib/audio/lufs";
import { saveAudioModule } from "@/lib/api/modules";

const TARGETS = [
  { name: "Spotify / YouTube", lufs: -14, color: "text-green-500" },
  { name: "Apple Music", lufs: -16, color: "text-purple-500" },
  { name: "Broadcast (EBU R128)", lufs: -23, color: "text-blue-500" },
  { name: "Podcast", lufs: -19, color: "text-amber-500" },
  { name: "Personalizado", lufs: null, color: "text-stone-500" },
];

export default function InstantMaster({ plan, projectId, audioFile, buffer, onClose }) {
  const [measured, setMeasured] = useState(null);
  const [targetLufs, setTargetLufs] = useState(-14);
  const [customLufs, setCustomLufs] = useState(-14);
  const [processing, setProcessing] = useState(false);
  const [masteredBuffer, setMasteredBuffer] = useState(null);
  const [gainDb, setGainDb] = useState(0);

  const measure = useCallback(async () => {
    if (!buffer) return;
    setProcessing(true);
    try {
      const { lufs, truePeak } = await computeLufs(buffer);
      setMeasured({ lufs, truePeak });
      setGainDb(-lufs - 14); // ganancia para llegar a -14
    } catch (e) {
      console.error("[InstantMaster] measure", e);
    } finally {
      setProcessing(false);
    }
  }, [buffer]);

  const renderMaster = useCallback(async () => {
    if (!buffer) return;
    setProcessing(true);
    try {
      const target = targetLufs === -999 ? customLufs : targetLufs;
      const mastered = await normalizeLufs(buffer, target, true);
      setMasteredBuffer(mastered);
      const { lufs } = await computeLufs(mastered);
      setMeasured((prev) => ({ ...prev, lufs, mastered: true }));
      // Guardar registro
      await saveAudioModule({
        kind: "master",
        projectId,
        targetLufs: target,
        measuredLufs: lufs,
        gainDb: target - (measured?.lufs ?? 0),
        sampleRate: mastered.sampleRate,
      });
    } catch (e) {
      console.error("[InstantMaster] render", e);
    } finally {
      setProcessing(false);
    }
  }, [buffer, targetLufs, customLufs, targetLufs, measured]);

  const exportMaster = useCallback(async () => {
    if (!masteredBuffer) return;
    const blob = encodeWav(masteredBuffer);
    downloadBlob(blob, `${audioFile?.name?.replace(/\.[^.]+$/, "") || "proyecto"}-mastered-${targetLufs === -999 ? customLufs : targetLufs}lufs.wav`);
  }, [masteredBuffer, audioFile, targetLufs, customLufs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-purple-500" />
          <h3 className="font-semibold text-stone-100">Instant Master</h3>
        </div>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-200">✕</button>
      </div>

      <p className="text-xs text-stone-500">
        Normaliza tu mezcla al estándar LUFS de cada plataforma de streaming.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 p-3">
          <label className="block text-xs font-medium text-stone-400 mb-2">Medición actual</label>
          <button onClick={measure} disabled={processing || !buffer} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {processing && !measured ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
            {measured ? "Re-medir" : "Medir LUFS"}
          </button>
          {measured && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded bg-white/5 px-2 py-1">
                <span className="text-stone-500">LUFS integrado</span>
                <br/><span className="font-mono text-stone-100">{measured.lufs.toFixed(1)} LUFS</span>
              </div>
              <div className="rounded bg-white/5 px-2 py-1">
                <span className="text-stone-500">True Peak</span>
                <br/><span className="font-mono text-stone-100">{measured.truePeak.toFixed(1)} dBTP</span>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 p-3">
          <label className="block text-xs font-medium text-stone-400 mb-2">Objetivo LUFS</label>
          <div className="space-y-1">
            {TARGETS.slice(0, -1).map((t) => (
              <label key={t.lufs} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="target" value={t.lufs} checked={targetLufs === t.lufs} onChange={() => setTargetLufs(t.lufs)} className="accent-purple-500" />
                <span className={`text-sm ${t.color}`}>{t.name} ({t.lufs} LUFS)</span>
              </label>
            ))}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="target" value={-999} checked={targetLufs === -999} onChange={() => setTargetLufs(-999)} className="accent-purple-500" />
              <span className="text-sm text-stone-500">Personalizado:</span>
              <input type="number" min={-30} max={0} step={0.5} value={customLufs} onChange={(e) => setCustomLufs(Number(e.target.value))} className="w-20 rounded border border-[#3c3c3c]/10 bg-white/5 px-2 py-1 text-sm text-stone-100" />
              <span className="text-stone-500">LUFS</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={renderMaster} disabled={processing || !buffer || !measured} className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
          {masteredBuffer ? "Re-renderizar" : "Renderizar Master"}
        </button>
        {masteredBuffer && (
          <button onClick={exportMaster} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
            <FileUp className="h-4 w-4" /> Exportar WAV Master
          </button>
        )}
      </div>

      {masteredBuffer && measured?.mastered && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-600">
          Master listo · LUFS final: {measured.lufs.toFixed(1)} · Ganancia aplicada: {gainDb.toFixed(1)} dB
        </div>
      )}
    </div>
  );
}