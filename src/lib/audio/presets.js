export const EQ_BOUNDS = { min: -12, max: 12, step: 0.5 };

export const DEFAULT_EQ = { low: 0, mid: 0, high: 0 };

export const PRESETS = {
  Flat: {
    label: "Mezcla completa",
    icon: "waveform",
    low: 0,
    mid: 0,
    high: 0,
    description: "Respuesta plana, sin procesar",
    range: null,
  },
  Bateria: {
    label: "Batería",
    icon: "drum",
    low: 5,
    mid: 1,
    high: 4,
    description: "Golpe, pegada y brillo de la batería",
    range: { low: 50, high: 3500 },
  },
  Bajo: {
    label: "Bajo",
    icon: "bass",
    low: 6,
    mid: -2,
    high: -3,
    description: "Profundidad y cuerpo del bajo",
    range: { low: 30, high: 350 },
  },
  Guitarra: {
    label: "Guitarra",
    icon: "guitar",
    low: -1,
    mid: 3,
    high: 4,
    description: "Claridad y ataque de la guitarra",
    range: { low: 350, high: 2500 },
  },
  Voz: {
    label: "Voz",
    icon: "mic",
    low: -2,
    mid: 4,
    high: 3,
    description: "Presencia y definición vocal",
    range: { low: 250, high: 3000 },
  },
  Trompeta: {
    label: "Trompeta",
    icon: "horn",
    low: -1,
    mid: 3,
    high: 5,
    description: "Brillo y cuerpo de la trompeta",
    range: { low: 150, high: 3500 },
  },
  Saxo: {
    label: "Saxo",
    icon: "sax",
    low: -3,
    mid: 3,
    high: 2,
    description: "Calidez y sonido del saxo",
    range: { low: 200, high: 4000 },
  },
  Piano: {
    label: "Piano",
    icon: "keyboard",
    low: -2,
    mid: 2,
    high: 4,
    description: "Ataque y brillo del piano",
    range: { low: 200, high: 5000 },
  },
  Sintetizador: {
    label: "Synth",
    icon: "synth",
    low: -1,
    mid: 1,
    high: 3,
    description: "Cuerpo y presencia del sintetizador",
    range: { low: 250, high: 6000 },
  },
  Coros: {
    label: "Coros",
    icon: "crowd",
    low: -1,
    mid: 3,
    high: 5,
    description: "Presencia de las voces de fondo",
    range: { low: 300, high: 4000 },
  },
};

export const BANDS = [
  { id: "low", label: "Graves", range: "20 – 400 Hz" },
  { id: "mid", label: "Medios", range: "400 Hz – 2.5 kHz" },
  { id: "high", label: "Agudos", range: "2.5 – 20 kHz" },
];

export const PRESET_KEYS = Object.keys(PRESETS);