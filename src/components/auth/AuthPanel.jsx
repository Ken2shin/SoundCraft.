"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AudioWaveform, Loader2, TriangleAlert } from "lucide-react";
import {
  auth,
  getRedirectResult,
  GoogleAuthProvider,
  isFirebaseConfigured,
  onAuthStateChanged,
  signInWithRedirect,
} from "@/lib/firebase-client";
import { getIdToken } from "firebase/auth";

function firebaseError(code) {
  const map = {
    "auth/unauthorized-domain":
      "El dominio no está autorizado en Firebase (Authentication > Settings > Authorized domains).",
    "auth/account-exists-with-different-credential":
      "Ya existe una cuenta con este correo usando otro método de inicio de sesión.",
  };
  return map[code] || "Ocurrió un error. Inténtalo de nuevo.";
}

// Guard de módulo: en dev React StrictMode monta el componente dos veces y
// getRedirectResult consume el resultado del redirect en la primera llamada.
let redirectChecked = false;
let sessionHandled = false;

export default function AuthPanel({ mode }) {
  const isSignup = mode === "signup";
  const router = useRouter();

  const [error, setError] = useState("");
  const [redirecting, setRedirecting] = useState(true);
  const [loading, setLoading] = useState(false);

  const exchangeAndRedirect = async (credential) => {
    const token = await getIdToken(credential.user);
    const res = await fetch("/api/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    });
    if (!res.ok) throw new Error("No se pudo crear la sesión");
    const next = sessionStorage.getItem("auth_next") || "/dashboard";
    sessionStorage.removeItem("auth_next");
    router.push(next);
    router.refresh();
  };

  // Al volver del redirect de Google, completa el intercambio de token.
  useEffect(() => {
    if (!auth) {
      return;
    }
    if (redirectChecked) {
      return;
    }
    redirectChecked = true;
    let cancelled = false;

    const handleUser = async (user) => {
      if (!user || cancelled || sessionHandled) {
        return;
      }
      sessionHandled = true;
      try {
        await exchangeAndRedirect({ user });
      } catch (err) {
        sessionHandled = false;
        setError(err.message || "No se pudo crear la sesión");
      }
    };

    getRedirectResult(auth)
      .then((credential) => {
        if (credential) return handleUser(credential.user);
      })
      .catch((err) => {
        const msg = firebaseError(err.code);
        if (msg) setError(msg);
      })
      .finally(() => {
        if (!cancelled) setRedirecting(false);
      });

    // Fallback: si el resultado del redirect se pierde (StrictMode, cierre de
    // pestaña, etc.), la sesión persistida de Firebase sigue teniendo al usuario.
    const unsub = onAuthStateChanged(auth, (user) => {
      handleUser(user);
    });

    return () => {
      cancelled = true;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogle = async () => {
    if (!auth) {
      setError("Firebase no está configurado. Revisa tu archivo .env");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const n = new URLSearchParams(window.location.search).get("next");
      if (n) sessionStorage.setItem("auth_next", n);
      await signInWithRedirect(auth, new GoogleAuthProvider());
    } catch (err) {
      const msg = firebaseError(err.code);
      if (msg) setError(msg);
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
          {isSignup
            ? "Empieza a producir gratis con SoundCraft AI"
            : "Inicia sesión en tu estudio"}
        </p>
      </div>

      {!isFirebaseConfigured && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-600">
          <span className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            Faltan tus credenciales de Firebase. Completa las variables{" "}
            <code className="font-mono">NEXT_PUBLIC_FIREBASE_*</code> en tu archivo{" "}
            <code className="font-mono">.env</code>, reinicia el servidor y vuelve aquí.
          </span>
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading || redirecting || !isFirebaseConfigured}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#3c3c3c]/15 py-2.5 text-sm font-semibold text-stone-100 transition-colors hover:bg-[#3c3c3c]/5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading || redirecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#FFC107"
              d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
            />
            <path
              fill="#FF3D00"
              d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
            />
          </svg>
        )}
        {redirecting ? (
          "Completando inicio de sesión…"
        ) : loading ? (
          "Redirigiendo a Google…"
        ) : (
          "Continuar con Google"
        )}
      </button>
    </div>
  );
}
