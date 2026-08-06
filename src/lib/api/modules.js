/**
 * Helper para llamar a la API unificada de módulos de audio (/api/modules/audio).
 * Centraliza el formato de petición y respuesta.
 */

export async function saveAudioModule({ kind, projectId, ...data }) {
  const res = await fetch("/api/modules/audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, projectId, ...data }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Error guardando módulo");
  return json;
}