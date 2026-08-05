"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AudioWaveform, Loader2 } from "lucide-react";

function safeNext(value) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}

export default function AuthPanel({ mode }) {
  const isSignup = mode === "signup";
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = isSignup ? "/api/auth/register" : "/api/auth/login";
    const body = { email, password };
    if (isSignup) body.name = name;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo completar la solicitud");
      }

      const next = safeNext(searchParams.get("next"));
      sessionStorage.removeItem("auth_next");
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err.message || "Ocurrió un error. Inténtalo de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm rounded-2xl border border-[#3c3c3c]/10 bg-panel p-8 shadow-2xl">
      <div className="mb-6 text-center">
        <span className="mb-3 inline-grid h-12 w-12 place-items-center rounded-lg bg-[#58cc02] shadow-[0_0_28px_-8px_rgba(88,204,2,0.8)]">
          <AudioWaveform className="h-6 w-6 text-white" />
        </span>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-[#3c3c3c]">
          {isSignup ? "Crea tu cuenta" : "Bienvenido de nuevo"}
        </h1>
        <p className="mt-1 text-sm text-stone-400">
          {isSignup ? "Empieza a producir gratis con SoundCraft AI" : "Inicia sesión en tu estudio"}
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {isSignup && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-stone-400">Nombre</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              autoComplete="name"
              placeholder="Tu nombre"
              className="w-full rounded-lg border border-[#3c3c3c]/15 bg-[#1c1c1c] px-3 py-2.5 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-[#58cc02]"
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-stone-400">Correo electrónico</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="tucorreo@ejemplo.com"
            className="w-full rounded-lg border border-[#3c3c3c]/15 bg-[#1c1c1c] px-3 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-[#58cc02]"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-stone-400">Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder={isSignup ? "Mínimo 8 caracteres" : "Tu contraseña"}
            className="w-full rounded-lg border border-[#3c3c3c]/15 bg-[#1c1c1c] px-3 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-[#58cc02]"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#58cc02] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isSignup ? "Creando tu cuenta…" : "Iniciando sesión…"}
            </>
          ) : isSignup ? (
            "Crear cuenta"
          ) : (
            "Iniciar sesión"
          )}
        </button>
      </form>
    </div>
  );
}