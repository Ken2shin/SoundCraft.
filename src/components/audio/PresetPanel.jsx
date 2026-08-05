"use client";
import { PRESETS } from "@/lib/audio/presets";

const ICONS = {
  waveform: "∿",
  drum: "◉",
  bass: "♬",
  guitar: "♫",
  mic: "◍",
};

export default function PresetPanel({ activeKey, onApply }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {Object.entries(PRESETS).map(([key, preset]) => {
        const active = activeKey === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onApply(key)}
            title={preset.description}
            className={`group flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-center transition-all ${
              active
                ? "border-indigo-400/70 bg-indigo-500/10 shadow-[0_0_20px_-6px_rgba(88,204,2,0.6)]"
                : "border-[#3c3c3c]/10 bg-[#3c3c3c]/[0.04] hover:border-[#3c3c3c]/15 hover:bg-[#3c3c3c]/[0.07]"
            }`}
          >
            <span
              className={`text-lg leading-none ${
                active ? "text-indigo-600" : "text-stone-400"
              }`}
            >
              {ICONS[preset.icon] || "∿"}
            </span>
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${
                active ? "text-[#3c3c3c]" : "text-stone-300"
              }`}
            >
              {preset.label}
            </span>
            <span className="font-mono text-[10px] text-stone-500">
              {preset.low > 0 ? "+" : ""}
              {preset.low}/{preset.mid > 0 ? "+" : ""}
              {preset.mid}/{preset.high > 0 ? "+" : ""}
              {preset.high} dB
            </span>
          </button>
        );
      })}
    </div>
  );
}