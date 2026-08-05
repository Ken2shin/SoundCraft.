"use client";
import Link from "next/link";
import { useState } from "react";
import { Check, Crown, X } from "lucide-react";
import Modal from "@/components/ui/Modal";

const FREE_FEATURES = [
  "Ecualizador de 3 bandas en tiempo real",
  "Presets para Batería, Bajo, Guitarra y Voz",
  "3 proyectos activos",
  "Análisis de audio con IA (2 al día)",
  "Reproductor y espectro de frecuencias",
];

const PRO_FEATURES = [
  "Proyectos ilimitados",
  "Exportación HD (WAV 48 kHz)",
  "Análisis de IA ilimitado",
  "Recomendaciones de EQ personalizadas",
  "Acceso anticipado a nuevas funciones",
];

function FeatureList({ items, accent }) {
  return (
    <ul className="mb-8 space-y-3">
      {items.map((f) => (
        <li key={f} className="flex items-start gap-3 text-sm text-stone-300">
          <span
            className={`mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full ${
              accent ? "bg-[#58cc02]/15 text-[#46a302]" : "bg-[#3c3c3c]/[0.07] text-stone-400"
            }`}
          >
            <Check className="h-3 w-3" />
          </span>
          {f}
        </li>
      ))}
    </ul>
  );
}

export default function PlansSection({ compact = false }) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  return (
    <section
      id="precios"
      className={`mx-auto w-full max-w-5xl scroll-mt-24 ${compact ? "" : "py-24"}`}
    >
      <div className="mb-12 text-center">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-[#58cc02]">
          Planes
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-stone-50 sm:text-4xl">
          Empieza en silencio. Sube el volumen cuando toque.
        </h2>
        <p className="mt-3 text-sm text-stone-500">
          Todo el estudio funciona gratis. Pro es para cuando necesitas exportar en HD.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Free */}
        <div className="flex flex-col rounded-xl border border-[#3c3c3c]/12 bg-white p-8">
          <div className="mb-6">
            <p className="font-display text-lg font-semibold text-stone-100">Free</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-stone-500">
              Para aprender
            </p>
          </div>
          <p className="mb-6 flex items-baseline gap-2">
            <span className="font-display text-5xl font-semibold tracking-tight text-stone-50">0 €</span>
            <span className="text-sm text-stone-500">/ para siempre</span>
          </p>
          <FeatureList items={FREE_FEATURES} accent={false} />
          <Link
            href="/auth/signup"
            className="mt-auto rounded-md border border-[#3c3c3c]/15 py-2.5 text-center text-sm font-semibold text-stone-100 transition-colors hover:bg-[#3c3c3c]/[0.05]"
          >
            Empezar gratis
          </Link>
        </div>

        {/* Pro */}
        <div className="relative flex flex-col rounded-xl border border-[#58cc02]/30 bg-gradient-to-b from-[#58cc02]/[0.08] to-transparent p-8 shadow-[0_0_60px_-30px_rgba(88,204,2,0.6)]">
          <span className="absolute -top-3 left-8 rounded-full bg-[#58cc02] px-3.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#ffffff]">
            Más popular
          </span>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="flex items-center gap-2 font-display text-lg font-semibold text-stone-100">
                <Crown className="h-4 w-4 text-[#46a302]" />
                Pro
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-stone-500">
                Para quienes exportan
              </p>
            </div>
            <span className="rounded-full border border-[#58cc02]/25 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-[#46a302]">
              WAV 48 kHz
            </span>
          </div>
          <p className="mb-6 flex items-baseline gap-2">
            <span className="font-display text-5xl font-semibold tracking-tight text-stone-50">4,99 €</span>
            <span className="text-sm text-stone-500">/ mes · sin permanencia</span>
          </p>
          <FeatureList items={PRO_FEATURES} accent />
          <button
            type="button"
            onClick={() => setUpgradeOpen(true)}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-md bg-[#58cc02] py-2.5 text-center text-sm font-bold text-[#ffffff] shadow-[0_0_30px_-10px_rgba(88,204,2,0.9)] transition-all hover:bg-[#46a302]"
          >
            Mejorar a Pro
          </button>
        </div>
      </div>

      <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-stone-600">
        Sin tarjeta para empezar · Cancelas cuando quieras
      </p>

      <Modal open={upgradeOpen} title="Pro · Próximamente" onClose={() => setUpgradeOpen(false)}>
        <p className="text-sm leading-relaxed text-stone-300">
          La integración de pagos está en desarrollo. El plan Pro de 4,99 €/mes habilitará la
          exportación HD en cuanto esté disponible. Mientras tanto, sigue creando con el plan Free.
        </p>
        <div className="mt-6 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-600">
            4,99 €/mes · sin permanencia
          </p>
          <button
            type="button"
            onClick={() => setUpgradeOpen(false)}
            className="inline-flex items-center gap-2 rounded-md bg-[#58cc02] px-4 py-2 text-sm font-semibold text-[#ffffff] transition-colors hover:bg-[#46a302]"
          >
            <X className="h-3.5 w-3.5" />
            Entendido
          </button>
        </div>
      </Modal>
    </section>
  );
}