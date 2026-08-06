"use client";
import { useState, useCallback } from "react";
import { Loader2, X, Waves, VolumeX, Download } from "lucide-react";
import { saveAudioModule } from "@/lib/api/modules";

const STEM_TYPES = [
  { key: "vocal", label: "Voz", range: { low: 300, high: 3400 } },
  { key: "bass", label: "Bajo", range: { low: 40, high: 250 } },
  { key: "drums", label: "Batería", range: { low: 60, high: 5000 } },
  { key: "music", label: "Resto (música)", range: { low: 200, high: 8000 } },
];

export default function DenoiserStems({ plan, projectId, audioFile, buffer, onClose }) {
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [denoiseOn, setDenoiseOn] = useState(false);
  const [highpassHz, setHighpassHz] = useState(80);
  const [lowpassHz, setLowpassHz] = useState(12000);
  const [gateDb, setGateDb] = useState(-40);

  const exportStem = useCallback(async (stem) => {
    if (!buffer) return;
    setProcessing(true);
    try {
      // Simulación: exportar WAV filtrado con OfflineAudioContext
      const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = stem.range.low;
      hp.Q.value = 0.7;

      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = stem.range.high;
      lp.Q.value = 0.7;

      let chain = source.connect(hp);
      chain = hp.connect(lp);

      if (denoiseOn) {
        const hp2 = ctx.createBiquadFilter();
        hp2.type = "highpass";
        hp2.frequency.value = highpassHz;
        const lp2 = ctx.createBiquadFilter();
        lp2.type = "lowpass";
        lp2.frequency.value = lowpassHz;
        chain = lp.connect(hp2);
        chain = hp2.connect(lp2);
        chain = lp2.connect(ctx.destination);
      } else {
        lp.connect(ctx.destination);
      }

      source.start();
      const rendered = await ctx.startRendering();

      // Guardar registro
      await saveAudioModule({
        kind: "stems",
        projectId,
        stemType: stem.key,
        filterLow: stem.range.low,
        filterHigh: stem.range.high,
        sampleRate: rendered.sampleRate,
      });

      // Descargar
      const { exportConvertedWav, downloadConverted } = await import("@/lib/audio/converter");
      const blob = await exportConvertedWav(rendered, { bitDepth: 16 });
      downloadConverted(blob, `${audioFile?.name?.replace(/\.[^.]+$/, "") || "proyecto"}-${stem.key}`, { bitDepth: 16 });

      setResults((prev) => [...prev, { stem: stem.label, time: new Date().toLocaleTimeString() }]);
    } catch (err) {
      console.error("[DenoiserStems]", err);
      alert("Error al exportar stem: " + err.message);
    } finally {
      setProcessing(false);
    }
  }, [buffer, audioFile, denoiseOn, highpassHz, lowpassHz]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Waves className="h-5 w-5 text-emerald-500" />
          <h3 className="font-semibold text-stone-100">Denoiser & Stem Splitter</h3>
        </div>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-200">✕</button>
      </div>

      <p className="text-xs text-stone-500">
        Reduce ruido de fondo (filtro pasa-alto/pasa-bajo + gate) y aísla por frecuencia voz, bajo, batería o música.
        <span className="text-amber-500 ml-1">(Aproximado sin IA de servidor)</span>
      </p>

      <div className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 p-3 space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={denoiseOn} onChange={(e) => setDenoiseOn(e.target.checked)} className="accent-emerald-500" />
          Activar denoiser (limpieza de ruido)
        </label>
        {denoiseOn && (
          <div className="grid gap-2 sm:grid-cols-3 text-xs">
            <label className="flex flex-col gap-1">
              High-pass (Hz)
              <input type="range" min={20} max={300} value={highpassHz} onChange={(e) => setHighpassHz(Number(e.target.value))} className="accent-emerald-500" />
              <span>{highpassHz} Hz</span>
            </label>
            <label className="flex flex-col gap-1">
              Low-pass (Hz)
              <input type="range" min={2000} max={20000} value={lowpassHz} onChange={(e) => setLowpassHz(Number(e.target.value))} className="accent-emerald-500" />
              <span>{lowpassHz} Hz</span>
            </label>
            <label className="flex flex-col gap-1">
              Gate (dB)
              <input type="range" min={-60} max={-20} value={gateDb} onChange={(e) => setGateDb(Number(e.target.value))} className="accent-emerald-500" />
              <span>{gateDb} dB</span>
            </label>
          </div>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {STEM_TYPES.map((stem) => (
          <button
            key={stem.key}
            onClick={() => exportStem(stem)}
            disabled={processing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#3c3c3c]/10 bg-white/5 px-4 py-3 text-sm font-medium text-stone-200 transition-colors hover:bg-[#3c3c3c]/5 disabled:opacity-50"
          >
            {processing && results.find((r) => r.stem === stem.label) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Exportar {stem.label}
          </button>
        ))}
      </div>

      {results.length && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-600">
          Exportados: {results.map((r) => `${r.stem} (${r.time})`).join(", ")}
        </div>
      )}
    </div>
  );
}