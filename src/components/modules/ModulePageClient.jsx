"use client";
import { useState } from "react";
import { lazy, Suspense } from "react";

const MODULE_COMPONENTS = {
  autopitch: lazy(() => import("@/components/modules/AutoPitch")),
  denoiser: lazy(() => import("@/components/modules/DenoiserStems")),
  reference: lazy(() => import("@/components/modules/ReferenceMatcher")),
  master: lazy(() => import("@/components/modules/InstantMaster")),
  chords: lazy(() => import("@/components/modules/ChordGenerator")),
  converter: lazy(() => import("@/components/modules/FormatConverter")),
  tapping: lazy(() => import("@/components/modules/TapTempoKey")),
  copyright: lazy(() => import("@/components/modules/CopyrightMetadata")),
  marketplace: lazy(() => import("@/components/modules/Marketplace")),
  challenges: lazy(() => import("@/components/modules/Challenges")),
};

function LoadingFallback() {
  return (
    <div className="mt-8 flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
    </div>
  );
}

export default function ModulePageClient({ user, initialProjects, module }) {
  const [projectId, setProjectId] = useState("");
  const projects = initialProjects || [];

  const ModuleComponent = MODULE_COMPONENTS[module.id];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-stone-50">
              {module.name}
            </h1>
            <p className="mt-1 text-sm text-stone-500">{module.desc}</p>
          </div>
          <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
            Plan requerido: {module.name}
          </span>
        </div>

        <div className="rounded-xl border border-[#3c3c3c]/10 bg-white/5 p-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
            Proyecto
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-lg border border-[#3c3c3c]/10 bg-white/5 px-3 py-2.5 text-sm text-stone-100"
          >
            <option value="">Selecciona un proyecto…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-stone-500">
            Los módulos necesitan un proyecto para guardar resultados y cuotas.
          </p>
        </div>
      </header>

      {project && (
        <Suspense fallback={<LoadingFallback />}>
          <ModuleComponent
            plan={user?.plan || "free"}
            projectId={project.id}
            audioFile={null}
            buffer={null}
            eq={{ low: 0, mid: 0, high: 0 }}
            changeBand={() => {}}
            onSaveState={() => {}}
            onClose={() => {}}
            saving={false}
          />
        </Suspense>
      )}

      {!project && projectId && (
        <p className="mt-4 text-center text-stone-500">Proyecto no encontrado</p>
      )}
    </main>
  );
}