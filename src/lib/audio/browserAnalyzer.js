// Análisis espectral en el navegador (Web Audio API).
// Sustituye al servicio Python (librosa) para el asistente de IA:
// calcula RMS, centroide espectral, roll-off y banda dominante sin subir nada.

const FFT_SIZE = 2048;

async function decodeFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } finally {
    if (ctx.state !== "closed") void ctx.close();
  }
}

function computeRms(buffer) {
  const data = buffer.getChannelData(0);
  const step = Math.max(1, Math.floor(data.length / 200_000));
  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += step) {
    const v = data[i];
    sum += v * v;
    count += 1;
  }
  return count ? Math.sqrt(sum / count) : 0;
}

// Obtiene un espectro promedio usando un AnalyserNode sin reproducir audio.
function computeSpectrum(buffer) {
  const ctx = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  analyser.smoothingTimeConstant = 0;
  source.connect(analyser);
  analyser.connect(ctx.destination);
  source.start();

  return ctx.startRendering().then((rendered) => {
    const freq = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(freq);
    return freq;
  });
}

function toHz(index, sampleRate) {
  return (index * sampleRate) / 2 / (FFT_SIZE / 2);
}

export async function analyzeAudioInBrowser(file) {
  const buffer = await decodeFile(file);
  const rms = computeRms(buffer);
  const freq = await computeSpectrum(buffer);
  const sampleRate = buffer.sampleRate;
  const binHz = sampleRate / FFT_SIZE;

  // Potencia por bandas (graves/medios/agudos), ignorando silencio absoluto.
  const bands = { low: 0, mid: 0, high: 0 };
  let weightedSum = 0;
  let totalEnergy = 0;
  let rolloff = 0;
  for (let i = 1; i < freq.length; i++) {
    const magnitude = Math.pow(10, freq[i] / 20);
    const hz = i * binHz;
    totalEnergy += magnitude;
    weightedSum += magnitude * hz;
    if (hz <= 400) bands.low += magnitude;
    else if (hz <= 2500) bands.mid += magnitude;
    else bands.high += magnitude;
    if (rolloff === 0 && weightedSum >= totalEnergy * 0.85) {
      rolloff = hz;
    }
  }

  const spectralCentroid = totalEnergy > 0 ? weightedSum / totalEnergy : 0;
  const dominantBand =
    totalEnergy > 0
      ? Object.entries(bands).sort((a, b) => b[1] - a[1])[0][0]
      : "mid";

  return {
    rms: Number(rms.toFixed(4)),
    spectral_centroid: Math.round(spectralCentroid),
    spectral_rolloff: Math.round(rolloff),
    dominant_band: dominantBand,
    bands: {
      low: Number((bands.low / Math.max(totalEnergy, 1e-9)).toFixed(4)),
      mid: Number((bands.mid / Math.max(totalEnergy, 1e-9)).toFixed(4)),
      high: Number((bands.high / Math.max(totalEnergy, 1e-9)).toFixed(4)),
    },
    duration_sec: Math.round(buffer.duration),
    engine: "web-audio",
  };
}
