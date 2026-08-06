"use client";
import { useState, useCallback } from "react";
import { ChevronDown, Lock, Sparkles, Mic, Waves, GitCompare, Scale, Music, FileAudio, Timer, BadgeCheck, Banknote, Trophy } from "lucide-react";
import { MODULES, moduleAvailable, isModuleAdvanced, isModuleEnterprise, planLabel } from "@/lib/plans";
import AutoPitch from "./AutoPitch";
import DenoiserStems from "./DenoiserStems";
import ReferenceMatcher from "./ReferenceMatcher";
import InstantMaster from "./InstantMaster";
import ChordGenerator from "./ChordGenerator";
import FormatConverter from "./FormatConverter";
import TapTempoKey from "./TapTempoKey";
import CopyrightMetadata from "./CopyrightMetadata";
import Marketplace from "./Marketplace";
import Challenges from "./Challenges";

const MODULE_COMPONENTS = {
  autopitch: AutoPitch,
  denoiser: DenoiserStems,
  reference: ReferenceMatcher,
  master: InstantMaster,
  chords: ChordGenerator,
  converter: FormatConverter,
  tapping: TapTempoKey,
  copyright: CopyrightMetadata,
  marketplace: Marketplace,
  challenges: Challenges,
};

const MODULE_ICONS = {
  autopitch: Mic,
  denoiser: Waves,
  reference: GitCompare,
  master: Scale,
  chords: Music,
  converter: FileAudio,
  tapping: Timer,
  copyright: BadgeCheck,
  marketplace: Banknote,
  challenges: Trophy,
};

function ModuleCard({ module, plan, activeKey, onOpen }) {
  const available = moduleAvailable(plan, module.id);
  const advanced = isModuleAdvanced(plan, module.id);
  const enterprise = isModuleEnterprise(plan, module.id);
  const Icon = MODULE_ICONS[module.id];
  const isOpen = activeKey === module.id;

  if (!available) {
    return (
      <div className="relative rounded-xl border border-stone-500/10 bg-white/5 p-5 text-center transition-all opacity-60">
        <Lock className="mx-auto h-8 w-8 text-stone-400" />
        <p className="mt-2 text-sm font-semibold text-stone-300">{module.name}</p>
        <p className="mt-1 text-xs text-stone-500">{module.short}</p>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">
          {planLabel(plan)} → <span className="underline">Mejorar plan</span>
        </span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-5 transition-all cursor-pointer ${isOpen ? "border-indigo-400/50 bg-indigo-500/5 shadow-[0_0_30px_-10px_rgba(88,204,2,0.3)]" : "border-[#3c3c3c]/10 bg-white/5 hover:border-[#3c3c3c]/20 hover:bg-white/10"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`grid h-10 w-10 place-items-center rounded-lg ${advanced ? "bg-emerald-500/15 text-emerald-600" : enterprise ? "bg-amber-500/15 text-amber-600" : "bg-indigo-500/15 text-indigo-600"}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-stone-100">{module.name}</p>
            <p className="text-xs text-stone-500">{module.short}</p>
            {(advanced || enterprise) && (
              <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-bold uppercase ${advanced ? "text-emerald-500" : "text-amber-500"}`}>
                {advanced ? "Avanzado" : "Enterprise"}
              </span>
            )}
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-stone-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>
      <button
        type="button"
        onClick={() => onOpen(module.id)}
        className="mt-4 w-full rounded-lg border border-[#3c3c3c]/10 py-2 text-sm font-medium text-stone-300 transition-colors hover:bg-[#3c3c3c]/5"
      >
        {isOpen ? "Cerrar" : "Abrir módulo"}
      </button>
    </div>
  );
}

export default function ModulesHub({ plan, projectId, audioFile, buffer, eq, changeBand, onSaveState }) {
  const [activeKey, setActiveKey] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleOpen = useCallback((key) => {
    setActiveKey((prev) => (prev === key ? null : key));
  }, []);

  const ModuleContent = MODULE_COMPONENTS[activeKey];

  return (
    <section className="mt-8 space-y-6" id="modulos">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-stone-100">
            Módulos de producción
          </h2>
          <p className="mt-0.5 text-sm text-stone-500">
            {planLabel(plan)} · Módulos disponibles: {MODULES.filter((m) => moduleAvailable(plan, m.id)).length} / {MODULES.length}
          </p>
        </div>
        <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
          Plan: {planLabel(plan)}
        </span>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {MODULES.map((m) => (
          <ModuleCard key={m.id} module={m} plan={plan} activeKey={activeKey} onOpen={handleOpen} />
        ))}
      </div>

      {activeKey && ModuleContent && (
        <div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/5 p-5 shadow-lg">
          <ModuleContent
            plan={plan}
            projectId={projectId}
            audioFile={audioFile}
            buffer={buffer}
            eq={eq}
            changeBand={changeBand}
            onSaveState={onSaveState}
            onClose={() => setActiveKey(null)}
            saving={saving}
          />
        </div>
      )}
    </section>
  );
}