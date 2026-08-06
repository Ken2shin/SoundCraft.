"use client";
import { useState, useCallback } from "react";
import { Loader2, X, FileAudio, Download } from "lucide-react";
import { convertBuffer, exportConvertedWav, downloadConverted } from "@/lib/audio/converter";
import { saveAudioModule } from "@/lib/api/modules";

const SAMPLE_RATES = [44100, 48000, 96000];
const BIT_DEPTHS = [16, 24];
const CHANNELS = [1, 2];

export default function FormatConverter({ plan, projectId, audioFile, buffer, onClose }) {
  const [sampleRate, setSampleRate] = useState(48000);
  const [bitDepth, setBitDepth] = useState(16);
  const [channels, setChannels] = useState(2);
  const [converting, setConverting] = useState(false);
  const [convertedBuffer, setConvertedBuffer] = useState(null);

  const convert = useCallback(async () => {
    if (!buffer) return;
    setConverting(true);
    try {
      const out = await convertBuffer(buffer, { sampleRate, channels, bitDepth });
      setConvertedBuffer(out);
      await saveAudioModule({
        kind: "conversion",
        projectId,
        sourceFormat: "wav",
        targetFormat: "wav",
        bitDepth,
        sampleRate,
        channels,
      });
    } catch (e) {
      console.error("[FormatConverter]", e);
      alert("Error al convertir: " + e.message);
    } finally {
      setConverting(false);
    }
  }, [buffer, sampleRate, bitDepth, channels, projectId]);

  const exportConverted = useCallback(async () => {
    if (!convertedBuffer) return;
    try {
      const blob = await exportConvertedWav(convertedBuffer, { bitDepth });
      downloadConverted(blob, audioFile?.name || "proyecto", { sampleRate, channels, bitDepth });
    } catch (e) {
      console.error("[FormatConverter] export", e);
    }
  }, [convertedBuffer, audioFile, sampleRate, channels, bitDepth]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileAudio className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold text-stone-100">Convertidor de formatos</h3>
        </div>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-200">✕</button>
      </div>

      <p className="text-xs text-stone-500">
        Convierte tu proyecto a WAV con distintos sample rates, bit depths y canales.
        <span className="text-amber-500 ml-1">(MP3/OGG requieren librerías externas)</span>
      </p>

      <div className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 p-3 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs text-stone-400 mb-1">Sample Rate</label>
            <select value={sampleRate} onChange={(e) => setSampleRate(Number(e.target.value))} className="w-full rounded-lg border border-[#3c3c3c]/10 bg-white/5 px-3 py-2 text-sm text-stone-100">
              {SAMPLE_RATES.map((r) => <option key={r} value={r}>{r / 1000} kHz</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1">Bit Depth</label>
            <select value={bitDepth} onChange={(e) => setBitDepth(Number(e.target.value))} className="w-full rounded-lg border border-[#3c3c3c]/10 bg-white/5 px-3 py-2 text-sm text-stone-100">
              {BIT_DEPTHS.map((b) => <option key={b} value={b}>{b}-bit</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1">Canales</label>
            <select value={channels} onChange={(e) => setChannels(Number(e.target.value))} className="w-full rounded-lg border border-[#3c3c3c]/10 bg-white/5 px-3 py-2 text-sm text-stone-100">
              {CHANNELS.map((c) => <option key={c} value={c}>{c === 1 ? "Mono" : "Estéreo"}</option>)}
            </select>
          </div>
        </div>

        <button onClick={convert} disabled={converting || !buffer} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {converting ? <span className="animate-spin">⏳</span> : '⚙️'} {converting ? "Convirtiendo..." : "Convertir"}
        </button>

        {convertedBuffer && (
          <button onClick={exportConverted} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
            <Download className="h-4 w-4" /> Descargar WAV convertido
          </button>
        )}

        {convertedBuffer && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 text-xs text-emerald-600">
            Listo: {sampleRate / 1000} kHz · {bitDepth}-bit · {channels === 1 ? "Mono" : "Estéreo"}
          </div>
        )}
      </div>
    </div>
  );
}