import Link from "next/link";
import {
  Activity,
  ArrowRight,
  AudioWaveform,
  BrainCircuit,
  ChevronRight,
  CircleDot,
  Gauge,
  Layers,
  Music2,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  Upload,
  Waves,
} from "lucide-react";
import PlansSection from "@/components/pricing/PlansSection";

const FEATURES = [
  {
    n: "01",
    icon: Layers,
    title: "Ecualizador de 3 bandas",
    desc: "Graves, medios y agudos en vivo. Web Audio API + Tone.js, sin latencia perceptible.",
  },
  {
    n: "02",
    icon: Activity,
    title: "Espectro en tiempo real",
    desc: "Mira qué rango domina tu mezcla mientras suena. Aprender a escuchar se vuelve ver.",
  },
  {
    n: "03",
    icon: Music2,
    title: "Presets por instrumento",
    desc: "Batería, Bajo, Guitarra y Voz: curvas probadas, aplicables con un clic.",
  },
  {
    n: "04",
    icon: BrainCircuit,
    title: "Asistente de IA",
    desc: "Análisis espectral con librosa + recomendaciones de EQ en lenguaje natural.",
  },
  {
    n: "05",
    icon: Gauge,
    title: "100% en el navegador",
    desc: "Tu audio nunca sale de tu dispositivo durante la reproducción y el ecualizado.",
  },
  {
    n: "06",
    icon: ShieldCheck,
    title: "Cuenta segura",
    desc: "Autenticación con Firebase Auth y sesiones firmadas con JWT en cookie HttpOnly.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Sube un audio",
    desc: "Arrastra tu canción o grabación al estudio. Se guarda asociada a tu cuenta, no al navegador.",
  },
  {
    n: "02",
    title: "La IA escucha",
    desc: "Librosa extrae el perfil espectral: centroide, RMS y balance de bandas. En segundos.",
  },
  {
    n: "03",
    title: "Ajusta y confirma",
    desc: "Aplica el EQ sugerido, compara con el original en vivo y exporta cuando suene bien.",
  },
];

const STATS = [
  { value: "48 kHz", label: "resolución de exportación" },
  { value: "< 5 ms", label: "latencia de procesado" },
  { value: "4", label: "presets de instrumento" },
  { value: "0", label: "archivos subidos a servidores durante el EQ" },
];

function Logo({ small = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-md bg-[#58cc02] shadow-[0_0_24px_-8px_rgba(88,204,2,0.7)]">
        <AudioWaveform className="h-5 w-5 text-white" />
      </span>
      <span className={`font-display text-[15px] font-semibold tracking-tight text-stone-100 ${small ? "text-sm" : ""}`}>
        SoundCraft
        <span className="text-[#58cc02]">.</span>
      </span>
    </span>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#3c3c3c]/10 bg-[#ffffff]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" aria-label="SoundCraft — inicio">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 font-mono text-[11px] uppercase tracking-[0.22em] text-stone-400 md:flex">
          <a href="#como" className="transition-colors hover:text-stone-100">Cómo funciona</a>
          <a href="#caracteristicas" className="transition-colors hover:text-stone-100">Herramientas</a>
          <a href="#precios" className="transition-colors hover:text-stone-100">Planes</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-stone-300 transition-colors hover:text-stone-100"
          >
            Entrar
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-md bg-[#58cc02] px-4 py-2 text-sm font-semibold text-[#ffffff] shadow-[0_0_24px_-6px_rgba(88,204,2,0.8)] transition-all hover:bg-[#46a302]"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </header>
  );
}

function DummyStudio() {
  const bars = Array.from({ length: 72 });
  return (
    <div className="relative mx-auto mt-16 max-w-4xl overflow-hidden rounded-xl border border-[#3c3c3c]/12 bg-white text-left shadow-[0_40px_120px_-40px_rgba(88,204,2,0.25)]">
      <div className="flex items-center gap-2 border-b border-[#3c3c3c]/10 bg-[#f2f8e8] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#58cc02]/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#1cb0f6]/40" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#3c3c3c]/15" />
        <span className="ml-3 font-mono text-[11px] text-stone-500">
          sesion/primera_mezcla.wav — SoundCraft Studio
        </span>
        <span className="ml-auto hidden items-center gap-1.5 font-mono text-[10px] text-stone-500 sm:flex">
          <CircleDot className="h-2.5 w-2.5 text-[#58cc02]" /> 48.0 kHz · ST
        </span>
      </div>

      <div className="flex">
        {/* Faders EQ */}
        <div className="hidden w-40 shrink-0 border-r border-[#3c3c3c]/10 p-4 sm:block">
          <p className="mb-4 font-mono text-[9px] uppercase tracking-[0.25em] text-stone-500">EQ — 3 bandas</p>
          <div className="space-y-4">
            {[
              { name: "LOW", hz: "100 Hz", v: 55 },
              { name: "MID", hz: "1 kHz", v: 70 },
              { name: "HIGH", hz: "8 kHz", v: 38 },
            ].map((b) => (
              <div key={b.name} className="flex items-end gap-3">
                <div className="relative flex h-24 w-2 items-end rounded-full bg-[#3c3c3c]/[0.08]">
                  <div
                    className="w-2 rounded-full bg-gradient-to-t from-[#58cc02] to-[#b9e38c]"
                    style={{ height: `${b.v}%` }}
                  />
                </div>
                <div className="pb-1">
                  <p className="font-mono text-[10px] font-semibold text-stone-300">{b.name}</p>
                  <p className="font-mono text-[9px] text-stone-500">{b.hz}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-[#46a302]">
                    {b.v > 50 ? "+" : ""}
                    {Math.round((b.v - 50) / 4) * 2} dB
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Waveform + spectrum */}
        <div className="min-w-0 flex-1 p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded bg-[#58cc02]">
              <Play className="h-3 w-3 fill-[#ffffff] text-[#ffffff]" />
            </span>
            <span className="grid h-6 w-6 place-items-center rounded bg-[#3c3c3c]/[0.08]">
              <Pause className="h-3 w-3 text-stone-300" />
            </span>
            <span className="font-mono text-[11px] tabular-nums text-stone-300">00:00:14.20</span>
            <span className="ml-auto rounded border border-[#58cc02]/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[#46a302]">
              Loop
            </span>
          </div>

          <div className="relative flex h-16 items-center gap-[2px]">
            {bars.map((_, i) => {
              const h = 8 + ((i * 41 + 13) % 52);
              const past = i < 46;
              return (
                <span
                  key={i}
                  className={`w-[3px] shrink-0 rounded-sm ${past ? "bg-[#58cc02]/80" : "bg-[#3c3c3c]/[0.1]"}`}
                  style={{ height: `${h}px` }}
                />
              );
            })}
            <span className="absolute bottom-0 left-[64%] h-full w-px bg-[#1cb0f6]/70">
              <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-[#1cb0f6]" />
            </span>
          </div>

          <div className="mt-4 flex h-16 items-end gap-[3px]">
            {Array.from({ length: 56 }).map((_, i) => (
              <span
                key={i}
                className="flex-1 rounded-t"
                style={{
                  height: `${10 + ((i * 37) % 55)}%`,
                  background:
                    i < 14
                      ? "rgba(28,176,246,.75)"
                      : i < 40
                        ? "rgba(255,200,0,.7)"
                        : "rgba(255,75,75,.75)",
                }}
              />
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between font-mono text-[9px] text-stone-600">
            <span>20 Hz</span>
            <span>200 Hz</span>
            <span>2 kHz</span>
            <span>20 kHz</span>
          </div>
        </div>
      </div>

      {/* Insight de la IA */}
      <div className="flex items-start gap-3 border-t border-[#3c3c3c]/10 bg-[#ffffff]/60 px-4 py-3">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1cb0f6]" />
        <p className="text-xs leading-relaxed text-stone-400">
          <span className="font-semibold text-stone-200">Análisis de la IA:</span> tu mezcla pierde
          presencia entre 2–4 kHz. Sugerencia:{" "}
          <span className="font-mono text-[#1cb0f6]">+2 dB @ MID</span> para que la voz corte con
          claridad.
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="bg-[#ffffff]">
      <Nav />

      {/* Hero */}
      <section className="grain relative overflow-hidden">
        <div className="hero-grid absolute inset-x-0 top-0 h-[560px]" />
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(88,204,2,0.14),transparent)] blur-2xl" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#ffffff]" />

        <div className="relative z-10 mx-auto max-w-6xl px-6 pb-10 pt-20 text-center sm:pt-24">
          <p className="mx-auto mb-6 inline-flex items-center gap-2.5 rounded-full border border-[#3c3c3c]/12 bg-[#3c3c3c]/[0.03] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.28em] text-stone-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#58cc02] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#58cc02]" />
            </span>
            Estudio de mezcla con IA
          </p>

          <h1 className="mx-auto max-w-4xl font-display text-[2.6rem] font-semibold leading-[1.04] tracking-tight text-stone-50 sm:text-6xl lg:text-7xl">
            Mezcla con el oído.
            <br />
            <span className="text-stone-400">Confirma con los </span>
            <span className="relative whitespace-nowrap text-[#58cc02]">
              datos
              <span className="absolute -bottom-1 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#58cc02]/70 to-transparent" />
            </span>
            .
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-stone-400 sm:text-lg">
            SoundCraft analiza tu audio con inteligencia artificial, te enseña qué está pasando en
            cada banda y ecualiza en tiempo real. Todo dentro del navegador, sin tocar tu archivo.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="group inline-flex items-center gap-2 rounded-md bg-[#58cc02] px-6 py-3 text-sm font-bold text-[#ffffff] shadow-[0_0_40px_-8px_rgba(88,204,2,0.9)] transition-all hover:bg-[#46a302]"
            >
              Empezar a mezclar
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#como"
              className="inline-flex items-center gap-2 rounded-md border border-[#3c3c3c]/15 px-6 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-[#3c3c3c]/[0.05]"
            >
              <Play className="h-3.5 w-3.5" />
              Ver cómo funciona
            </Link>
          </div>

          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-stone-600">
            Gratis · Sin instalar · Tu audio no sale del dispositivo
          </p>

          <DummyStudio />
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/[0.05] bg-[#f6f9f0]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="px-6 py-8 text-center">
              <p className="font-display text-3xl font-semibold tracking-tight text-stone-100">{s.value}</p>
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-[#58cc02]">
          El método
        </p>
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-xl font-display text-3xl font-semibold tracking-tight text-stone-50 sm:text-4xl">
            Tres pasos. De la intuición al dato.
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-stone-500">
            No hace falta ser ingeniero de sonido. El análisis hace el trabajo técnico; tú decides
            con el oído.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.n} className="group relative rounded-xl border border-[#3c3c3c]/10 bg-white p-6 transition-colors hover:border-[#58cc02]/30">
              <span className="mb-8 block font-mono text-sm text-[#58cc02]">{step.n}</span>
              <div className="flex items-center gap-2 text-[#58cc02]/60">
                {i === 0 && <Upload className="h-4 w-4" />}
                {i === 1 && <BrainCircuit className="h-4 w-4" />}
                {i === 2 && <Waves className="h-4 w-4" />}
              </div>
              <h3 className="mt-2 font-display text-lg font-semibold text-stone-100">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-400">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Características */}
      <section id="caracteristicas" className="border-t border-white/[0.05] bg-[#f6f9f0]">
        <div className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-[#58cc02]">
            Herramientas
          </p>
          <h2 className="mb-12 max-w-2xl font-display text-3xl font-semibold tracking-tight text-stone-50 sm:text-4xl">
            Un estudio completo, dentro del navegador.
          </h2>
          <div className="grid gap-px overflow-hidden rounded-xl border border-[#3c3c3c]/10 bg-[#3c3c3c]/[0.06] sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="group bg-[#f6f9f0] p-7 transition-colors hover:bg-white">
                <div className="mb-10 flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-md border border-[#3c3c3c]/12 bg-[#3c3c3c]/[0.03]">
                    <f.icon className="h-4 w-4 text-[#46a302]" />
                  </span>
                  <span className="font-mono text-[10px] text-stone-600 transition-colors group-hover:text-[#58cc02]">
                    {f.n}
                  </span>
                </div>
                <h3 className="font-display text-base font-semibold text-stone-100">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cita */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="mx-auto font-display text-xl font-medium leading-relaxed text-stone-200 sm:text-2xl">
          «No sabía por qué mis mezclas sonaban planas. Ahora veo el espectro, aplico la sugerencia
          y lo escucho al instante. Es como tener un ingeniero al lado.»
        </p>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.25em] text-stone-500">
          — Estudiante de producción musical
        </p>
      </section>

      {/* Planes */}
      <PlansSection />

      {/* Footer */}
      <footer className="border-t border-white/[0.05] bg-[#f6f9f0]">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-stone-500">
              Procesamiento de audio con inteligencia artificial, pensado para músicos que quieren
              entender sus propias mezclas.
            </p>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.25em] text-stone-600">
              Hecho para músicos · 48 kHz · 2026
            </p>
          </div>
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-stone-500">Producto</p>
            <ul className="space-y-2.5 text-sm text-stone-400">
              <li><a href="#como" className="transition-colors hover:text-stone-100">Cómo funciona</a></li>
              <li><a href="#caracteristicas" className="transition-colors hover:text-stone-100">Herramientas</a></li>
              <li><a href="#precios" className="transition-colors hover:text-stone-100">Planes</a></li>
            </ul>
          </div>
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-stone-500">Cuenta</p>
            <ul className="space-y-2.5 text-sm text-stone-400">
              <li><Link href="/auth/signup" className="transition-colors hover:text-stone-100">Crear cuenta</Link></li>
              <li><Link href="/auth/login" className="transition-colors hover:text-stone-100">Iniciar sesión</Link></li>
              <li><Link href="/planes" className="transition-colors hover:text-stone-100">Ver planes</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/[0.05] py-6 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-stone-600">
          <ChevronRight className="mr-1 inline h-3 w-3 text-[#58cc02]" />
          Tu audio se procesa en tu dispositivo. Siempre.
        </div>
      </footer>
    </div>
  );
}