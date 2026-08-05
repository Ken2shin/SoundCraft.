import "server-only";
import crypto from "crypto";

const SCRYPT_KEYLEN = 64;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt}$${hash.toString("hex")}`;
}

export function verifyPassword(password, storedHash) {
  const parts = storedHash?.split("$");
  if (parts?.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hashHex] = parts;
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(hashHex, "hex");
  if (hash.length !== expected.length) return false;
  return crypto.timingSafeEqual(hash, expected);
}
