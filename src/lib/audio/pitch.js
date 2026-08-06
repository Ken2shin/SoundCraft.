// Detección de pitch monofónico por autocorrelación (YIN simplificado).
// Uso: detectPitch(buffer, { fmin: 60, fmax: 1000, frameMs: 40 })
// Devuelve { note: "C4", cents: 12.5, hz: 261.6 } o null si silencio.

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function freqToNote(hz) {
  const A4 = 440;
  const midi = 69 + 12 * Math.log2(hz / A4);
  const noteIdx = Math.round(midi) % 12;
  const octave = Math.floor(Math.round(midi) / 12) - 1;
  const cents = Math.round((midi - Math.round(midi)) * 100);
  return {
    note: NOTE_NAMES[noteIdx] + octave,
    cents: Math.abs(cents) > 50 ? (cents > 0 ? cents - 100 : cents + 100) : cents,
    midi: Math.round(midi),
    hz,
  };
}

/**
 * Calcula la autocorrelación normalizada de una señal.
 */
function autocorrelation(signal) {
  const n = signal.length;
  const r = new Float32Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += signal[i] * signal[i];
  if (sum === 0) return r;

  for (let lag = 0; lag < n; lag++) {
    let corr = 0;
    for (let i = 0; i < n - lag; i++) {
      corr += signal[i] * signal[i + lag];
    }
    r[lag] = corr / sum;
  }
  return r;
}

/**
 * YIN difference function (simplificado).
 */
function yinDifference(signal, tauMax) {
  const d = new Float32Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < signal.length - tau; i++) {
      const delta = signal[i] - signal[i + tau];
      sum += delta * delta;
    }
    d[tau] = sum;
  }
  // Cumulative mean normalized difference
  let runningSum = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    runningSum += d[tau];
    if (runningSum > 0) d[tau] *= tau / runningSum;
  }
  return d;
}

/**
 * Detección de pitch en un frame (monofónico).
 * @param {Float32Array} frame
 * @param {number} sampleRate
 * @param {number} fmin
 * @param {number} fmax
 * @returns {{hz:number, confidence:number}|null}
 */
function detectPitchFrame(frame, sampleRate, fmin = 60, fmax = 1000) {
  const tauMin = Math.floor(sampleRate / fmax);
  const tauMax = Math.min(Math.floor(sampleRate / fmin), frame.length - 1);
  if (tauMax <= tauMin) return null;

  const d = yinDifference(frame, tauMax);
  let bestTau = -1;
  let bestVal = 1;
  // Buscar el primer mínimo por debajo de umbral
  for (let tau = tauMin; tau <= tauMax; tau++) {
    if (d[tau] < 0.15 && d[tau] < bestVal) {
      bestVal = d[tau];
      bestTau = tau;
    }
  }
  if (bestTau === -1) return null;

  // Refinamiento por interpolación parabólica
  let tau = bestTau;
  if (tau > 1 && tau < tauMax) {
    const a = d[tau - 1];
    const b = d[tau];
    const c = d[tau + 1];
    const denom = 2 * (a - 2 * b + c);
    if (denom !== 0) {
      const delta = (a - c) / denom;
      tau += delta;
    }
  }

  const hz = sampleRate / tau;
  const confidence = 1 - bestVal;
  return { hz, confidence };
}

/**
 * Detecta pitch a lo largo del buffer (cada frameMs).
 * @param {AudioBuffer} buffer
 * @param {Object} opts { fmin?, fmax?, frameMs?, hopMs? }
 * @returns {Promise<Array<{time:number, hz:number, note:string, cents:number, confidence:number}>>}
 */
export async function detectPitch(buffer, opts = {}) {
  const sampleRate = buffer.sampleRate;
  const data = buffer.getChannelData(0); // solo canal 0
  const frameMs = opts.frameMs ?? 40;
  const hopMs = opts.hopMs ?? frameMs;
  const fmin = opts.fmin ?? 60;
  const fmax = opts.fmax ?? 1000;

  const frameSize = Math.floor((frameMs / 1000) * sampleRate);
  const hopSize = Math.floor((hopMs / 1000) * sampleRate);
  const results = [];

  for (let start = 0; start + frameSize <= data.length; start += hopSize) {
    const frame = data.subarray(start, start + frameSize);
    const r = detectPitchFrame(frame, sampleRate, fmin, fmax);
    if (r && r.confidence > 0.4) {
      const noteInfo = freqToNote(r.hz);
      results.push({
        time: start / sampleRate,
        hz: r.hz,
        confidence: r.confidence,
        note: noteInfo.note,
        cents: noteInfo.cents,
        midi: noteInfo.midi,
      });
    }
  }
  return results;
}

/**
 * Fusiona detecciones consecutivas de la misma nota y calcula desviación media.
 * @param {Array} pitchData
 * @returns {Array<{note:string, avgCents:number, duration:number, start:number, end:number}>}
 */
export function mergePitchSegments(pitchData, minDuration = 0.15) {
  if (!pitchData.length) return [];
  const segments = [];
  let cur = { ...pitchData[0], start: pitchData[0].time };
  for (let i = 1; i < pitchData.length; i++) {
    const p = pitchData[i];
    if (p.note === cur.note && p.time - cur.time < 0.3) {
      cur.avgCents = (cur.avgCents * (i - 1) + p.cents) / i;
      cur.end = p.time;
    } else {
      if (cur.end - cur.start >= minDuration) segments.push(cur);
      cur = { ...p, start: p.time, end: p.time, avgCents: p.cents };
    }
  }
  if (cur.end - cur.start >= minDuration) segments.push(cur);
  return segments;
}