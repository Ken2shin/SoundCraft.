"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Sidebar from "../dashboard/Sidebar";
import AudioProcessor from "../audio/AudioProcessor";

export default function Studio({ project, user }) {
  const router = useRouter();
  const [title, setTitle] = useState(project.title);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const isPro = user?.plan === "pro";

  const eqState = project.eq_state || {};
  const initialEq = {
    low: Number(eqState.low) || 0,
    mid: Number(eqState.mid) || 0,
    high: Number(eqState.high) || 0,
  };

  const saveState = async (payload) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || project.title,
          ...payload,
        }),
      });
      if (res.ok) setSavedAt(new Date());
    } catch {
      setSavedAt(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-[#3c3c3c]/10 px-6 py-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            aria-label="Volver a proyectos"
            className="rounded-lg border border-[#3c3c3c]/10 p-2 text-stone-300 transition-colors hover:bg-[#3c3c3c]/5"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Título del proyecto"
            className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 font-display text-lg font-semibold tracking-tight text-[#3c3c3c] focus:border-indigo-400/60 focus:bg-[#3c3c3c]/[0.04] focus:outline-none"
          />
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
              isPro
                ? "bg-emerald-500/15 text-emerald-600"
                : "bg-indigo-500/15 text-indigo-600"
            }`}
          >
            {isPro ? "Pro" : "Free"}
          </span>
          <button
            type="button"
            onClick={() => saveState({})}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </button>
          {savedAt && (
            <span className="text-xs text-stone-500">
              Guardado {savedAt.toLocaleTimeString()}
            </span>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <AudioProcessor
            projectId={project.id}
            initialEq={initialEq}
            initialPresetKey={eqState.presetKey || "Flat"}
            isPro={isPro}
            onSaveState={saveState}
          />
        </main>
      </div>
    </div>
  );
}
