import "server-only";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "[db] DATABASE_URL no está configurado. Revisa tu archivo .env"
  );
}

const pool = connectionString
  ? new pg.Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      // Supabase (y cualquier host remoto) exige TLS
      ssl: /localhost|127\.0\.0\.1/.test(connectionString)
        ? false
        : { rejectUnauthorized: false },
    })
  : null;

export async function query(text, params) {
  if (!pool) {
    throw new Error("DATABASE_URL no está configurado. Revisa tu archivo .env");
  }
  const start = Date.now();
  const res = await pool.query(text, params);
  if (process.env.NODE_ENV === "development") {
    console.debug("[db]", { ms: Date.now() - start, text, rows: res.rowCount });
  }
  return res;
}

export { pool };