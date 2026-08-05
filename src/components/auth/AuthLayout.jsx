import Link from "next/link";
import { ArrowLeft, AudioWaveform, Gauge, Sparkles, Waves } from "lucide-react";

const VALUES = [
  {
    icon: Waves,
    title: "Ecualización en tiempo real",
    desc: "Tres bandas con respuesta inmediata, sin subir tu archivo a ningún servidor.",
  },
  {
    icon: Gauge,
    title: "Datos que se entienden",
    desc: "Espectro, niveles y curvas claras para cualquiera que empiece hoy.",
  },
  {
    icon: Sparkles,
    title: "IA que acompaña",
    desc: "Análisis espectral y recomendaciones en lenguaje natural, no jerga técnica.",
  },
];

export default function AuthLayout({ children }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#ffffff]">
      <div className="hero-grid absolute inset-x-0 top-0 h-[420px]" />
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[420px] w-[560px] rounded-full bg-[radial-gradient(closest-side,rgba(88,204,2,0.12),transparent)] blur-2xl" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center gap-16 px-6 py-10">
        {/* Panel editorial (escritorio) */}
        <div className="hidden flex-1 lg:block">
          <Link href="/" className="mb-16 inline-flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-[#58cc02] shadow-[0_0_20px_-6px_rgba(88,204,2,0.7)]">
              <AudioWaveform className="h-5 w-5 text-white" />
            </span>
            <span className="font-display text-[15px] font-semibold tracking-tight text-stone-100">
              SoundCraft<span className="text-[#58cc02]">.</span>
            </span>
          </Link>

          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-[#58cc02]">
            Tu estudio, en el navegador
          </p>
          <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-stone-50">
            Aprende a escuchar.
            <br />
            Confía en tu oído,
            <br />
            <span className="text-[#58cc02]">apóyate en los datos.</span>
          </h1>

          <div className="mt-12 space-y-6">
            {VALUES.map((v) => (
              <div key={v.title} className="flex items-start gap-4">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#3c3c3c]/12 bg-[#3c3c3c]/[0.03]">
                  <v.icon className="h-4 w-4 text-[#46a302]" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-stone-100">{v.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-stone-500">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-14 font-mono text-[10px] uppercase tracking-[0.25em] text-stone-600">
            48 kHz · Latencia ≈ 0 · Procesado local
          </p>
        </div>

        {/* Columna de formulario */}
        <div className="mx-auto w-full max-w-md lg:mx-0 lg:flex-1">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 transition-colors hover:text-stone-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al inicio
          </Link>
          {children}
        </div>
      </div>
    </main>
  );
}