"use client";
import { useState, useCallback } from "react";
import { Loader2, X, GitCompare, FileUp, Trash2 } from "lucide-react";
import { analyzeAudioInBrowser } from "@/lib/audio/browserAnalyzer";
import { saveAudioModule } from "@/lib/api/modules";

export default function ReferenceMatcher({ plan, projectId, audioFile, buffer, onClose }) {
  const [refFile, setRefFile] = useState(null);
  const [refMetrics, setRefMetrics] = useState(null);
  const [currentMetrics, setCurrentMetrics] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [savedRefs, setSavedRefs] = useState([]);

  const analyzeCurrent = useCallback(async () => {
    if (!buffer) return;
    try {
      const file = new File([bufferToWaveBlob(buffer)], "current.wav", { type: "audio/wav" });
      const m = await analyzeAudioInBrowser(file);
      setCurrentMetrics(m);
    } catch (e) {
      console.error("[ReferenceMatcher] current", e);
    }
  }, [buffer]);

  const handleRefChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRefFile(file);
    try {
      const m = await analyzeAudioInBrowser(file);
      setRefMetrics(m);
    } catch (e) {
      console.error("[ReferenceMatcher] ref", e);
    }
  }, []);

  const saveReference = useCallback(async () => {
    if (!refFile || !refMetrics) return;
    try {
      await saveAudioModule({
        kind: "reference",
        projectId,
        referenceName: refFile.name,
        metrics: refMetrics,
      });
      setSavedRefs((prev) => [...prev, { name: refFile.name, time: new Date().toLocaleTimeString() }]);
      setRefFile(null);
      setRefMetrics(null);
    } catch (e) {
      console.error("[ReferenceMatcher] save", e);
    }
  }, [refFile, refMetrics]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold text-stone-100">A/B Reference Matcher</h3>
        </div>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-200">✕</button>
      </div>

      <p className="text-xs text-stone-500">
        Compara tu mezcla con una pista de referencia: volumen, centroide espectral, roll-off y banda dominante.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 p-3">
          <label className="block text-xs font-medium text-stone-400 mb-2">Tu mezcla actual</label>
          <button onClick={analyzeCurrent} disabled={comparing || !buffer} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
            <GitCompare className="h-4 w-4" /> Analizar actual
          </button>
          {currentMetrics && (
            <div className="mt-2 grid grid-cols-4 gap-2 text-[10px]">
              <div className="rounded bg-white/5 px-2 py-1"><span className="text-stone-500">RMS</span><br/><span className="font-mono text-stone-100">{currentMetrics.rms}</span></div>
              <div className="rounded bg-white/5 px-2 py-1"><span className="text-stone-500">Centroide</span><br/><span className="font-mono text-stone-100">{currentMetrics.spectral_centroid} Hz</span></div>
              <div className="rounded bg-white/5 px-2 py-1"><span className="text-stone-500">Roll-off</span><br/><span className="font-mono text-stone-100">{currentMetrics.spectral_rolloff} Hz</span></div>
              <div className="rounded bg-white/5 px-2 py-1"><span className="text-stone-500">Banda</span><br/><span className="font-mono text-stone-100">{currentMetrics.dominant_band}</span></div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 p-3">
          <label className="block text-xs font-medium text-stone-400 mb-2">Pista de referencia</label>
          <input type="file" accept="audio/*" onChange={handleRefChange} className="mb-2 text-xs" />
          {refFile && (
            <button onClick={saveReference} disabled={comparing} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
              Guardar referencia
            </button>
          )}
          {refMetrics && (
            <div className="mt-2 grid grid-cols-4 gap-2 text-[10px]">
              <div className="rounded bg-white/5 px-2 py-1"><span className="text-stone-500">RMS</span><br/><span className="font-mono text-stone-100">{refMetrics.rms}</span></div>
              <div className="rounded bg-white/5 px-2 py-1"><span className="text-stone-500">Centroide</span><br/><span className="font-mono text-stone-100">{refMetrics.spectral_centroid} Hz</span></div>
              <div className="rounded bg-white/5 px-2 py-1"><span className="text-stone-500">Roll-off</span><br/><span className="font-mono text-stone-100">{refMetrics.spectral_rolloff} Hz</span></div>
              <div className="rounded bg-white/5 px-2 py-1"><span className="text-stone-500">Banda</span><br/><span className="font-mono text-stone-100">{refMetrics.dominant_band}</span></div>
            </div>
          )}
        </div>
      </div>

      {currentMetrics && refMetrics && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <h4 className="font-semibold text-amber-600 mb-2">Diferencias (Ref → Actual)</h4>
          <div className="grid grid-cols-4 gap-2 text-sm">
            <Delta label="Δ RMS (dB)" val={20 * Math.log10(refMetrics.rms / Math.max(currentMetrics.rms, 1e-9))} />
            <Delta label="Δ Centroide (Hz)" val={refMetrics.spectral_centroid - currentMetrics.spectral_centroid} />
            <Delta label="Δ Roll-off (Hz)" val={refMetrics.spectral_rolloff - currentMetrics.spectral_rolloff} />
            <div className="rounded bg-white/5 px-2 py-1 text-center text-stone-400">
              Banda ref: {refMetrics.dominant_band} → act: {currentMetrics.dominant_band}
            </div>
          </div>
          <p className="mt-2 text-xs text-stone-500">Valores positivos = la referencia tiene más. Ajusta tu EQ para acercarte.</p>
        </div>
      )}

      {savedRefs.length && (
        <div className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 p-3">
          <h4 className="font-semibold text-stone-400 mb-2">Referencias guardadas</h4>
          <ul className="space-y-1">
            {savedRefs.map((r, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-stone-300">{r.name}</span>
                <span className="text-stone-500">{r.time}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Delta({ label, val }) {
  const color = val > 0 ? "text-emerald-500" : val < 0 ? "text-rose-500" : "text-stone-400";
  const sign = val > 0 ? "+" : "";
  return (
    <div className={`rounded bg-white/5 px-2 py-1 text-center ${color}`}>
      <div className="text-[10px] text-stone-500">{label}</div>
      <div className="font-mono">{sign}{Number(val).toFixed(1)}</div>
    </div>
  );
}

function bufferToWaveBlob(buffer) {
  // helper rápido para crear un blob WAV temporal del buffer actual
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length * numChannels * 2;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);
  function ws(o, s) { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); }
  ws(0, "RIFF"); view.setUint32(4, 36 + length, true);
  ws(8, "WAVE"); ws(12, "fmt "); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true); view.setUint16(34, 16, true);
  ws(36, "data"); view.setUint32(40, length, true);
  let o = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2;
    }
  }
  return new Blob([arrayBuffer], { type: "audio/wav" });
}