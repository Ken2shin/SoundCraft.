"use client";
import { useState } from "react";
import ModulesHub from "./ModulesHub";

export default function ModulesPageClient({ user, initialProjects }) {
  const [projectId, setProjectId] = useState("");
  const projects = initialProjects || [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-10 text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-stone-50 sm:text-4xl">
          Módulos de producción
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Selecciona un proyecto para usar los módulos de IA y herramientas avanzadas.
        </p>
      </header>

      <div className="mb-8 rounded-xl border border-[#3c3c3c]/10 bg-white/5 p-4">
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

      {projectId && (
        <ModulesHub
          plan={user?.plan || "free"}
          projectId={projectId}
          audioFile={null}
          buffer={null}
          eq={{ low: 0, mid: 0, high: 0 }}
          changeBand={() => {}}
          onSaveState={() => {}}
        />
      )}
    </main>
  );
}