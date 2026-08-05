// Rate limiter en memoria (por proceso Node). Suficiente para una v1
// monoinstancia; en producción con varios procesos usa Redis/Upstash.

const buckets = new Map<string, { count: number; resetAt: number }>();

const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_MS = 60_000;

export interface RateLimitOptions {
  key?: string;
  limit?: number;
  windowMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export function rateLimit({
  key,
  limit = DEFAULT_LIMIT,
  windowMs = DEFAULT_WINDOW_MS,
}: RateLimitOptions): RateLimitResult {
  if (!key) return { allowed: true };
  const now = Date.now();

  // Barrido perezoso para no crecer sin límite
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (now - v.resetAt > 0) buckets.delete(k);
    }
  }

  const hit = buckets.get(key);
  if (!hit || now >= hit.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (hit.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((hit.resetAt - now) / 1000)),
    };
  }
  hit.count += 1;
  return { allowed: true };
}