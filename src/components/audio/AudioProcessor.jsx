"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import {
  AlertTriangle,
  FileUp,
  Loader2,
  Lock,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Save,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import { BANDS, DEFAULT_EQ, PRESETS } from "@/lib/audio/presets";
import { downloadBlob, encodeWav } from "@/lib/audio/wav";
import EQBand from "./EQBand";
import EQVisualizer from "./EQVisualizer";
import Waveform from "./Waveform";
import PresetPanel from "./PresetPanel";
import AISuggestions from "./AISuggestions";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/x-m4a",
  "audio/mp4",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
]);

function computePeaks(audioBuffer, buckets = 1600) {
  const data = audioBuffer.getChannelData(0);
  const size = Math.max(1, Math.floor(data.length / buckets));
  const peaks = new Array(buckets);
  for (let i = 0; i < buckets; i++) {
    let max = 0;
    const start = i * size;
    for (let j = 0; j < size; j++) {
      const v = Math.abs(data[start + j] || 0);
      if (v > max) max = v;
    }
    peaks[i] = max;
  }
  return peaks;
}

function fmtTime(s) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function AudioProcessor({
  projectId,
  initialEq = DEFAULT_EQ,
  initialPresetKey = "Flat",
  plan = "free",
  onSaveState,
}) {
  const isPro = plan === "pro" || plan === "estudio";
  const playerRef = useRef(null);
  const eqRef = useRef(null);
  const soloHpRef = useRef(null);
  const soloLpRef = useRef(null);
  const analyserRef = useRef(null);
  const bufferRef = useRef(null);
  const audioFileRef = useRef(null);
  const startCtxTimeRef = useRef(0);
  const startOffsetRef = useRef(0);
  const lastPosRef = useRef(0);
  const loopRef = useRef(true);
  const eqRefState = useRef(initialEq);

  const [eq, setEq] = useState(initialEq);
  const [presetKey, setPresetKey] = useState(initialPresetKey);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(-6);
  const [loop, setLoop] = useState(true);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [soloing, setSoloing] = useState(false);
  const [peaks, setPeaks] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [buffer, setBuffer] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  const getPosition = useCallback(() => {
    const player = playerRef.current;
    const buf = bufferRef.current;
    if (!player || !buf) return lastPosRef.current;
    if (player.state === "started") {
      const elapsed = Tone.now() - startCtxTimeRef.current;
      let pos = startOffsetRef.current + elapsed;
      if (loopRef.current) pos = pos % buf.duration;
      pos = Math.min(pos, buf.duration);
      lastPosRef.current = pos;
    }
    return lastPosRef.current;
  }, []);

  // Bucle de posicion mientras se reproduce
  useEffect(() => {
    if (!isPlaying) return;
    let raf;
    const tick = () => {
      const player = playerRef.current;
      if (player && player.state !== "started") {
        setIsPlaying(false);
        setCurrentTime(Math.min(duration, getPosition()));
        return;
      }
      setCurrentTime(getPosition());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, duration, getPosition]);

  const disposeGraph = useCallback(() => {
    try {
      playerRef.current?.stop();
      playerRef.current?.dispose();
    } catch {}
    try {
      eqRef.current?.dispose();
    } catch {}
    try {
      soloHpRef.current?.dispose();
    } catch {}
    try {
      soloLpRef.current?.dispose();
    } catch {}
    try {
      analyserRef.current?.disconnect();
    } catch {}
    playerRef.current = null;
    eqRef.current = null;
    soloHpRef.current = null;
    soloLpRef.current = null;
    analyserRef.current = null;
  }, []);

  useEffect(() => () => disposeGraph(), [disposeGraph]);

  const loadFile = useCallback(
    async (file) => {
      setError(null);
      if (!file) return;
      if (!ACCEPTED_TYPES.has(file.type.toLowerCase())) {
        setError("Formato no soportado. Usa MP3, WAV, M4A, AAC, OGG o FLAC.");
        return;
      }
      if (file.size > MAX_AUDIO_BYTES) {
        setError("El archivo supera el límite de 10 MB.");
        return;
      }
      setIsBusy(true);
      try {
        await Tone.start();
        const arrayBuffer = await file.arrayBuffer();
        const ctx = Tone.getContext();
        const audioBuffer = await ctx.rawContext.decodeAudioData(arrayBuffer);

        disposeGraph();

        const player = new Tone.Player(audioBuffer);
        const eq = new Tone.EQ3({
          low: eqRefState.current.low,
          mid: eqRefState.current.mid,
          high: eqRefState.current.high,
          lowFrequency: 400,
          highFrequency: 2500,
        });
        // Filtros de aislamiento por instrumento (paso-banda).
        // Con paso en abierto (20 Hz – 20 kHz) no modifican el sonido.
        const soloHp = new Tone.Filter({
          type: "highpass",
          frequency: 20,
          Q: 0.6,
        });
        const soloLp = new Tone.Filter({
          type: "lowpass",
          frequency: 20000,
          Q: 0.6,
        });
        const analyser = ctx.rawContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;

        player.connect(eq);
        eq.connect(soloHp);
        soloHp.connect(soloLp);
        soloLp.connect(analyser);
        analyser.connect(ctx.rawContext.destination);

        player.loop = loopRef.current;
        player.setLoopPoints(0, audioBuffer.duration);

        playerRef.current = player;
        eqRef.current = eq;
        soloHpRef.current = soloHp;
        soloLpRef.current = soloLp;
        analyserRef.current = analyser;
        bufferRef.current = audioBuffer;
        setBuffer(audioBuffer);
        audioFileRef.current = file;
        setAudioFile(file);
        lastPosRef.current = 0;
        startOffsetRef.current = 0;

        setFileName(file.name);
        setDuration(audioBuffer.duration);
        setCurrentTime(0);
        setPeaks(computePeaks(audioBuffer));
        setAnalyser(analyser);
        if (soloHpRef.current && soloLpRef.current) {
          const keepSolo = PRESETS[presetKey]?.range;
          if (keepSolo) {
            soloHpRef.current.frequency.value = keepSolo.low;
            soloLpRef.current.frequency.value = keepSolo.high;
            setSoloing(true);
          } else {
            soloHpRef.current.frequency.value = 20;
            soloLpRef.current.frequency.value = 20000;
            setSoloing(false);
          }
        }
        setIsLoaded(true);
        setIsPlaying(false);
      } catch (err) {
        console.error("[AudioProcessor] decode:", err);
        setError("No se pudo decodificar el audio. Verifica que el archivo no esté corrupto.");
      } finally {
        setIsBusy(false);
      }
    },
    [disposeGraph, presetKey]
  );

  const togglePlay = useCallback(async () => {
    const player = playerRef.current;
    if (!player) return;
    if (player.state === "started") {
      lastPosRef.current = getPosition();
      player.stop();
      setIsPlaying(false);
      return;
    }
    await Tone.start();
    let offset = lastPosRef.current;
    if (duration > 0 && offset >= duration - 0.1) offset = 0;
    startCtxTimeRef.current = Tone.now();
    startOffsetRef.current = offset;
    player.start(undefined, offset);
    setIsPlaying(true);
  }, [getPosition, duration]);

  const handleSeek = useCallback(
    (t) => {
      const player = playerRef.current;
      const clamped = Math.max(0, Math.min(t, duration));
      lastPosRef.current = clamped;
      if (player?.state === "started") {
        player.seek(clamped);
        startCtxTimeRef.current = Tone.now();
        startOffsetRef.current = clamped;
      }
      setCurrentTime(clamped);
    },
    [duration]
  );

  const changeBand = useCallback((band, value) => {
    setEq((prev) => {
      const next = { ...prev, [band]: value };
      eqRefState.current = next;
      eqRef.current?.set(next);
      return next;
    });
    setPresetKey(null);
  }, []);

  const applyPreset = useCallback((key) => {
    const preset = PRESETS[key];
    if (!preset) return;
    const next = { low: preset.low, mid: preset.mid, high: preset.high };
    eqRefState.current = next;
    eqRef.current?.set(next);
    setEq(next);
    setPresetKey(key);
    if (soloHpRef.current && soloLpRef.current) {
      if (preset.range) {
        soloHpRef.current.frequency.value = preset.range.low;
        soloLpRef.current.frequency.value = preset.range.high;
        setSoloing(true);
      } else {
        soloHpRef.current.frequency.value = 20;
        soloLpRef.current.frequency.value = 20000;
        setSoloing(false);
      }
    }
  }, []);

  const toggleLoop = useCallback(() => {
    setLoop((prev) => {
      const next = !prev;
      loopRef.current = next;
      const player = playerRef.current;
      if (player) player.loop = next;
      return next;
    });
  }, []);

  const handleVolume = useCallback((v) => {
    setVolume(v);
    Tone.getDestination().volume.value = v;
  }, []);

  const exportWav = useCallback(async () => {
    const buf = bufferRef.current;
    if (!buf || !isPro) return;
    setIsExporting(true);
    try {
      const sampleRate = 48000;
      const channels = Math.min(2, buf.numberOfChannels);
      const offline = new OfflineAudioContext(
        channels,
        Math.ceil(buf.duration * sampleRate),
        sampleRate
      );
      const src = offline.createBufferSource();
      const renderBuffer = offline.createBuffer(
        channels,
        buf.length,
        buf.sampleRate
      );
      for (let ch = 0; ch < channels; ch++) {
        renderBuffer.copyToChannel(buf.getChannelData(ch), ch);
      }
      src.buffer = renderBuffer;

      const lowshelf = offline.createBiquadFilter();
      lowshelf.type = "lowshelf";
      lowshelf.frequency.value = 400;
      lowshelf.gain.value = eq.low;

      const peak = offline.createBiquadFilter();
      peak.type = "peaking";
      peak.frequency.value = 1200;
      peak.Q.value = 1;
      peak.gain.value = eq.mid;

      const highshelf = offline.createBiquadFilter();
      highshelf.type = "highshelf";
      highshelf.frequency.value = 2500;
      highshelf.gain.value = eq.high;

      src.connect(lowshelf);
      lowshelf.connect(peak);
      peak.connect(highshelf);
      highshelf.connect(offline.destination);
      src.start();

      const rendered = await offline.startRendering();
      const wav = encodeWav(rendered);
      downloadBlob(wav, `${fileName.replace(/\.[^.]+$/, "") || "proyecto"}-soundcraft-hd.wav`);
    } catch (err) {
      console.error("[AudioProcessor] export:", err);
      setError("Falló la exportación HD.");
    } finally {
      setIsExporting(false);
    }
  }, [isPro, eq, fileName]);

  const saveState = useCallback(async () => {
    if (!onSaveState) return;
    setIsSaving(true);
    try {
      await onSaveState({
        title: undefined,
        audio_name: audioFileRef.current?.name || fileName || null,
        audio_duration_ms: bufferRef.current
          ? Math.round(bufferRef.current.duration * 1000)
          : null,
        eq_state: {
          low: eqRefState.current.low,
          mid: eqRefState.current.mid,
          high: eqRefState.current.high,
          presetKey: presetKey || "Flat",
        },
        status: "draft",
      });
      setSavedAt(new Date());
    } finally {
      setIsSaving(false);
    }
  }, [onSaveState, fileName, presetKey]);

  return (
    <div className="space-y-4">
      {/* ---------- Carga / transporte ---------- */}
      <div className="rounded-2xl border border-[#3c3c3c]/10 bg-panel p-4 shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="audio-upload"
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 ${
              isBusy ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isLoaded ? "Cambiar audio" : "Subir audio (MP3/WAV)"}
          </label>
          <input
            id="audio-upload"
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) loadFile(f);
              e.target.value = "";
            }}
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-stone-200">
              {fileName || "Ningún archivo cargado"}
            </p>
            <p className="font-mono text-xs text-stone-500">
              {fmtTime(currentTime)} / {fmtTime(duration)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              disabled={!isLoaded}
              aria-label={isPlaying ? "Pausar" : "Reproducir"}
              className="grid h-12 w-12 place-items-center rounded-full bg-[#58cc02] text-[#ffffff] shadow-[0_0_28px_-6px_rgba(88,204,2,0.9)] transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" fill="currentColor" />
              ) : (
                <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleSeek(0)}
              disabled={!isLoaded}
              aria-label="Volver al inicio"
              className="rounded-lg border border-[#3c3c3c]/10 p-2.5 text-stone-300 transition-colors hover:bg-[#3c3c3c]/5 disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={toggleLoop}
              disabled={!isLoaded}
              aria-pressed={loop}
              className={`rounded-lg border p-2.5 transition-colors disabled:opacity-40 ${
                loop
                  ? "border-indigo-400/60 bg-indigo-500/10 text-indigo-600"
                  : "border-[#3c3c3c]/10 text-stone-300 hover:bg-[#3c3c3c]/5"
              }`}
            >
              <Repeat className="h-4 w-4" />
            </button>
            <div className="ml-1 flex items-center gap-2 rounded-lg border border-[#3c3c3c]/10 px-3 py-2.5">
              <Volume2 className="h-4 w-4 text-stone-400" />
              <input
                type="range"
                min={-30}
                max={6}
                step={1}
                value={volume}
                onChange={(e) => handleVolume(parseFloat(e.target.value))}
                className="w-20 accent-indigo-500"
                aria-label="Volumen"
              />
              <span className="w-9 font-mono text-xs text-stone-400">{volume} dB</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Waveform
            peaks={peaks}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
          />
        </div>

        {error && (
          <p className="mt-3 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </p>
        )}
      </div>

      {/* ---------- Panel EQ + presets ---------- */}
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="rounded-2xl border border-[#3c3c3c]/10 bg-panel p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400">
              Ecualizador · 3 bandas
            </h3>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-stone-400">
              Tiempo real
            </span>
          </div>
          <div className="flex items-start justify-between gap-3">
            {BANDS.map((band) => (
              <EQBand
                key={band.id}
                band={band}
                value={eq[band.id]}
                onChange={changeBand}
              />
            ))}
          </div>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Presets por instrumento
              </p>
              {soloing && (
                <button
                  type="button"
                  onClick={() => applyPreset("Flat")}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#58cc02]/15 px-2.5 py-1 text-[11px] font-bold text-[#46a302] transition-colors hover:bg-[#58cc02]/25"
                  title="Vuelve a escuchar la mezcla completa"
                >
                  <X className="h-3 w-3" />
                  Solo (aprox.): {PRESETS[presetKey]?.label || presetKey} · Cerrar
                </button>
              )}
            </div>
            <PresetPanel activeKey={presetKey} onApply={applyPreset} />
            {soloing && (
              <p className="mt-2 text-xs text-stone-500">
                Aislamiento por frecuencias (aproximado): escuchas sobre todo el rango de{" "}
                {PRESETS[presetKey]?.label?.toLowerCase() || "ese instrumento"}. Para una
                separación real de stems necesitas IA de servidor.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#3c3c3c]/10 bg-panel p-4 shadow-lg lg:w-[340px]">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-stone-400">
            Espectro de frecuencias
          </h3>
          <div className="h-40">
            <EQVisualizer analyser={analyser} isPlaying={isPlaying} />
          </div>
          <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-stone-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-[#1cb0f6]" /> Graves
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-[#ffc800]" /> Medios
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-[#ff4b4b]" /> Agudos
            </span>
          </div>
        </div>
      </div>

      {/* ---------- Acciones del proyecto ---------- */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={saveState}
          disabled={!isLoaded || isSaving}
          className="inline-flex items-center gap-2 rounded-lg border border-[#3c3c3c]/10 px-4 py-2 text-sm font-semibold text-stone-200 transition-colors hover:bg-[#3c3c3c]/5 disabled:opacity-40"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar estado
        </button>
        {savedAt && (
          <span className="text-xs text-stone-500">
            Guardado {savedAt.toLocaleTimeString()}
          </span>
        )}
        <button
          type="button"
          onClick={exportWav}
          disabled={!isLoaded || isExporting || !isPro}
          title={isPro ? "Exportar WAV 48 kHz" : "Solo disponible en el plan Pro"}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPro ? (
            <FileUp className="h-4 w-4" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
          {isPro ? "Exportar HD (WAV 48 kHz)" : "Exportar HD · Pro"}
        </button>
      </div>

      {/* ---------- Asistente de IA ---------- */}
      <AISuggestions
        projectId={projectId}
        audioFile={audioFile}
        instrument={presetKey || "Flat"}
        onApply={changeBand}
        isPro={isPro}
      />
    </div>
  );
}
