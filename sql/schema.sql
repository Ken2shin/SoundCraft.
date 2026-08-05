-- =============================================================================
--  SoundCraft AI  -  Esquema PostgreSQL
--  Riesgo bajo: 0 drops. Appends, CREATE IF NOT EXISTS + triggers replacables.
--  Ejecutar (como postgres/superusuario):
--    1) psql -U postgres -c "CREATE DATABASE soundcraft_ai;"
--    2) psql -U postgres -d soundcraft_ai -f sql/schema.sql
-- =============================================================================

BEGIN;

-- Extensión para gen_random_uuid() (incluida en PostgreSQL 13+)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------
-- 1) users        (sync con Firebase Auth: firebase_uid = uid token)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid  TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  plan          TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro')),
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 2) projects     (los proyectos de audio de cada usuario)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  description        TEXT,
  audio_name         TEXT,
  audio_duration_ms  INTEGER,
  eq_state           JSONB NOT NULL DEFAULT '{"low":0,"mid":0,"high":0,"preset":"Flat","presetKey":"Flat"}'::jsonb,
  status             TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','analyzed','exported')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 3) analysis_results (métricas librosa + sugerencias Gemini)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analysis_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metrics       JSONB NOT NULL,
  suggestions   JSONB,
  model         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 4) subscriptions (futuro cobro Pro via Stripe; la coloca un webhook)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan                TEXT NOT NULL DEFAULT 'pro' CHECK (plan = 'pro'),
  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','trialing','past_due','canceled','paused')),
  provider            TEXT NOT NULL DEFAULT 'stripe',
  provider_ref        TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- ----------------------------------------------------------------
-- Índices
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_projects_user_id        ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at     ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_project_id     ON analysis_results(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_created_at     ON analysis_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id   ON subscriptions(user_id);

-- ----------------------------------------------------------------
-- Trigger para mantener updated_at
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
--  Comandos útiles (copia/pega según necesites)
-- =============================================================================
--  - Asignar plan Pro a un usuario tras el pago (webhook de Stripe):
--      UPDATE users SET plan = 'pro'
--      WHERE firebase_uid = '<FIREBASE_UID>';
--
--  - Ver los análisis de un proyecto:
--      SELECT id, created_at, metrics->>'dominant_band' AS "banda_dominante",
--             jsonb_array_length(COALESCE(suggestions,'[]'::jsonb)) AS "sugg"
--      FROM analysis_results WHERE project_id = '<PROJECT_ID>';
--
--  - Borrado seguro: los proyectos se eliminan en cascada con el usuario
--    (ON DELETE CASCADE).

COMMIT;