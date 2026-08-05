import "server-only";
import {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
} from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { decodeProtectedHeader, importX509, jwtVerify } from "jose";

const CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const CERTS_TTL_MS = 5 * 60 * 1000;

let certsCache = null;
let certsAt = 0;

function getProjectConfig() {
  return {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    projectNumber: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  };
}

function buildCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    const json = raw.trim().startsWith("{")
      ? raw
      : Buffer.from(raw, "base64").toString("utf-8");
    try {
      return cert(JSON.parse(json));
    } catch (err) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON no pudo parsearse: " + err.message
      );
    }
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return applicationDefault();
  }
  return null;
}

function getAdminApp() {
  if (!getApps().length) {
    const credential = buildCredential();
    if (!credential) {
      return null;
    }
    initializeApp({ credential });
  }
  try {
    return getApp();
  } catch {
    return null;
  }
}

async function getCerts() {
  const now = Date.now();
  if (certsCache && now - certsAt < CERTS_TTL_MS) {
    return certsCache;
  }
  const res = await fetch(CERTS_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("No se pudieron obtener las claves públicas de Firebase");
  }
  certsCache = await res.json();
  certsAt = now;
  return certsCache;
}

async function verifyWithPublicKeys(idToken) {
  const { projectId, projectNumber } = getProjectConfig();
  if (!projectId) {
    throw new Error(
      "Falta NEXT_PUBLIC_FIREBASE_PROJECT_ID (verificación de token imposible)"
    );
  }
  const header = decodeProtectedHeader(idToken);
  const certs = await getCerts();
  const pem = certs[header.kid];
  if (!pem) {
    throw new Error("Clave pública no encontrada para este idToken");
  }
  const key = await importX509(pem, "RS256");
  const { payload } = await jwtVerify(idToken, key, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: [projectId, projectNumber].filter(Boolean),
  });
  // Firebase incluye el uid en "user_id"/"sub" (el claim "uid" no existe en el JWT crudo)
  const uid = payload.uid || payload.user_id || payload.sub;
  if (!uid) {
    throw new Error("El idToken no contiene un uid");
  }
  if (payload.exp && Date.now() / 1000 > payload.exp) {
    throw new Error("El idToken de Firebase ha expirado");
  }
  return {
    ...payload,
    uid,
    name: payload.name || null,
    email: payload.email || null,
  };
}

export async function verifyIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") {
    throw new Error("Falta el idToken");
  }
  const app = getAdminApp();
  if (app) {
    // Ruta preferida: Admin SDK (verifica revocación de sesión)
    return await getAuth(app).verifyIdToken(idToken, true);
  }
  // Fallback: verificación de firma con las claves públicas de Firebase
  // (funciona sin cuenta de servicio)
  return await verifyWithPublicKeys(idToken);
}

export { getProjectConfig };
