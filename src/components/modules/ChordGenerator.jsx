"use client";
import { useState, useCallback } from "react";
import { Loader2, X, Music, Copy, Play, Pause } from "lucide-react";
import { saveAudioModule } from "@/lib/api/modules";

export default function ChordGenerator({ plan, projectId, onClose }) {
  const [key, setKey] = useState("C");
  const [mood, setMood] = useState("pop");
  const [generating, setGenerating] = useState(false);
  const [chords, setChords] = useState([]);
  const [description, setDescription] = useState("");
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const MOODS = [
    { value: "pop", label: "Pop" },
    { value: "rock", label: "Rock" },
    { value: "jazz", label: "Jazz" },
    { value: "ballad", label: "Balada" },
    { value: "edm", label: "EDM" },
    { value: "lofi", label: "Lo-fi" },
    { value: "cinematic", label: "Cinemática" },
  ];

  const generate = useCallback(async () => {
    setGenerating(true);
    setChords([]);
    try {
      const res = await fetch("/api/ai/chords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, key, mood }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error");
      setChords(json.chords || []);
      setDescription(json.description || "");
    } catch (e) {
      console.error("[ChordGenerator]", e);
      alert(e.message);
    } finally {
      setGenerating(false);
    }
  }, [projectId, key, mood]);

  const copyChords = () => {
    navigator.clipboard.writeText(chords.join(" - "));
  };

  const playProgression = () => {
    // Simple synthesis preview using Tone.js would go here
    // For now just alert
    alert("Reproducción de acordes: " + chords.join(" → ") + "\n(Integración con Tone.js pendiente)");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-indigo-500" />
          <h3 className="font-semibold text-stone-100">Generator IA · Progresiones</h3>
        </div>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-200">✕</button>
      </div>

      <p className="text-xs text-stone-500">
        Genera progresiones de acordes con IA para tu tonalidad y estilo. Usa los acordes como base para tu canción.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <select value={key} onChange={(e) => setKey(e.target.value)} className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 px-3 py-2 text-sm text-stone-100">
          {KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select value={mood} onChange={(e) => setMood(e.target.value)} className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 px-3 py-2 text-sm text-stone-100">
          {MOODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <button onClick={generate} disabled={generating} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music className="h-4 w-4" />}
          {generating ? "Generando..." : "Generar"}
        </button>
      </div>

      {chords.length > 0 && (
        <div className="rounded-lg border border-indigo-400/30 bg-indigo-500/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-indigo-600">Progresión generada</h4>
            <div className="flex items-center gap-2">
              <button onClick={playProgression} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">
                <Play className="h-3.5 w-3.5" /> Reproducir
              </button>
              <button onClick={copyChords} className="inline-flex items-center gap-1.5 rounded-lg border border-[#3c3c3c]/10 px-3 py-1.5 text-xs font-semibold text-stone-300 hover:bg-[#3c3c3c]/5">
                <Copy className="h-3.5 w-3.5" /> Copiar
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {chords.map((c, i) => (
              <span key={i} className="inline-flex items-center justify-center w-14 h-10 rounded-lg bg-indigo-500/15 border border-indigo-400/30 font-mono text-sm font-bold text-indigo-600">
                {c}
              </span>
            ))}
          </div>
          {description && <p className="mt-2 text-xs text-stone-400">{description}</p>}
        </div>
      )}
    </div>
  );
}