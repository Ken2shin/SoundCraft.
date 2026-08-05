"use client";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

type RuntimeEvent = ErrorEvent | PromiseRejectionEvent;

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function ErrorBoundary({
  children,
  fallback,
}: ErrorBoundaryProps) {
  const [error, setError] = useState<Error | null>(null);
  const [errorInfo, setErrorInfo] = useState<RuntimeEvent | null>(null);

  useEffect(() => {
    const handler = (event: RuntimeEvent) => {
      const err =
        event instanceof PromiseRejectionEvent
          ? event.reason || new Error("Rechazo de promesa")
          : event.error || new Error(event.message);
      console.error("[ErrorBoundary] Unhandled error:", err, event);
      setError(err);
      setErrorInfo(event);
    };
    window.addEventListener("error", handler);
    window.addEventListener("unhandledrejection", handler);
    return () => {
      window.removeEventListener("error", handler);
      window.removeEventListener("unhandledrejection", handler);
    };
  }, []);

  if (error) {
    console.error("[ErrorBoundary] Rendering fallback for:", error);
    return (
      fallback || (
        <div style={{ padding: "20px", color: "red" }}>
          <h2>Algo salió mal</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{error.message}</pre>
          {errorInfo && (
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {(errorInfo as ErrorEvent).message || ""}
            </pre>
          )}
          <button onClick={() => window.location.reload()}>Recargar</button>
        </div>
      )
    );
  }

  return children;
}