import "server-only";
import { query } from "@/lib/db";

const USER_COLS = "id, firebase_uid, email, name, plan, is_admin, created_at";

export async function ensureUser({ uid, email, name }) {
  const res = await query(
    `INSERT INTO users (firebase_uid, email, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (firebase_uid)
     DO UPDATE SET email = EXCLUDED.email, name = COALESCE(EXCLUDED.name, users.name)
     RETURNING ${USER_COLS}`,
    [uid, email || null, name || null]
  );
  return res.rows[0];
}

export async function getUserByUid(uid) {
  const res = await query(
    `SELECT ${USER_COLS} FROM users WHERE firebase_uid = $1`,
    [uid]
  );
  return res.rows[0] || null;
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