"use client";
import { useEffect, useRef } from "react";

export default function Waveform({ peaks, currentTime, duration, onSeek, height = 88 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    canvas.width = width * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, displayHeight);

    const mid = displayHeight / 2;
    const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
    const bucketCount = peaks?.length || 0;

    for (let i = 0; i < bucketCount; i++) {
      const x = (i / bucketCount) * width;
      const w = Math.max(1, width / bucketCount - 1);
      const amp = Math.max(0.02, peaks[i]);
      const h = amp * (displayHeight - 8);
      const isPast = i / bucketCount <= progress;
      ctx.fillStyle = isPast
        ? "rgba(88, 204, 2, 0.95)"
        : "rgba(60, 60, 60, 0.35)";
      ctx.fillRect(x, mid - h / 2, w, h);
    }

    // línea de progreso
    ctx.fillStyle = "rgba(99, 102, 241, 0.25)";
    ctx.fillRect(0, 0, width * progress, displayHeight);
  }, [peaks, currentTime, duration]);

  const handleClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !duration || !peaks?.length) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek?.(Math.max(0, Math.min(1, ratio)) * duration);
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ height }}
      onClick={handleClick}
      className="w-full cursor-pointer rounded-lg"
      aria-label="Forma de onda del audio. Haz clic para desplazarte."
    />
  );
}