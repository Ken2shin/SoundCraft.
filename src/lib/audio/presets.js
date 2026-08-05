export const EQ_BOUNDS = { min: -12, max: 12, step: 0.5 };

export const DEFAULT_EQ = { low: 0, mid: 0, high: 0 };

export const PRESETS = {
  Flat: {
    label: "Flat",
    icon: "waveform",
    low: 0,
    mid: 0,
    high: 0,
    description: "Respuesta plana, sin procesar",
  },
  Bateria: {
    label: "Batería",
    icon: "drum",
    low: 5,
    mid: 1,
    high: 4,
    description: "Golpe, pegada y brillo de la batería",
  },
  Bajo: {
    label: "Bajo",
    icon: "bass",
    low: 6,
    mid: -2,
    high: -3,
    description: "Profundidad y cuerpo del bajo",
  },
  Guitarra: {
    label: "Guitarra",
    icon: "guitar",
    low: -1,
    mid: 3,
    high: 4,
    description: "Claridad y ataque de la guitarra",
  },
  Voz: {
    label: "Voz",
    icon: "mic",
    low: -2,
    mid: 4,
    high: 3,
    description: "Presencia y definición vocal",
  },
};

export const BANDS = [
  { id: "low", label: "Graves", range: "20 – 400 Hz" },
  { id: "mid", label: "Medios", range: "400 Hz – 2.5 kHz" },
  { id: "high", label: "Agudos", range: "2.5 – 20 kHz" },
];

export const PRESET_KEYS = Object.keys(PRESETS);