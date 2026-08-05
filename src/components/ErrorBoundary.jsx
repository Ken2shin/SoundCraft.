"use client";
import { useEffect, useState } from "react";

export default function ErrorBoundary({ children, fallback }) {
  const [error, setError] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);

  useEffect(() => {
    const handler = (event) => {
      const err = event.error || new Error(event.message);
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
    return fallback || (
      <div style={{ padding: "20px", color: "red" }}>
        <h2>Algo salió mal</h2>
        <pre style={{ whiteSpace: "pre-wrap" }}>{error.message}</pre>
        {errorInfo && <pre style={{ whiteSpace: "pre-wrap" }}>{errorInfo.componentStack || ""}</pre>}
        <button onClick={() => window.location.reload()}>Recargar</button>
      </div>
    );
  }

  return children;
}