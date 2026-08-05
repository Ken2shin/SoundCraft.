"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AudioWaveform, Loader2, TriangleAlert } from "lucide-react";
import {
  auth,
  getRedirectResult,
  GoogleAuthProvider,
  isFirebaseConfigured,
  onAuthStateChanged,
  persistenceReady,
  signInWithRedirect,
} from "@/lib/firebase-client";
import { getIdToken } from "firebase/auth";

function firebaseError(code) {
  const map = {
    "auth/unauthorized-domain":
      "El dominio no está autorizado en Firebase (Authentication > Settings > Authorized domains).",
    "auth/account-exists-with-different-credential":
      "Ya existe una cuenta con este correo usando otro método de inicio de sesión.",
    "auth/popup-blocked": "El navegador bloqueó la ventana de Google. Permite ventanas emergentes e inténtalo otra vez.",
    "auth/network-request-failed": "No se pudo conectar con Firebase. Revisa tu conexión e inténtalo otra vez.",
  };
  return map[code] || "Ocurrió un error al iniciar sesión. Inténtalo de nuevo.";
}

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
  const processedUid = useRef(null);
  const cancelled = useRef(false);
  const [error, setError] = useState("");
  const [redirecting, setRedirecting] = useState(isFirebaseConfigured);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cancelled.current = false;
    processedUid.current = null;

    if (!auth) {
      return undefined;
    }

    const exchangeAndRedirect = async (user) => {
      if (!user || cancelled.current || processedUid.current === user.uid) return;
      processedUid.current = user.uid;
      setError("");

      try {
        const idToken = await getIdToken(user, true);
        const response = await fetch("/api/auth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ idToken }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || "No se pudo crear la sesión");
        }

        const next = safeNext(sessionStorage.getItem("auth_next"));
        sessionStorage.removeItem("auth_next");
        router.replace(next);
        router.refresh();
      } catch (err) {
        processedUid.current = null;
        if (!cancelled.current) {
          setError(err.message || "No se pudo crear la sesión");
          setLoading(false);
        }
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setRedirecting(false);
      void exchangeAndRedirect(user);
    });

    void getRedirectResult(auth)
      .then((result) => {
        if (result?.user) void exchangeAndRedirect(result.user);
      })
      .catch((err) => {
        if (!cancelled.current) {
          setError(firebaseError(err.code));
          setLoading(false);
          setRedirecting(false);
        }
      });

    return () => {
      cancelled.current = true;
      unsubscribe();
    };
  }, [router]);

  const handleGoogle = async () => {
    if (!auth || !isFirebaseConfigured) {
      setError("Firebase no está configurado. Revisa las variables NEXT_PUBLIC_FIREBASE_*.");
      return;
    }

    setLoading(true);
    setError("");
    const next = safeNext(searchParams.get("next"));
    sessionStorage.setItem("auth_next", next);

    try {
      await persistenceReady;
      await signInWithRedirect(auth, new GoogleAuthProvider());
    } catch (err) {
      setError(firebaseError(err.code));
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

      {!isFirebaseConfigured && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-600">
          <span className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            Faltan las credenciales de Firebase. Configura las variables NEXT_PUBLIC_FIREBASE_*.
          </span>
        </div>
      )}

      {error && <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">{error}</p>}

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading || redirecting || !isFirebaseConfigured}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#3c3c3c]/15 py-2.5 text-sm font-semibold text-stone-100 transition-colors hover:bg-[#3c3c3c]/5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading || redirecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="text-base font-bold">G</span>}
        {redirecting ? "Completando inicio de sesión…" : loading ? "Redirigiendo a Google…" : "Continuar con Google"}
      </button>
    </div>
  );
}
