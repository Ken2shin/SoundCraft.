"use client";
import { useEffect, useRef } from "react";

const LOW_END = 0.02; // ~ hasta 250 Hz con fftSize 2048 @44.1kHz
const MID_END = 0.28; // ~ hasta 4 kHz

/**
 * Visualizador de frecuencias en tiempo real (AnalyserNode -> canvas).
 * Graves = cian, Medios = ámbar, Agudos = violeta.
 */
export default function EQVisualizer({ analyser, isPlaying }) {
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);

  useEffect(() => {
    analyserRef.current = analyser;
  }, [analyser]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    let raf;
    const render = () => {
      raf = requestAnimationFrame(render);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
      }
      ctx.clearRect(0, 0, width, height);

      const node = analyserRef.current;
      const barCount = 48;
      const barWidth = width / barCount;
      let data = null;
      if (node) {
        const freq = new Uint8Array(node.frequencyBinCount);
        node.getByteFrequencyData(freq);
        data = freq;
      }

      for (let i = 0; i < barCount; i++) {
        const frac = i / barCount;
        let value = 0;
        if (data) {
          const start = Math.floor(i * (data.length / barCount));
          const end = Math.floor((i + 1) * (data.length / barCount));
          for (let j = start; j < end; j++) {
            if (data[j] > value) value = data[j];
          }
        }
        const h = ((value / 255) ** 1.1) * height;
        const color =
          frac < LOW_END
            ? "rgba(28, 176, 246, 0.9)"
            : frac < MID_END
              ? "rgba(255, 200, 0, 0.85)"
              : "rgba(255, 75, 75, 0.9)";
        ctx.fillStyle = color;
        ctx.fillRect(i * barWidth + 1, height - h, Math.max(1, barWidth - 3), h);
      }

      if (!node) {
        ctx.fillStyle = "rgba(60, 60, 60, 0.12)";
        ctx.font = "11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          "Carga un audio para ver el espectro de frecuencias",
          width / 2,
          height / 2
        );
      }
    };
    render();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full rounded-lg"
      aria-label="Visualizador del espectro de frecuencias en tiempo real"
    />
  );
}