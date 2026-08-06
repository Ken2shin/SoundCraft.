"use client";
import { useState, useEffect, useCallback } from "react";
import { X, BadgeCheck, Lock, FileUp, Loader2, AlertCircle } from "lucide-react";
import { saveAudioModule } from "@/lib/api/modules";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB para hash

export default function CopyrightMetadata({ plan, projectId, audioFile, buffer, onClose }) {
  const [form, setForm] = useState({
    title: "", artist: "", album: "", year: "", isrc: "", upc: "", genre: "", notes: "",
  });
  const [audioHash, setAudioHash] = useState("");
  const [hashing, setHashing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const computeHash = useCallback(async () => {
    if (!audioFile) return;
    if (audioFile.size > MAX_FILE_SIZE) {
      alert("El archivo es demasiado grande para calcular el hash (máx 50 MB).");
      return;
    }
    setHashing(true);
    try {
      const buf = await audioFile.arrayBuffer();
      const hashBuf = await crypto.subtle.digest("SHA-256", buf);
      const hashArr = Array.from(new Uint8Array(hashBuf));
      const hex = hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
      setAudioHash(hex);
    } catch (e) {
      console.error("[CopyrightMetadata] hash", e);
    } finally {
      setHashing(false);
    }
  }, [audioFile]);

  const handleSave = useCallback(async () => {
    if (!form.title || !form.artist) {
      alert("Título y artista son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      await saveAudioModule({
        kind: "copyright",
        projectId,
        audioHash: audioHash || "pending",
        ...form,
      });
      setSaved(true);
    } catch (e) {
      console.error("[CopyrightMetadata] save", e);
      alert("Error guardando: " + e.message);
    } finally {
      setSaving(false);
    }
  }, [form, audioHash, projectId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BadgeCheck className="h-5 w-5 text-emerald-500" />
          <h3 className="font-semibold text-stone-100">Copyright & Metadatos</h3>
        </div>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-200">✕</button>
      </div>

      <p className="text-xs text-stone-500">
        Registra la autoría de tu obra: hash SHA-256 del audio, ISRC, UPC y metadatos completos.
        El hash sirve como prueba de integridad y anterioridad.
      </p>

      <div className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 p-3 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <input placeholder="Título *" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 px-3 py-2 text-sm text-stone-100" maxLength={120} />
          <input placeholder="Artista *" value={form.artist} onChange={(e) => setForm({...form, artist: e.target.value})} className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 px-3 py-2 text-sm text-stone-100" maxLength={120} />
          <input placeholder="Álbum" value={form.album} onChange={(e) => setForm({...form, album: e.target.value})} className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 px-3 py-2 text-sm text-stone-100" maxLength={120} />
          <input placeholder="Año" type="number" min={1900} max={2100} value={form.year} onChange={(e) => setForm({...form, year: e.target.value})} className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 px-3 py-2 text-sm text-stone-100" />
          <input placeholder="ISRC (12 chars)" value={form.isrc} onChange={(e) => setForm({...form, isrc: e.target.value.toUpperCase()})} className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 px-3 py-2 text-sm text-stone-100" maxLength={12} />
          <input placeholder="UPC (12-13 dígitos)" value={form.upc} onChange={(e) => setForm({...form, upc: e.target.value})} className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 px-3 py-2 text-sm text-stone-100" maxLength={13} />
          <input placeholder="Género" value={form.genre} onChange={(e) => setForm({...form, genre: e.target.value})} className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 px-3 py-2 text-sm text-stone-100" maxLength={60} />
        </div>

        <textarea placeholder="Notas adicionales (créditos, licencias, etc.)" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={3} className="w-full rounded-lg border border-[#3c3c3c]/10 bg-white/5 px-3 py-2 text-sm text-stone-100" maxLength={500} />

        <div className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2 text-sm font-medium text-stone-300">
              <Lock className="h-4 w-4" /> Hash SHA-256 del audio
            </span>
            {audioHash && (
              <button onClick={() => navigator.clipboard.writeText(audioHash)} className="text-xs text-indigo-500 hover:underline">Copiar</button>
            )}
          </div>
          <div className={`font-mono text-[10px] break-all ${audioHash ? "text-emerald-600" : "text-stone-500"}`}>
            {hashing ? "Calculando hash..." : audioHash || "Pendiente (archivo grande o sin audio)"}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving || !form.title || !form.artist} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
            {saving ? "Registrando..." : "Registrar autoría"}
          </button>
          {saved && <AlertCircle className="h-5 w-5 text-emerald-500" />}
        </div>

        {saved && (
          <p className="text-center text-xs text-emerald-600">¡Autoría registrada! El hash y los metadatos quedan vinculados a este proyecto.</p>
        )}
      </div>
    </div>
  );
}