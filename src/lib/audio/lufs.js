// Análisis aproximado de LUFS (loudness) y normalización para streaming.
// Basado en EBU R128 simplificado: K-weighting + gating ≈ RMS ponderado.
// Funciona en el navegador (OfflineAudioContext).

const K_WEIGHTING = {
  // coeficientes aproximados de pre-emphasis para K-weighting
  // high-shelf + high-pass. Aquí simplificado: aplicamos un filtro 
  // high-pass ~38 Hz y un high-shelf ~1.5 kHz.
  prefilterCoeffs: null, // se calcula dinámicamente
};

function makeKWeightingFilter(ctx) {
  // High-pass 2do orden a 38 Hz
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 38;
  hp.Q.value = 0.7071;
  // High-shelf +4 dB a 1.5 kHz (aprox K-weighting)
  const hs = ctx.createBiquadFilter();
  hs.type = "highshelf";
  hs.frequency.value = 1500;
  hs.gain.value = 4;
  return { hp, hs };
}

/**
 * Calcula LUFS integrado aproximado del buffer.
 * @param {AudioBuffer} buffer
 * @returns {Promise<{ lufs: number, truePeak: number }>}
 */
export async function computeLufs(buffer) {
  const ctx = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const { hp, hs } = makeKWeightingFilter(ctx);
  source.connect(hp);
  hp.connect(hs);
  hs.connect(ctx.destination);
  source.start();

  const rendered = await ctx.startRendering();
  const data = rendered.getChannelData(0);

  // Bloques de 400 ms (EBU R128)
  const blockSize = Math.max(1, Math.floor(0.4 * buffer.sampleRate));
  let sumBlocks = 0;
  let blocks = 0;
  let truePeak = 0;

  for (let i = 0; i < data.length; i++) {
    const v = Math.abs(data[i]);
    if (v > truePeak) truePeak = v;
  }

  // Promedio de potencia en bloques (mean square)
  let msSum = 0;
  for (let i = 0; i < data.length; i += blockSize) {
    const end = Math.min(i + blockSize, data.length);
    let blockSum = 0;
    for (let j = i; j < end; j++) blockSum += data[j] * data[j];
    const meanSquare = blockSum / (end - i);
    if (meanSquare > 0) {
      // Gating absoluto a -70 LUFS (muy bajo, ignoramos silencio)
      if (10 * Math.log10(meanSquare) > -70) {
        msSum += meanSquare;
        blocks++;
      }
    }
  }

  if (blocks === 0) return { lufs: -Infinity, truePeak: 0 };

  const meanSquare = msSum / blocks;
  const lufs = 10 * Math.log10(meanSquare);
  // True peak en dBFS
  const tp = truePeak > 0 ? 20 * Math.log10(truePeak) : -Infinity;

  return { lufs, truePeak: tp };
}

/**
 * Normaliza un buffer al LUFS objetivo y devuelve un nuevo AudioBuffer.
 * @param {AudioBuffer} buffer
 * @param {number} targetLufs  (ej. -14 para Spotify, -16 para Apple)
 * @param {boolean} limiter  si true aplica un ceiling suave en -1 dBTP
 * @returns {Promise<AudioBuffer>}
 */
export async function normalizeLufs(buffer, targetLufs = -14, limiter = true) {
  const { lufs } = await computeLufs(buffer);
  if (!Number.isFinite(lufs)) return buffer;

  const gainDb = targetLufs - lufs;
  const gainLin = Math.pow(10, gainDb / 20);

  const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = gainLin;
  source.connect(gain);
  gain.connect(ctx.destination);

  if (limiter) {
    // soft ceiling -1 dBTP ≈ 0.89 linear
    const ceiling = Math.pow(10, -1 / 20);
    const waveshaper = ctx.createWaveShaper();
    const curve = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) {
      const x = (i / 2048) - 1;
      const y = Math.max(-ceiling, Math.min(ceiling, x * gainLin / ceiling));
      curve[i] = y;
    }
    waveshaper.curve = curve;
    waveshaper.oversample = "4x";
    gain.connect(waveshaper);
    waveshaper.connect(ctx.destination);
  }

  source.start();
  return ctx.startRendering();
}

/**
 * Exporta un buffer normalizado a Blob WAV (16-bit PCM).
 * @param {AudioBuffer} buffer
 * @returns {Blob}
 */
export function encodeWav(buffer) {
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const bitsPerSample = 16;
  const length = buffer.length * numChannels * 2;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + length, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, length, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

/**
 * Descarga un Blob como archivo.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}