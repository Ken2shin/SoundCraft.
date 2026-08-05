import "server-only";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const SYSTEM_PROMPT = `Eres un ingeniero de mezcla profesional (producer senior) de una app de educación musical llamada SoundCraft AI. Tu trabajo es traducir métricas de análisis de audio (librosa) en recomendaciones de ecualización en lenguaje natural y técnico para músicos.

El ecualizador tiene 3 bandas únicamente:
- "low"  : graves   (20 Hz - 400 Hz)
- "mid"  : medios   (400 Hz - 2.5 kHz)
- "high" : agudos   (2.5 kHz - 20 kHz)

Cada banda admite valores de -12 dB a +12 dB (paso 0.5).

Reglas OBLIGATORIAS de formato:
1. Devuelve SIEMPRE JSON válido, sin markdown, sin texto adicional, con esta forma exacta:
{
  "suggestions": [
    {
      "id": 1,
      "band": "low",
      "value": -4,
      "title": "Reduce la suciedad en graves",
      "description": "Corte de frecuencias graves a 400 Hz para mayor claridad en guitarra."
    }
  ]
}
2. Devuelve entre 2 y 3 sugerencias, ordenadas por impacto.
3. Los valores deben estar entre -12 y 12, en múltiplos de 0.5.
4. La descripción debe ser accionable y mencionar la técnica usada (corte para claridad, realce para presencia, etc.).
5. No inventes bandas que no existan. No uses más de 15 palabras por descripción.`;

export function sanitizeSuggestions(raw) {
  const list = Array.isArray(raw?.suggestions) ? raw.suggestions : [];
  const seen = new Set();
  const clean = [];
  for (const s of list) {
    if (!["low", "mid", "high"].includes(s?.band)) continue;
    let value = Math.round(Number(s.value ?? 0) * 2) / 2;
    if (!Number.isFinite(value)) continue;
    value = Math.max(-12, Math.min(12, value));
    const title = String(s.title || "Ajuste recomendado").slice(0, 80);
    const description = String(
      s.description || "Aplica el ajuste y escucha la diferencia."
    ).slice(0, 160);
    const key = `${s.band}:${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push({ id: clean.length + 1, band: s.band, value, title, description });
  }
  return clean.slice(0, 3);
}

/**
 * Genera sugerencias de EQ a partir de las métricas de librosa.
 * Llama ONLY al servidor (la clave nunca sale de aquí).
 */
export async function suggestEQ(metrics, instrument) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY no está configurada. Revisa tu archivo .env"
    );
  }
  const model = process.env.GEMINI_MODEL || "gemma-4-31b-it";

  const userPrompt = `Instrumento/proyecto: ${instrument || "desconocido"}

Métricas del análisis espectral (librosa, primeros 60 s):
${JSON.stringify(metrics, null, 2)}

Devuelve las sugerencias en el JSON con formato estricto definido en el prompt del sistema.`;

  let res;
  let text;
  try {
    res = await fetch(`${API_BASE}/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 800,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(
        `Gemini ${res.status}: ${json?.error?.message || "error desconocido"}`
      );
    }
    text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  } catch (err) {
    console.error("[gemini] fallo de red/API:", err.message);
    text = "{}";
  }

  let parsed = {};
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first !== -1 && last > first) {
      try {
        parsed = JSON.parse(text.slice(first, last + 1));
      } catch {
        parsed = {};
      }
    }
  }

  const suggestions = sanitizeSuggestions(parsed);
  if (!suggestions.length) {
    // Fallback determinista si la API falla: reglas simplificadas de masterización
    const m = metrics || {};
    const suggestions = [];
    if (m.dominant_band === "high") {
      suggestions.push({
        id: 1,
        band: "high",
        value: -3,
        title: "Suaviza agudos dominantes",
        description: "El audio domina en agudos; un corte ligero reduce dureza.",
      });
    }
    if (m.dominant_band === "low") {
      suggestions.push({
        id: 2,
        band: "low",
        value: -3,
        title: "Controla el exceso de graves",
        description: "Baja los graves sucios para despejar la mezcla.",
      });
    }
    suggestions.push({
      id: 3,
      band: "mid",
      value: m.dominant_band !== "low" ? 2 : 3,
      title: "Añade presencia media",
      description: "Un leve realce en medios da cuerpo y definición.",
    });
    return suggestions;
  }
  return suggestions;
}