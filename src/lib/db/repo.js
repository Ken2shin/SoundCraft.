import "server-only";
import { query } from "@/lib/db";

const USER_COLS = "id, email, name, plan, is_admin, created_at";

export async function createUser({ email, name, passwordHash }) {
  const res = await query(
    `INSERT INTO users (email, name, password_hash)
     VALUES ($1, $2, $3)
     RETURNING ${USER_COLS}`,
    [email, name || null, passwordHash]
  );
  return res.rows[0];
}

export async function getUserByEmail(email) {
  const res = await query(
    `SELECT ${USER_COLS}, password_hash FROM users WHERE email = $1`,
    [email]
  );
  return res.rows[0] || null;
}

export async function setUserPlan(uid, plan) {
  const allowed = new Set(["free", "estudio", "pro"]);
  if (!allowed.has(plan)) return null;
  const res = await query(
    `UPDATE users SET plan = $2, updated_at = now() WHERE id = $1 RETURNING ${USER_COLS}`,
    [uid, plan]
  );
  return res.rows[0] || null;
}

export async function getUserByUid(uid) {
  const res = await query(
    `SELECT ${USER_COLS} FROM users WHERE id = $1`,
    [uid]
  );
  return res.rows[0] || null;
}

export async function ensureUser({ uid, email, name }) {
  const existing = await getUserByUid(uid);
  if (existing) return existing;
  const res = await query(
    `INSERT INTO users (id, email, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (id)
     DO UPDATE SET email = COALESCE(EXCLUDED.email, users.email),
                   name = COALESCE(EXCLUDED.name, users.name)
     RETURNING ${USER_COLS}`,
    [uid, email || null, name || null]
  );
  return res.rows[0];
}

export async function listProjects(dbUserId) {
  const res = await query(
    `SELECT id, title, description, audio_name, audio_duration_ms, eq_state, status, created_at, updated_at
     FROM projects
     WHERE user_id = $1
     ORDER BY updated_at DESC`,
    [dbUserId]
  );
  return res.rows;
}

export async function getProjectByIdAndUser(projectId, dbUserId) {
  const res = await query(
    `SELECT id, user_id, title, description, audio_name, audio_duration_ms, eq_state, status, created_at, updated_at
     FROM projects WHERE id = $1 AND user_id = $2`,
    [projectId, dbUserId]
  );
  return res.rows[0] || null;
}

export async function countProjects(dbUserId) {
  const res = await query(
    `SELECT COUNT(*)::int AS n FROM projects WHERE user_id = $1`,
    [dbUserId]
  );
  return res.rows[0].n;
}

export async function createProject(dbUserId, { title, description = null }) {
  const res = await query(
    `INSERT INTO projects (user_id, title, description)
     VALUES ($1, $2, $3)
     RETURNING id, title, status, eq_state, created_at, updated_at`,
    [dbUserId, title, description]
  );
  return res.rows[0];
}

export async function updateProject(dbUserId, projectId, fields) {
  const allowed = new Set([
    "title",
    "description",
    "audio_name",
    "audio_duration_ms",
    "eq_state",
    "status",
  ]);
  const entries = Object.entries(fields).filter(([k]) => allowed.has(k));
  if (!entries.length) return getProjectByIdAndUser(projectId, dbUserId);

  const sets = entries.map(([k], i) => `${k} = $${i + 2}`).join(", ");
  const values = entries.map(([, v]) => v);
  const res = await query(
    `UPDATE projects SET ${sets} WHERE id = $1 AND user_id = $2
     RETURNING id, title, description, audio_name, audio_duration_ms, eq_state, status, updated_at`,
    [projectId, dbUserId, ...values]
  );
  return res.rows[0] || null;
}

export async function deleteProject(dbUserId, projectId) {
  const res = await query(
    `DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id`,
    [projectId, dbUserId]
  );
  return res.rows[0] || null;
}

export async function insertAnalysis({ dbUserId, projectId, metrics, model = null }) {
  const res = await query(
    `INSERT INTO analysis_results (project_id, user_id, metrics, model)
     VALUES ($1, $2, $3, $4)
     RETURNING id, created_at`,
    [projectId, dbUserId, metrics, model]
  );
  return res.rows[0];
}

export async function saveSuggestions({ projectId, dbUserId, suggestions, model }) {
  const res = await query(
    `UPDATE analysis_results
     SET suggestions = $3, model = $4
     WHERE id = (
       SELECT id FROM analysis_results
       WHERE project_id = $1 AND user_id = $2
       ORDER BY created_at DESC LIMIT 1
     )
     RETURNING id`,
    [projectId, dbUserId, suggestions, model]
  );
  return res.rows[0] || null;
}

// ---------- Cuotas por módulo (por día) ----------
export async function getModuleUsage(dbUserId, module) {
  const res = await query(
    `SELECT count FROM module_usage
     WHERE user_id = $1 AND module = $2 AND usage_date = CURRENT_DATE`,
    [dbUserId, module]
  );
  return res.rows[0]?.count || 0;
}

export async function incrementModuleUsage(dbUserId, module, by = 1) {
  const res = await query(
    `INSERT INTO module_usage (user_id, module, count)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, module, usage_date)
     DO UPDATE SET count = module_usage.count + EXCLUDED.count
     RETURNING count`,
    [dbUserId, module, by]
  );
  return res.rows[0].count;
}

// ---------- Módulo: Auto-Pitch ----------
export async function savePitchAnalysis({ dbUserId, projectId, note, cents, correctionCents, tStart, tEnd }) {
  const res = await query(
    `INSERT INTO pitch_analysis (project_id, user_id, note, cents, correction_cents, t_start, t_end)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [projectId, dbUserId, note, cents, correctionCents, tStart, tEnd]
  );
  return res.rows[0];
}

// ---------- Módulo: Denoiser / Stems ----------
export async function saveStemExport({ dbUserId, projectId, stemType, filterLow, filterHigh, sampleRate }) {
  const res = await query(
    `INSERT INTO stem_exports (project_id, user_id, stem_type, filter_low, filter_high, output_samplerate)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [projectId, dbUserId, stemType, filterLow, filterHigh, sampleRate]
  );
  return res.rows[0];
}

// ---------- Módulo: A/B Reference ----------
export async function saveReferenceAnalysis({ dbUserId, projectId, referenceName, metrics }) {
  const res = await query(
    `INSERT INTO reference_analysis (project_id, user_id, reference_name, metrics)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [projectId, dbUserId, referenceName, metrics]
  );
  return res.rows[0];
}

// ---------- Módulo: Instant Master ----------
export async function saveMaster({ dbUserId, projectId, targetLufs, measuredLufs, gainDb, sampleRate }) {
  const res = await query(
    `INSERT INTO masters (project_id, user_id, target_lufs, measured_lufs, gain_db, output_samplerate)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [projectId, dbUserId, targetLufs, measuredLufs, gainDb, sampleRate]
  );
  return res.rows[0];
}

// ---------- Módulo: Chord Generator (IA) ----------
export async function saveChordGeneration({ dbUserId, projectId, keyName, mood, chords, model }) {
  const res = await query(
    `INSERT INTO chord_generations (project_id, user_id, key_name, mood, chords, model)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [projectId, dbUserId, keyName, mood, chords, model]
  );
  return res.rows[0];
}

// ---------- Módulo: Convertidor ----------
export async function saveConversion({ dbUserId, projectId, sourceFormat, targetFormat, bitDepth, sampleRate, channels }) {
  const res = await query(
    `INSERT INTO conversions (project_id, user_id, source_format, target_format, bit_depth, sample_rate, channels)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [projectId, dbUserId, sourceFormat, targetFormat, bitDepth, sampleRate, channels]
  );
  return res.rows[0];
}

// ---------- Módulo: Tap Tempo & Key ----------
export async function saveTempoDetection({ dbUserId, projectId, bpm, keyName, source }) {
  const res = await query(
    `INSERT INTO tempo_detections (project_id, user_id, bpm, key_name, source)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [projectId, dbUserId, bpm, keyName, source]
  );
  return res.rows[0];
}

// ---------- Módulo: Copyright & Metadata ----------
export async function saveCopyrightMetadata({ dbUserId, projectId, fields, audioHash }) {
  const res = await query(
    `INSERT INTO copyright_metadata (project_id, user_id, title, artist, album, year, isrc, upc, genre, audio_hash, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (project_id)
     DO UPDATE SET title = EXCLUDED.title, artist = EXCLUDED.artist, album = EXCLUDED.album,
                   year = EXCLUDED.year, isrc = EXCLUDED.isrc, upc = EXCLUDED.upc,
                   genre = EXCLUDED.genre, audio_hash = EXCLUDED.audio_hash, notes = EXCLUDED.notes
     RETURNING id`,
    [
      projectId,
      dbUserId,
      fields.title || null,
      fields.artist || null,
      fields.album || null,
      fields.year || null,
      fields.isrc || null,
      fields.upc || null,
      fields.genre || null,
      audioHash,
      fields.notes || null,
    ]
  );
  return res.rows[0];
}

export async function getCopyrightMetadata(dbUserId, projectId) {
  const res = await query(
    `SELECT title, artist, album, year, isrc, upc, genre, audio_hash, notes
     FROM copyright_metadata WHERE user_id = $1 AND project_id = $2`,
    [dbUserId, projectId]
  );
  return res.rows[0] || null;
}

// ---------- Módulo: Marketplace ----------
export async function createMarketplaceRequest({ dbUserId, projectId, trackTitle, service, durationMin, estimatedBudget, notes }) {
  const res = await query(
    `INSERT INTO marketplace_requests (user_id, project_id, track_title, service, duration_min, estimated_budget, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, status, created_at`,
    [dbUserId, projectId, trackTitle, service, durationMin, estimatedBudget, notes]
  );
  return res.rows[0];
}

export async function listMarketplaceRequests(dbUserId) {
  const res = await query(
    `SELECT id, track_title, service, duration_min, estimated_budget, status, created_at
     FROM marketplace_requests WHERE user_id = $1 ORDER BY created_at DESC`,
    [dbUserId]
  );
  return res.rows;
}

// ---------- Módulo: Gamificación ----------
export async function markChallengeComplete(dbUserId, challengeDate, challengeKey, xp) {
  const res = await query(
    `INSERT INTO challenge_progress (user_id, challenge_date, challenge_key, completed, xp)
     VALUES ($1, $2, $3, true, $4)
     ON CONFLICT (user_id, challenge_date, challenge_key)
     DO NOTHING
     RETURNING id`,
    [dbUserId, challengeDate, challengeKey, xp]
  );
  return res.rows[0] || null;
}

export async function getChallengeProgress(dbUserId) {
  const res = await query(
    `SELECT challenge_date, challenge_key, completed, xp
     FROM challenge_progress WHERE user_id = $1 ORDER BY challenge_date DESC LIMIT 30`,
    [dbUserId]
  );
  return res.rows;
}

export async function getTotalXp(dbUserId) {
  const res = await query(
    `SELECT COALESCE(SUM(xp), 0)::int AS total FROM challenge_progress WHERE user_id = $1`,
    [dbUserId]
  );
  return res.rows[0].total;
}
