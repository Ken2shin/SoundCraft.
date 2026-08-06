// Conversión de formatos y re-muestreo en el navegador (OfflineAudioContext).
// Soporta: WAV 16/24-bit, sample rate 44100/48000/96000, mono/estéreo.
// NOTA: MP3/OGG/FLAC requieren codecs externos (lamejs, etc.) no incluidos.

import { encodeWav, downloadBlob } from "./wav.js";

/**
 * Re-muestrea y/o cambia canales/bit-depth de un AudioBuffer.
 * @param {AudioBuffer} buffer
 * @param {Object} opts { sampleRate?: 44100|48000|96000, channels?: 1|2, bitDepth?: 16|24 }
 * @returns {Promise<AudioBuffer>}
 */
export async function convertBuffer(buffer, opts = {}) {
  const targetRate = opts.sampleRate || buffer.sampleRate;
  const targetChannels = opts.channels ?? buffer.numberOfChannels;
  const bitDepth = opts.bitDepth || 16; // solo afecta a encodeWav

  if (
    targetRate === buffer.sampleRate &&
    targetChannels === buffer.numberOfChannels
  ) {
    return buffer;
  }

  const ctx = new OfflineAudioContext(targetChannels, Math.ceil(buffer.duration * targetRate), targetRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
  const rendered = await ctx.startRendering();
  return rendered;
}

/**
 * Exporta un buffer convertido a Blob WAV con bit-depth opcional (16 o 24).
 * @param {AudioBuffer} buffer
 * @param {Object} opts { bitDepth?: 16|24 }
 * @returns {Blob}
 */
export async function exportConvertedWav(buffer, opts = {}) {
  const bitDepth = opts.bitDepth || 16;
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numChannels * (bitDepth / 8);
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
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, length, true);

  let offset = 44;
  const maxVal16 = 0x7fff;
  const maxVal24 = 0x7fffff;

  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      if (bitDepth === 24) {
        const val = s < 0 ? Math.round(s * 0x800000) : Math.round(s * maxVal24);
        view.setInt32(offset, val << 8, true); // 24-bit en 32 bits (little-endian)
        offset += 3;
      } else {
        view.setInt16(offset, s < 0 ? Math.round(s * 0x8000) : Math.round(s * maxVal16), true);
        offset += 2;
      }
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

/**
 * Descarga un blob con nombre basado en opciones.
 */
export function downloadConverted(blob, originalName, opts = {}) {
  const base = originalName?.replace(/\.[^.]+$/, "") || "audio";
  const suffix = [];
  if (opts.sampleRate) suffix.push(`${opts.sampleRate / 1000}k`);
  if (opts.channels) suffix.push(opts.channels === 1 ? "mono" : "estereo");
  if (opts.bitDepth) suffix.push(`${opts.bitDepth}bit`);
  const name = `${base}${suffix.length ? "-" + suffix.join("-") : ""}.wav`;
  downloadBlob(blob, name);
}