"use client";
import Link from "next/link";
import {
  AudioLines,
  Clock,
  FileAudio,
  Trash2,
  Waves,
} from "lucide-react";

const STATUS_LABELS = {
  draft: { label: "Borrador", cls: "bg-stone-500/15 text-stone-300" },
  analyzed: { label: "Analizado", cls: "bg-indigo-500/15 text-indigo-600" },
  exported: { label: "Exportado", cls: "bg-emerald-500/15 text-emerald-600" },
};

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("es", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function ProjectCard({ project, onDelete }) {
  const status = STATUS_LABELS[project.status] || STATUS_LABELS.draft;
  const eq = project.eq_state || {};
  return (
    <div className="group relative flex flex-col rounded-2xl border border-[#3c3c3c]/10 bg-panel p-4 shadow-lg transition-colors hover:border-indigo-400/40">
      <Link
        href={`/dashboard/studio/${project.id}`}
        className="absolute inset-0 z-10 rounded-2xl"
        aria-label={`Abrir proyecto ${project.title}`}
      />

      <div className="mb-3 flex items-start justify-between gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${status.cls}`}>
          {status.label}
        </span>
        <button
          type="button"
          onClick={() => onDelete(project)}
          className="relative z-20 rounded-md p-1.5 text-stone-500 transition-colors hover:bg-rose-500/10 hover:text-rose-600"
          aria-label={`Eliminar ${project.title}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <h3 className="truncate font-display text-[15px] font-semibold tracking-tight text-stone-100">{project.title}</h3>

      <div className="mt-2 space-y-1 text-xs text-stone-400">
        <p className="flex items-center gap-2">
          <FileAudio className="h-3.5 w-3.5 shrink-0 text-stone-600" />
          <span className="truncate">{project.audio_name || "Sin audio"}</span>
        </p>
        <p className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 shrink-0 text-stone-600" />
          {fmtDate(project.updated_at)}
        </p>
        <p className="flex items-center gap-2">
          <Waves className="h-3.5 w-3.5 shrink-0 text-stone-600" />
          {eq.presetKey && eq.presetKey !== "Flat" ? eq.presetKey : "EQ personalizado"}
          {" · "}
          <span className="font-mono">
            {eq.low > 0 ? "+" : ""}
            {eq.low} / {eq.mid > 0 ? "+" : ""}
            {eq.mid} / {eq.high > 0 ? "+" : ""}
            {eq.high}
          </span>
        </p>
      </div>

      <span className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#3c3c3c]/[0.05] px-3 py-2 text-xs font-semibold text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">
        <AudioLines className="h-3.5 w-3.5" /> Abrir en el estudio
      </span>
    </div>
  );
}