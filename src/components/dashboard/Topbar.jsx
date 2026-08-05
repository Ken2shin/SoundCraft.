"use client";
import { Search } from "lucide-react";

export default function Topbar({ title, subtitle, showSearch = false, search = "", onSearch }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#3c3c3c]/10 px-6 py-4">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight text-[#3c3c3c]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-stone-500">{subtitle}</p>}
      </div>
      {showSearch && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch?.(e.target.value)}
            placeholder="Buscar proyectos…"
            className="w-64 rounded-lg border border-[#3c3c3c]/10 bg-[#3c3c3c]/[0.04] py-2 pl-9 pr-3 text-sm text-stone-200 placeholder:text-stone-500 focus:border-indigo-400/60 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}