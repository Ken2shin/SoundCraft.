export const PLAN_LEVELS = { free: 0, estudio: 1, pro: 2, enterprise: 3 };

export const PROJECT_LIMITS = { free: 3, estudio: 10, pro: Infinity, enterprise: Infinity };

export const PLAN_LABELS = { free: "Free", estudio: "Estudio", pro: "Pro", enterprise: "Enterprise" };

// Precio en céntimos/mes (para la UI y para Stripe).
export const PLAN_PRICES = { free: 0, estudio: 299, pro: 499, enterprise: 1999 };

export const PLAN_CURRENCY = "USD";
export const PLAN_CURRENCY_SYMBOL = "$";
export const PLAN_PRICE_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export function resolvePlan(plan) {
  return plan in PLAN_LEVELS ? plan : "free";
}

export function planLevel(plan) {
  return PLAN_LEVELS[resolvePlan(plan)] ?? 0;
}

export function planLabel(plan) {
  return PLAN_LABELS[resolvePlan(plan)];
}

// ---- Gating de capacidades base (misma UI para todos) ----
export const canUseAI = (plan) => planLevel(plan) >= PLAN_LEVELS.estudio;
export const canUseSolo = (plan) => planLevel(plan) >= PLAN_LEVELS.estudio;
export const canExport = (plan) => planLevel(plan) >= PLAN_LEVELS.estudio; // WAV en Estudio
export const canExportHD = (plan) => planLevel(plan) >= PLAN_LEVELS.pro; // WAV 48 kHz / 24-bit en Pro
export const canViralExport = (plan) => planLevel(plan) >= PLAN_LEVELS.enterprise;

export function projectLimitFor(plan) {
  return PROJECT_LIMITS[resolvePlan(plan)] ?? PROJECT_LIMITS.free;
}

export function isPaid(plan) {
  return planLevel(plan) >= PLAN_LEVELS.estudio;
}

// ---- Módulo de Mejora ----
// Cada módulo tiene un "tier" por plan: 0 = no disponible, 3 = completo.
// Enterprise lo desbloquea todo al máximo.
const MODULE_TIERS = {
  // Corrección de notas vocales
  autopitch: { free: 0, estudio: 1, pro: 2, enterprise: 3 },
  // Denoiser & Stem Splitter
  denoiser: { free: 0, estudio: 1, pro: 2, enterprise: 3 },
  // A/B Reference Matcher
  reference: { free: 0, estudio: 1, pro: 2, enterprise: 3 },
  // Instant Master (LUFS)
  master: { free: 0, estudio: 1, pro: 2, enterprise: 3 },
  // Chord Progression Generator (IA)
  chords: { free: 0, estudio: 1, pro: 2, enterprise: 3 },
  // Conversor de formatos
  converter: { free: 0, estudio: 1, pro: 2, enterprise: 3 },
  // Tap Tempo & Key Finder
  tapping: { free: 1, estudio: 2, pro: 2, enterprise: 3 },
  // Copyright & Metadatos
  copyright: { free: 0, estudio: 1, pro: 2, enterprise: 3 },
  // Engineer Marketplace
  marketplace: { free: 0, estudio: 1, pro: 2, enterprise: 3 },
  // Daily Challenges
  challenges: { free: 1, estudio: 2, pro: 3, enterprise: 3 },
};

export const MODULES = [
  {
    id: "autopitch",
    name: "Auto-Pitch",
    short: "Corrector de notas",
    desc: "Detecta la nota vocal, muestra la desviación en cents y corrige la afinación con un deslizador.",
  },
  {
    id: "denoiser",
    name: "Denoiser & Stems",
    short: "Limpieza y aislamiento",
    desc: "Reduce ruido de fondo y aísla por frecuencia voz e instrumentos (aprox. sin IA de servidor).",
  },
  {
    id: "reference",
    name: "A/B Reference",
    short: "Compara con tu referente",
    desc: "Analiza la mezcla de referencia y compara volumen, espectro y banda dominante con tu pista.",
  },
  {
    id: "master",
    name: "Instant Master",
    short: "Normalización LUFS",
    desc: "Aplica volumen estándar de streaming (Spotify, YouTube, Apple) a tu mezcla lista para subir.",
  },
  {
    id: "chords",
    name: "Generator IA",
    short: "Progresiones de acordes",
    desc: "Genera progresiones de acordes con IA para letristas y compositores.",
  },
  {
    id: "converter",
    name: "Convertidor",
    short: "Formatos y calidad",
    desc: "Convierte tu proyecto a WAV en distintas calidades, tasas y estéreo/mono.",
  },
  {
    id: "tapping",
    name: "Tap Tempo & Key",
    short: "BPM y tonalidad",
    desc: "Detecta el BPM al ritmo del tap y encuentra la tonalidad aproximada de tu audio.",
  },
  {
    id: "copyright",
    name: "Copyright",
    short: "Registro y metadatos",
    desc: "Registra autoría, desglosa un hash del audio y adjunta ISRC/UPC para proteger tu obra.",
  },
  {
    id: "marketplace",
    name: "Marketplace",
    short: "Ingenieros por presupuesto",
    desc: "Obtén una estimación de presupuesto y contacta con ingenieros de mezcla y masterizacación.",
  },
  {
    id: "challenges",
    name: "Retos diarios",
    short: "Gamificación",
    desc: "Retos de producción diarios con XP para practicar y mejorar tu técnica.",
  },
];

export function moduleTier(plan, moduleId) {
  const cfg = MODULE_TIERS[moduleId];
  if (!cfg) return 0;
  return cfg[resolvePlan(plan)] ?? 0;
}

export function moduleAvailable(plan, moduleId) {
  return moduleTier(plan, moduleId) > 0;
}

export function isModuleAdvanced(plan, moduleId) {
  return moduleTier(plan, moduleId) >= 2;
}

export function isModuleEnterprise(plan, moduleId) {
  return moduleTier(plan, moduleId) >= 3;
}