"use client";
import { BANDS, EQ_BOUNDS } from "@/lib/audio/presets";

export default function EQBand({ band, value, onChange }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-[#3c3c3c]/10 bg-[#3c3c3c]/[0.04] px-4 py-4 shadow-sm">
      <span
        className={`font-mono text-sm font-bold tabular-nums ${
          value > 0
            ? "text-amber-600"
            : value < 0
              ? "text-[#1cb0f6]"
              : "text-stone-300"
        }`}
      >
        {value > 0 ? "+" : ""}
        {value.toFixed(1)} dB
      </span>

      <input
        type="range"
        orientation="vertical"
        min={EQ_BOUNDS.min}
        max={EQ_BOUNDS.max}
        step={EQ_BOUNDS.step}
        value={value}
        onChange={(e) => onChange(band.id, parseFloat(e.target.value))}
        className="eq-range"
        aria-label={`EQ ${band.label}`}
      />

      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-100">
          {band.label}
        </p>
        <p className="mt-0.5 text-[10px] text-stone-400">{band.range}</p>
      </div>
    </div>
  );
}