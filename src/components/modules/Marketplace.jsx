"use client";
import { useState, useEffect, useCallback } from "react";
import { X, Banknote, Wrench, Save, Loader2, Send, Clock, AlertCircle } from "lucide-react";
import { saveAudioModule } from "@/lib/api/modules";

const SERVICES = [
  { value: "mixing", label: "Mezcla", baseRate: 150 },
  { value: "mastering", label: "Masterización", baseRate: 80 },
  { value: "both", label: "Mezcla + Masterización", baseRate: 200 },
];

export default function Marketplace({ plan, projectId, onClose }) {
  const [service, setService] = useState("both");
  const [durationMin, setDurationMin] = useState(3);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [requests, setRequests] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const estimatedBudget = SERVICES.find((s) => s.value === service)?.baseRate
    ? Math.round(SERVICES.find((s) => s.value === service).baseRate * durationMin * 1.2)
    : 0;
  const [budget, setBudget] = useState(estimatedBudget);

  const loadRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/modules/marketplace");
      const json = await res.json();
      if (res.ok) setRequests(json.requests || []);
    } catch (e) {
      console.error("[Marketplace] load", e);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!notes.trim()) {
      alert("Describe brevemente qué necesitas.");
      return;
    }
    setSaving(true);
    try {
      await saveAudioModule({
        kind: "marketplace",
        projectId,
        service,
        trackTitle: "Proyecto actual",
        durationMin,
        estimatedBudget: budget,
        notes,
      });
      setSubmitted(true);
      setNotes("");
      loadRequests();
    } catch (e) {
      console.error("[Marketplace] submit", e);
      alert("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  }, [projectId, service, durationMin, budget, notes, loadRequests]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold text-stone-100">Marketplace · Ingenieros</h3>
        </div>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-200">✕</button>
      </div>

      <p className="text-xs text-stone-500">
        Obtén una estimación de presupuesto y envía tu solicitud a ingenieros de mezcla y masterización.
      </p>

      <div className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 p-3 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs text-stone-400 mb-1">Servicio</label>
            <select value={service} onChange={(e) => { setService(e.target.value); estimateBudget(); }} className="w-full rounded-lg border border-[#3c3c3c]/10 bg-white/5 px-3 py-2 text-sm text-stone-100">
              {SERVICES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1">Duración estimada (min)</label>
            <input type="number" min={1} max={30} value={durationMin} onChange={(e) => { setDurationMin(Number(e.target.value)); estimateBudget(); }} className="w-full rounded-lg border border-[#3c3c3c]/10 bg-white/5 px-3 py-2 text-sm text-stone-100" />
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1">Presupuesto estimado (€)</label>
            <input type="number" min={0} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full rounded-lg border border-[#3c3c3c]/10 bg-white/5 px-3 py-2 text-sm font-mono text-stone-100" />
          </div>
        </div>

        <textarea placeholder="Describe tu proyecto: estilo, referencias, plazo, necesidades especiales..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-[#3c3c3c]/10 bg-white/5 px-3 py-2 text-sm text-stone-100" />

        <button onClick={handleSubmit} disabled={saving} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {saving ? "Enviando..." : "Enviar solicitud"}
        </button>

        {submitted && <p className="text-center text-xs text-emerald-600">Solicitud enviada. Un ingeniero se pondrá en contacto contigo.</p>}
      </div>

      <div className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 p-3">
        <h4 className="font-semibold text-stone-300 mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" /> Mis solicitudes
        </h4>
        {requests.length === 0 ? (
          <p className="text-center text-stone-500 py-4">No hay solicitudes aún.</p>
        ) : (
          <ul className="space-y-2">
            {requests.map((r) => (
              <li key={r.id} className="rounded-lg border border-[#3c3c3c]/10 bg-white/5 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-stone-200">{r.track_title}</span>
                    <span className="ml-2 text-xs text-stone-500">{r.service} · {r.duration_min} min</span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-amber-500">{r.estimated_budget} €</div>
                    <div className={`text-xs ${r.status === "pendiente" ? "text-amber-500" : r.status === "aceptada" ? "text-emerald-500" : "text-rose-500"}`}>
                      {r.status}
                    </div>
                  </div>
                </div>
                <div className="mt-1 text-xs text-stone-500">{new Date(r.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}