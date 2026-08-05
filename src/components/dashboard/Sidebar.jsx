"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AudioWaveform, FolderKanban, Gem, LogOut, Sparkles } from "lucide-react";

export default function Sidebar({ user }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "DELETE" });
    } catch {}
    router.push("/auth/login");
    router.refresh();
  };

  const nav = [
    { href: "/dashboard", label: "Proyectos", icon: FolderKanban },
    { href: "/planes", label: "Planes", icon: Gem },
  ];

  return (
    <aside className="flex h-full w-60 flex-col border-r border-[#3c3c3c]/10 bg-surface-900/60 px-4 py-5">
      <Link href="/dashboard" className="mb-8 flex items-center gap-2.5 px-1">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-[#58cc02] shadow-[0_0_20px_-6px_rgba(88,204,2,0.7)]">
          <AudioWaveform className="h-5 w-5 text-white" />
        </span>
        <div>
          <p className="font-display text-sm font-semibold leading-tight text-[#3c3c3c]">
            SoundCraft<span className="text-[#58cc02]">.</span>
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-stone-500">Studio</p>
        </div>
      </Link>

      <nav className="space-y-1">
        {nav.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname.startsWith("/dashboard")
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-500/10 text-indigo-600"
                  : "text-stone-400 hover:bg-[#3c3c3c]/5 hover:text-stone-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-[#3c3c3c]/10 bg-[#3c3c3c]/[0.04] px-3 py-2.5">
          <span className="text-xs text-stone-400">Tu plan</span>
          {user?.plan === "pro" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600">
              <Sparkles className="h-3 w-3" /> PRO
            </span>
          ) : (
            <Link
              href="/planes"
              className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-[11px] font-bold text-indigo-600 transition-colors hover:bg-indigo-500/25"
            >
              FREE · Mejorar
            </Link>
          )}
        </div>

        <div className="rounded-xl border border-[#3c3c3c]/10 bg-[#3c3c3c]/[0.04] px-3 py-2.5">
          <p className="truncate text-sm font-semibold text-stone-200">
            {user?.name || user?.email || "Usuario"}
          </p>
          <p className="truncate text-xs text-stone-500">{user?.email}</p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-400 transition-colors hover:bg-rose-500/10 hover:text-rose-600"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}