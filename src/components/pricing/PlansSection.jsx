"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Check, Crown, Loader2 } from "lucide-react";

const PLANS = [
  {
    id: "free",
    name: "Free",
    tagline: "Para arrancar",
    price: "0 €",
    period: "/ para siempre",
    badge: null,
    features: [
      "Ecualizador de 3 bandas en tiempo real",
      "Presets para Batería, Bajo, Guitarra y Voz",
      "Reproductor y espectro de frecuencias",
      "Análisis de audio con IA",
      "3 proyectos activos",
    ],
    highlight: false,
  },
  {
    id: "estudio",
    name: "Estudio",
    tagline: "Para producir en serio",
    price: "2,99 €",
    period: "/ mes · sin permanencia",
    badge: "Más popular",
    features: [
      "Todo lo del plan Free",
      "10 proyectos activos",
      "Análisis de IA ilimitado",
      "Recomendaciones de EQ personalizadas",
      "Exportación WAV",
      "Acceso anticipado a nuevas funciones",
    ],
    highlight: true,
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Para quienes exportan",
    price: "4,99 €",
    period: "/ mes · sin permanencia",
    badge: "Profesional",
    features: [
      "Todo lo del plan Estudio",
      "Proyectos ilimitados",
      "Exportación HD (WAV 48 kHz)",
      "Prioridad en el análisis de IA",
      "Soporte prioritario",
      "Etiquetas y organización avanzadas",
    ],
    highlight: false,
  },
];

const CURRENT_BADGE = "Tu plan actual";

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

export default function PlansSection({ compact = false, user = null }) {
  const searchParams = useSearchParams();
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [checkoutError, setCheckoutError] = useState("");
  const currentPlan = user?.plan === "pro" ? "pro" : user?.plan === "estudio" ? "estudio" : "free";
  const isLoggedIn = Boolean(user?.id || user?.email);

  const justUpgraded = searchParams.get("upgrade") === "success";
  const cancelledUpgrade = searchParams.get("upgrade") === "cancelled";

  const freeCta = isLoggedIn
    ? { href: "/dashboard", label: "Ir a mis proyectos" }
    : { href: "/auth/signup", label: "Empezar gratis" };

  const startCheckout = async (planId) => {
    setCheckoutError("");
    setCheckoutPlan(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo iniciar el pago");
      window.open(json.url, "_self", "noopener");
    } catch (err) {
      setCheckoutError(err.message);
      setCheckoutPlan(null);
    }
  };

  return (
    <section
      id="precios"
      className={`mx-auto w-full max-w-6xl scroll-mt-24 ${compact ? "" : "py-24"}`}
    >
      <div className="mb-12 text-center">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-[#58cc02]">
          Planes
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-stone-50 sm:text-4xl">
          Empieza en silencio. Sube el volumen cuando toque.
        </h2>
        <p className="mt-3 text-sm text-stone-500">
          Todo el estudio funciona gratis. Estudio y Pro son para cuando necesitas exportar o producir más.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-xl border p-8 ${
                plan.highlight
                  ? "border-[#58cc02]/30 bg-gradient-to-b from-[#58cc02]/[0.08] to-transparent shadow-[0_0_60px_-30px_rgba(88,204,2,0.6)]"
                  : "border-[#3c3c3c]/12 bg-white"
              }`}
            >
              {(plan.badge || isCurrent) && (
                <span
                  className={`absolute -top-3 left-8 rounded-full px-3.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] ${
                    isCurrent
                      ? "bg-indigo-500 text-white"
                      : "bg-[#58cc02] text-[#ffffff]"
                  }`}
                >
                  {isCurrent ? CURRENT_BADGE : plan.badge}
                </span>
              )}

              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="flex items-center gap-2 font-display text-lg font-semibold text-stone-100">
                    <Crown className="h-4 w-4 text-[#46a302]" />
                    {plan.name}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-stone-500">
                    {plan.tagline}
                  </p>
                </div>
              </div>

              <p className="mb-6 flex items-baseline gap-2">
                <span className="font-display text-5xl font-semibold tracking-tight text-stone-50">{plan.price}</span>
                <span className="text-sm text-stone-500">{plan.period}</span>
              </p>

              <FeatureList items={plan.features} accent={plan.highlight} />

              {isCurrent ? (
                <div className="mt-auto rounded-md border border-indigo-500/30 bg-indigo-500/10 py-2.5 text-center text-sm font-semibold text-indigo-400">
                  Este es tu plan
                </div>
              ) : plan.id === "free" ? (
                <Link
                  href={freeCta.href}
                  className="mt-auto rounded-md border border-[#3c3c3c]/15 py-2.5 text-center text-sm font-semibold text-stone-100 transition-colors hover:bg-[#3c3c3c]/[0.05]"
                >
                  {freeCta.label}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => startCheckout(plan.id)}
                  disabled={checkoutPlan === plan.id}
                  className={`mt-auto inline-flex items-center justify-center gap-2 rounded-md py-2.5 text-center text-sm font-bold text-[#ffffff] shadow-[0_0_30px_-10px_rgba(88,204,2,0.9)] transition-all hover:bg-[#46a302] disabled:cursor-not-allowed disabled:opacity-60 ${
                    plan.id === "pro" ? "bg-[#58cc02]" : "bg-[#46a302]"
                  }`}
                >
                  {checkoutPlan === plan.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Abriendo pago…
                    </>
                  ) : (
                    `Mejorar a ${plan.name}`
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 space-y-2">
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.25em] text-stone-600">
          Sin tarjeta para empezar · Cancelas cuando quieras
        </p>
        {justUpgraded && (
          <p className="mx-auto max-w-md rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-center text-sm text-emerald-600">
            ¡Pago completado! Tu plan premium está activo.
          </p>
        )}
        {cancelledUpgrade && (
          <p className="mx-auto max-w-md rounded-lg border border-stone-500/30 bg-stone-500/10 px-3 py-2 text-center text-sm text-stone-400">
            El pago se canceló. Tu plan no ha cambiado.
          </p>
        )}
        {checkoutError && (
          <p className="mx-auto max-w-md rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-center text-sm text-rose-600">
            {checkoutError}
          </p>
        )}
      </div>
    </section>
  );
}