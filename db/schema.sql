-- ============================================================
--  SoundCraft AI · Schema de datos
--  Ejecutar una sola vez en su base Supabase (SQL Editor),
--  o con: psql $DATABASE_URL -f db/schema.sql
--  Todas las sentencias son idempotentes (IF NOT EXISTS).
-- ============================================================

-- ---------- Usuarios / suscripciones ----------
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);

-- ---------- Proyectos ----------
ALTER TABLE IF EXISTS projects
  ADD COLUMN IF NOT EXISTS bpm integer,
  ADD COLUMN IF NOT EXISTS "key" text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- ---------- Módulo: análisis espectral / sugerencias IA ----------
CREATE TABLE IF NOT EXISTS analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  suggestions jsonb DEFAULT NULL,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analysis_project ON analysis_results(project_id, created_at DESC);

-- ---------- Módulo: Auto-Pitch / Corrector de notas ----------
CREATE TABLE IF NOT EXISTS pitch_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note text NOT NULL,
  cents real NOT NULL DEFAULT 0,
  correction_cents real NOT NULL DEFAULT 0,
  t_start real,
  t_end real,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pitch_project ON pitch_analysis(project_id, created_at DESC);

-- ---------- Módulo: Denoiser / Stem splitter ----------
CREATE TABLE IF NOT EXISTS stem_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stem_type text NOT NULL,            -- vocal | bass | drums | outros | full
  filter_low real, filter_high real,  -- rango de paso-banda aplicado
  output_samplerate integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stems_project ON stem_exports(project_id, created_at DESC);

-- ---------- Módulo: A/B Reference Matcher ----------
CREATE TABLE IF NOT EXISTS reference_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference_name text NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ref_project ON reference_analysis(project_id, created_at DESC);

-- ---------- Módulo: Instant Master (LUFS) ----------
CREATE TABLE IF NOT EXISTS masters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_lufs real NOT NULL,
  measured_lufs real,
  gain_db real NOT NULL DEFAULT 0,
  output_samplerate integer NOT NULL DEFAULT 44100,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_masters_project ON masters(project_id, created_at DESC);

-- ---------- Módulo: Chord Progression Generator (IA) ----------
CREATE TABLE IF NOT EXISTS chord_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_name text,
  mood text,
  chords jsonb NOT NULL,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chords_project ON chord_generations(project_id, created_at DESC);

-- ---------- Módulo: Audio Format Converter ----------
CREATE TABLE IF NOT EXISTS conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_format text,
  target_format text NOT NULL,      -- wav | mp3(aprox.) | m4a(aprox.)
  bit_depth integer,                -- 16 | 24
  sample_rate integer,              -- 44100 | 48000
  channels integer,                 -- 1 | 2
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conversions_project ON conversions(project_id, created_at DESC);

-- ---------- Módulo: Tap Tempo & Key Finder ----------
CREATE TABLE IF NOT EXISTS tempo_detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bpm integer,
  key_name text,
  source text,   -- tap | chroma
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tempo_project ON tempo_detections(project_id, created_at DESC);

-- ---------- Módulo: Copyright & Metadata Tagging ----------
CREATE TABLE IF NOT EXISTS copyright_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text, artist text, album text, year integer,
  isrc text, upc text, genre text,
  audio_hash text NOT NULL,        -- SHA-256 del audio
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);
CREATE INDEX IF NOT EXISTS idx_copyright_user ON copyright_metadata(user_id);

-- ---------- Módulo: Engineer Marketplace ----------
CREATE TABLE IF NOT EXISTS marketplace_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  track_title text,
  service text NOT NULL,           -- mixing | mastering | both
  duration_min integer,
  estimated_budget integer,
  notes text,
  status text NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketplace_user ON marketplace_requests(user_id, created_at DESC);

-- ---------- Módulo: Gamificación (Daily Challenges) ----------
CREATE TABLE IF NOT EXISTS challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_date date NOT NULL,
  challenge_key text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  xp integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_date, challenge_key)
);
CREATE INDEX IF NOT EXISTS idx_challenges_user ON challenge_progress(user_id, challenge_date DESC);

-- ---------- Tabla común para cuotas por módulo ----------
CREATE TABLE IF NOT EXISTS module_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module text NOT NULL,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module, usage_date)
);
CREATE INDEX IF NOT EXISTS idx_module_usage_user ON module_usage(user_id, module, usage_date);