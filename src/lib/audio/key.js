// Detección de tonalidad (key) por cromagrama (HPCP simplificado).
// Uso: detectKey(buffer) → { key: "C mayor", altKey: "A menor", confidence: 0.72 }

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Perfiles de Krumhansl-Schmuckler para mayor/menor (ponderaciones de grados)
const MAJOR_PROFILE = [
  6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
];
const MINOR_PROFILE = [
  6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
];

function normalize(arr) {
  const sum = arr.reduce((a, b) => a + b, 0);
  return sum ? arr.map((v) => v / sum) : arr;
}

const MAJ_NORM = normalize(MAJOR_PROFILE);
const MIN_NORM = normalize(MINOR_PROFILE);

/**
 * Calcula el cromagrama (energy per pitch class) del buffer.
 * @param {AudioBuffer} buffer
 * @returns {Float32Array[12]} energía normalizada por clase de altura
 */
export async function computeChromagram(buffer) {
  const sampleRate = buffer.sampleRate;
  const data = buffer.getChannelData(0);
  const fftSize = 4096;
  const hopSize = 2048;
  const chroma = new Float32Array(12);

  // Ventana de Hann
  const window = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
  }

  const binsPerSemitone = fftSize / sampleRate * 440 * Math.pow(2, 1 / 12); // aproximado
  // Usamos mapeo directo bin -> semitone via frecuencia
  const binToFreq = (bin) => (bin * sampleRate) / fftSize;

  for (let start = 0; start + fftSize <= data.length; start += hopSize) {
    const frame = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      frame[i] = data[start + i] * window[i];
    }
    // DFT simple solo para bins necesarios (0..fftSize/2)
    const mag = new Float32Array(fftSize / 2);
    for (let k = 0; k < fftSize / 2; k++) {
      let re = 0,
        im = 0;
      for (let n = 0; n < fftSize; n++) {
        const angle = (-2 * Math.PI * k * n) / fftSize;
        re += frame[n] * Math.cos(angle);
        im -= frame[n] * Math.sin(angle);
      }
      mag[k] = Math.sqrt(re * re + im * im);
    }
    // Acumular energía en 12 clases de altura
    for (let k = 1; k < fftSize / 2; k++) {
      const freq = binToFreq(k);
      if (freq < 30 || freq > 4000) continue;
      // MIDI note number
      const midi = 69 + 12 * Math.log2(freq / 440);
      const pc = Math.round(midi) % 12;
      if (pc >= 0 && pc < 12) chroma[pc] += mag[k] * mag[k];
    }
  }

  // Normalizar
  const sum = chroma.reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (let i = 0; i < 12; i++) chroma[i] /= sum;
  }
  return chroma;
}

function correlate(chroma, profile) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += chroma[i] * profile[i];
  return sum;
}

/**
 * Detecta la tonalidad principal (mayor/menor) a partir del cromagrama.
 * @param {Float32Array[12]} chroma
 * @returns {{key:string, altKey:string, confidence:number}}
 */
export function detectKeyFromChroma(chroma) {
  let best = { tonic: 0, mode: "major", score: -1 };
  for (let tonic = 0; tonic < 12; tonic++) {
    // Rotar perfil para que coincida con tónica
    const rotMajor = MAJ_NORM.map((_, i) => MAJ_NORM[(i - tonic + 12) % 12]);
    const rotMinor = MIN_NORM.map((_, i) => MIN_NORM[(i - tonic + 12) % 12]);
    const scoreMaj = correlate(chroma, rotMajor);
    const scoreMin = correlate(chroma, rotMinor);
    if (scoreMaj > best.score) best = { tonic, mode: "major", score: scoreMaj };
    if (scoreMin > best.score) best = { tonic, mode: "minor", score: scoreMin };
  }
  const keyName = NOTE_NAMES[best.tonic] + (best.mode === "major" ? " mayor" : " menor");
  const relTonic = (best.tonic + (best.mode === "major" ? 9 : 3)) % 12;
  const relMode = best.mode === "major" ? "menor" : "mayor";
  const altKey = NOTE_NAMES[relTonic] + " " + relMode;
  // Confianza normalizada 0-1
  const confidence = Math.max(0, Math.min(1, (best.score + 0.2) / 1.2));
  return { key: keyName, altKey, confidence };
}

/**
 * Pipeline completo: buffer → cromagrama → tonalidad.
 * @param {AudioBuffer} buffer
 * @returns {Promise<{key:string, altKey:string, confidence:number, chroma:Float32Array}>}
 */
export async function detectKey(buffer) {
  const chroma = await computeChromagram(buffer);
  const { key, altKey, confidence } = detectKeyFromChroma(chroma);
  return { key, altKey, confidence, chroma };
}