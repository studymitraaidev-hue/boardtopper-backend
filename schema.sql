-- DAY 33: No SQL migration needed. Image upload uses multer memoryStorage.

-- DAY 34 MIGRATION — run in Supabase SQL Editor before deploying:
-- CREATE TABLE IF NOT EXISTS notifications (
--   id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--   type       TEXT NOT NULL,
--   title      TEXT NOT NULL,
--   body       TEXT NOT NULL,
--   read       BOOLEAN NOT NULL DEFAULT false,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );
-- CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = false;

-- DAY 31 MIGRATION — run in Supabase SQL Editor before deploying:
-- NOTE: All four indexes below already exist in this schema — no action needed.
-- CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
-- CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, timestamp DESC);
-- CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
-- CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON user_notes(user_id);

-- DAY 29 MIGRATION — run in Supabase SQL Editor before deploying:
-- CREATE TABLE IF NOT EXISTS refresh_tokens (
--   id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--   token      TEXT NOT NULL UNIQUE,
--   expires_at TIMESTAMPTZ NOT NULL,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );
-- CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
-- CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

-- DAY 27 MIGRATION — run in Supabase SQL Editor before deploying:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_token TEXT NULL;

-- DAY 21 MIGRATION — run in Supabase SQL Editor before deploying:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- ============================================================================
-- BoardTopperAI — Supabase SQL Schema
-- Run this ONCE in Supabase SQL Editor: https://supabase.com/dashboard
-- Safe to re-run: uses IF NOT EXISTS and DO $$ blocks
-- ============================================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram indexes for search

-- ============================================================================
-- TABLE: users
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL CHECK (char_length(name) >= 2),
  email             TEXT        NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash     TEXT        NOT NULL,
  plan              TEXT        NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro')),
  board             TEXT        NOT NULL DEFAULT 'maharashtra' CHECK (board IN ('maharashtra','cbse')),

  -- Stage 10: onboarding profile fields
  language          TEXT        NOT NULL DEFAULT 'english'
                                CHECK (language IN ('english','marathi','hindi','semi')),
  target_percent    INT         NOT NULL DEFAULT 90
                                CHECK (target_percent BETWEEN 50 AND 100),
  weak_subjects     TEXT[]      NOT NULL DEFAULT '{}',

  -- Stage 12: password reset
  reset_token       TEXT,
  reset_token_expires TIMESTAMPTZ,

  -- Streak tracking (Stage 13)
  streak_count      INT         NOT NULL DEFAULT 0,
  last_active_date  DATE,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for email lookups (auth)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- TABLE: subjects
-- ============================================================================
CREATE TABLE IF NOT EXISTS subjects (
  id              TEXT        PRIMARY KEY,   -- e.g. 'maths', 'science'
  name            TEXT        NOT NULL,
  emoji           TEXT        NOT NULL DEFAULT '📚',
  board           TEXT        NOT NULL DEFAULT 'maharashtra',
  class           INT         NOT NULL DEFAULT 10,
  total_chapters  INT         NOT NULL DEFAULT 0,
  color           TEXT        NOT NULL DEFAULT 'from-blue-500 to-blue-600',
  light           TEXT        NOT NULL DEFAULT 'bg-blue-50',
  text            TEXT        NOT NULL DEFAULT 'text-blue-700'
);

-- ============================================================================
-- TABLE: chapters
-- ============================================================================
CREATE TABLE IF NOT EXISTS chapters (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id      TEXT        NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  chapter_number  INT         NOT NULL,
  name            TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'Ready'
                              CHECK (status IN ('Ready','Updated','Generating','Coming Soon')),
  type            TEXT        NOT NULL DEFAULT 'Core'
                              CHECK (type IN ('High Weightage','Important','Core','Coming Soon')),
  free            BOOLEAN     NOT NULL DEFAULT false,
  marks           INT         NOT NULL DEFAULT 5,
  topics          TEXT[]      NOT NULL DEFAULT '{}',

  UNIQUE(subject_id, chapter_number)
);

CREATE INDEX IF NOT EXISTS idx_chapters_subject ON chapters(subject_id);

-- DAY 25 MIGRATION — run in Supabase SQL Editor before deploying:
-- CREATE INDEX IF NOT EXISTS idx_chapters_name_trgm ON chapters USING gin(name gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_notes_title_trgm ON notes USING gin(title gin_trgm_ops);

-- ============================================================================
-- TABLE: notes
-- ============================================================================
CREATE TABLE IF NOT EXISTS notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id  UUID        NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  subject_id  TEXT        NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  sections    JSONB       NOT NULL DEFAULT '[]',
  board_tip   TEXT,
  pyqs        JSONB       NOT NULL DEFAULT '[]',
  type        TEXT        NOT NULL DEFAULT 'notes' CHECK (type IN ('notes','test','sheet')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_notes_user    ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_chapter ON notes(chapter_id);

DROP TRIGGER IF EXISTS trg_notes_updated_at ON notes;
CREATE TRIGGER trg_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- TABLE: conversations
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('user','model')),
  text        TEXT        NOT NULL,
  subject     TEXT,
  chapter_id  UUID        REFERENCES chapters(id) ON DELETE SET NULL,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, timestamp DESC);

-- ============================================================================
-- TABLE: payments
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  razorpay_order_id    TEXT        NOT NULL UNIQUE,
  razorpay_payment_id  TEXT,
  amount               INT         NOT NULL,   -- in paise (₹299 = 29900)
  currency             TEXT        NOT NULL DEFAULT 'INR',
  status               TEXT        NOT NULL DEFAULT 'created'
                                   CHECK (status IN ('created','paid','failed','pending')),
  plan                 TEXT        NOT NULL DEFAULT 'monthly'
                                   CHECK (plan IN ('monthly','yearly')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- TABLE: schedule
-- ============================================================================
CREATE TABLE IF NOT EXISTS schedule (
  id        UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  time      TEXT    NOT NULL,
  task      TEXT    NOT NULL,
  subject   TEXT    NOT NULL CHECK (subject IN ('maths','science','history','geography','english')),
  priority  TEXT    NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  done      BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_schedule_user ON schedule(user_id);

-- ============================================================================
-- TABLE: progress  (Stage 13)
-- ============================================================================
CREATE TABLE IF NOT EXISTS progress (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id   TEXT        NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  chapter_id   UUID        NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score        INT         CHECK (score BETWEEN 0 AND 100),   -- optional quiz score

  UNIQUE(user_id, chapter_id)   -- each chapter counted once per user
);

CREATE INDEX IF NOT EXISTS idx_progress_user    ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_subject ON progress(user_id, subject_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- Backend uses service key (bypasses RLS) — these policies protect direct
-- client/anon access. Keep them strict.
-- ============================================================================

ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule      ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress      ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters      ENABLE ROW LEVEL SECURITY;

-- subjects + chapters: public read (no auth needed to browse syllabus)
DROP POLICY IF EXISTS "subjects_read" ON subjects;
CREATE POLICY "subjects_read" ON subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS "chapters_read" ON chapters;
CREATE POLICY "chapters_read" ON chapters FOR SELECT USING (true);

-- All other tables: service role only (backend uses service key — full access)
-- Direct client access denied entirely.
DROP POLICY IF EXISTS "users_deny_direct" ON users;
CREATE POLICY "users_deny_direct" ON users FOR ALL USING (false);

DROP POLICY IF EXISTS "notes_deny_direct" ON notes;
CREATE POLICY "notes_deny_direct" ON notes FOR ALL USING (false);

DROP POLICY IF EXISTS "conversations_deny_direct" ON conversations;
CREATE POLICY "conversations_deny_direct" ON conversations FOR ALL USING (false);

DROP POLICY IF EXISTS "payments_deny_direct" ON payments;
CREATE POLICY "payments_deny_direct" ON payments FOR ALL USING (false);

DROP POLICY IF EXISTS "schedule_deny_direct" ON schedule;
CREATE POLICY "schedule_deny_direct" ON schedule FOR ALL USING (false);

DROP POLICY IF EXISTS "progress_deny_direct" ON progress;
CREATE POLICY "progress_deny_direct" ON progress FOR ALL USING (false);

-- ============================================================================
-- SEED DATA — Maharashtra SSC Class 10 Subjects
-- ============================================================================

INSERT INTO subjects (id, name, emoji, board, class, total_chapters, color, light, text)
VALUES
  ('algebra',       'Algebra',          '📐', 'maharashtra', 10, 5,  'from-blue-500 to-blue-600',    'bg-blue-50',    'text-blue-700'),
  ('geometry',      'Geometry',         '📏', 'maharashtra', 10, 8,  'from-violet-500 to-violet-600','bg-violet-50',  'text-violet-700'),
  ('science1',      'Science Part 1',   '⚗️', 'maharashtra', 10, 10, 'from-emerald-500 to-teal-500', 'bg-emerald-50', 'text-emerald-700'),
  ('science2',      'Science Part 2',   '🌿', 'maharashtra', 10, 10, 'from-green-500 to-green-600',  'bg-green-50',   'text-green-700'),
  ('history',       'History & Pol Sc', '🏛️', 'maharashtra', 10, 8,  'from-amber-500 to-orange-500', 'bg-amber-50',   'text-amber-700'),
  ('geography',     'Geography',        '🌍', 'maharashtra', 10, 8,  'from-cyan-500 to-sky-500',     'bg-cyan-50',    'text-cyan-700'),
  ('english',       'English',          '📖', 'maharashtra', 10, 4,  'from-rose-500 to-pink-500',    'bg-rose-50',    'text-rose-700')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEED DATA — Chapters (Maharashtra SSC Class 10, 2024-25 syllabus)
-- ============================================================================

-- ALGEBRA (5 chapters, total 40 marks)
INSERT INTO chapters (subject_id, chapter_number, name, status, type, free, marks, topics)
VALUES
  ('algebra', 1, 'Linear Equations in Two Variables', 'Ready', 'High Weightage', true,  8,
   ARRAY['Graphical method','Substitution method','Elimination method','Cross multiplication','Word problems']),
  ('algebra', 2, 'Quadratic Equations',                'Ready', 'High Weightage', true,  8,
   ARRAY['Standard form','Factorisation','Completing the square','Quadratic formula','Nature of roots','Word problems']),
  ('algebra', 3, 'Arithmetic Progression',             'Ready', 'High Weightage', false, 8,
   ARRAY['nth term formula','Sum of n terms','Word problems','Arithmetic mean']),
  ('algebra', 4, 'Financial Planning',                  'Ready', 'Important',      false, 8,
   ARRAY['Savings','Investments','GST calculations','Income tax basics','Budget planning']),
  ('algebra', 5, 'Probability',                         'Ready', 'Important',      false, 8,
   ARRAY['Basic probability','Sample space','Events','Addition theorem','Word problems'])
ON CONFLICT (subject_id, chapter_number) DO NOTHING;

-- GEOMETRY (8 chapters, total 40 marks)
INSERT INTO chapters (subject_id, chapter_number, name, status, type, free, marks, topics)
VALUES
  ('geometry', 1, 'Similarity',                    'Ready', 'High Weightage', true,  7,
   ARRAY['Basic proportionality theorem','Similar triangles','AA SSS SAS criteria','Areas of similar triangles']),
  ('geometry', 2, 'Pythagoras Theorem',             'Ready', 'High Weightage', true,  5,
   ARRAY['Proof','Converse','Application problems','30-60-90 triangles']),
  ('geometry', 3, 'Circle',                         'Ready', 'High Weightage', false, 6,
   ARRAY['Tangent to circle','Secant','Tangent from external point','Touching circles']),
  ('geometry', 4, 'Geometric Constructions',        'Ready', 'Core',           false, 4,
   ARRAY['Division of line segment','Construction of tangents','Similar triangle construction']),
  ('geometry', 5, 'Coordinate Geometry',            'Ready', 'Important',      false, 6,
   ARRAY['Distance formula','Section formula','Slope','Equation of line','Y-intercept']),
  ('geometry', 6, 'Trigonometry',                   'Ready', 'High Weightage', false, 7,
   ARRAY['Trigonometric ratios','Standard angles','Trigonometric identities','Heights and distances']),
  ('geometry', 7, 'Mensuration',                    'Ready', 'Important',      false, 3,
   ARRAY['Frustum of cone','Combination of solids','Surface area','Volume']),
  ('geometry', 8, 'Statistics',                     'Ready', 'Important',      false, 2,
   ARRAY['Mean median mode','Ogive','Cumulative frequency'])
ON CONFLICT (subject_id, chapter_number) DO NOTHING;

-- SCIENCE PART 1 (Physics + Chemistry, 10 chapters)
INSERT INTO chapters (subject_id, chapter_number, name, status, type, free, marks, topics)
VALUES
  ('science1', 1, 'Gravitation',             'Ready', 'High Weightage', true,  8,
   ARRAY['Universal law','g on earth','Free fall','Escape velocity','Kepler laws','Satellite motion']),
  ('science1', 2, 'Periodic Classification of Elements', 'Ready', 'High Weightage', true,  8,
   ARRAY['Mendeleev','Modern periodic table','Periods and groups','Periodic trends','Valency']),
  ('science1', 3, 'Chemical Reactions and Equations',    'Ready', 'Important',      false, 7,
   ARRAY['Types of reactions','Oxidation reduction','Corrosion','Rancidity','Balancing equations']),
  ('science1', 4, 'Effects of Electric Current', 'Ready', 'High Weightage', false, 8,
   ARRAY['Ohms law','Series parallel circuits','Magnetic effect','Electromagnet','Electric motor']),
  ('science1', 5, 'Heat',                    'Ready', 'Important',      false, 7,
   ARRAY['Thermal expansion','Specific heat','Calorimetry','Change of state','Latent heat']),
  ('science1', 6, 'Refraction of Light',     'Ready', 'High Weightage', false, 8,
   ARRAY['Snells law','Refractive index','Critical angle','TIR','Apparent depth']),
  ('science1', 7, 'Lenses',                  'Ready', 'Important',      false, 7,
   ARRAY['Convex concave lens','Ray diagrams','Lens formula','Power of lens','Eye defects']),
  ('science1', 8, 'Metallurgy',              'Ready', 'Core',           false, 7,
   ARRAY['Occurrence of metals','Extraction','Refining','Electrolytic refining','Alloys']),
  ('science1', 9, 'Carbon Compounds',        'Ready', 'High Weightage', false, 8,
   ARRAY['Covalent bonds','Carbon properties','Functional groups','Homologous series','IUPAC nomenclature','Ethanol and ethanoic acid']),
  ('science1', 10,'Space Missions',          'Ready', 'Core',           false, 5,
   ARRAY['History of space exploration','ISRO missions','Satellites','Chandrayaan','Mangalyaan','International space station'])
ON CONFLICT (subject_id, chapter_number) DO NOTHING;

-- SCIENCE PART 2 (Biology + Environment, 10 chapters — correct Maharashtra SSC syllabus)
INSERT INTO chapters (subject_id, chapter_number, name, status, type, free, marks, topics)
VALUES
  ('science2', 1,  'Heredity and Evolution',            'Ready', 'High Weightage', true,  8,
   ARRAY['Heredity','Variation','Mendels laws','Monohybrid dihybrid cross','Evolution theories','Darwin','Lamarck']),
  ('science2', 2,  'Life Processes in Living Organisms Part 1', 'Ready', 'High Weightage', true,  8,
   ARRAY['Nutrition','Photosynthesis','Respiration','Aerobic anaerobic','ATP','Glycolysis']),
  ('science2', 3,  'Life Processes in Living Organisms Part 2', 'Ready', 'Important',      false, 7,
   ARRAY['Transportation in plants','Human circulatory system','Excretion','Kidney','Nephron']),
  ('science2', 4,  'Environmental Management',          'Ready', 'Important',      false, 6,
   ARRAY['Ecosystem','Food chain food web','Biodiversity','Conservation','Pollution','Ozone']),
  ('science2', 5,  'Towards Green Energy',              'Ready', 'Core',           false, 6,
   ARRAY['Conventional energy sources','Non-conventional energy','Solar energy','Wind energy','Biogas']),
  ('science2', 6,  'Animal Classification',             'Ready', 'Core',           false, 6,
   ARRAY['Basis of classification','Vertebrates','Invertebrates','Phyla','Kingdom Animalia']),
  ('science2', 7,  'Introduction to Microbiology',      'Ready', 'Important',      false, 7,
   ARRAY['Bacteria','Viruses','Fungi','Protozoa','Useful microbes','Diseases caused by microbes']),
  ('science2', 8,  'Cell Biology and Biotechnology',    'Ready', 'Important',      false, 7,
   ARRAY['Cell organelles','DNA structure','Cell division','Mitosis','Meiosis','Biotechnology applications']),
  ('science2', 9,  'Social Health',                     'Ready', 'Core',           false, 5,
   ARRAY['Community health','Communicable diseases','Immunity','Vaccination','Substance abuse']),
  ('science2', 10, 'Disaster Management',               'Ready', 'Core',           false, 5,
   ARRAY['Natural disasters','Earthquake','Flood','Cyclone','Disaster preparedness','Relief measures'])
ON CONFLICT (subject_id, chapter_number) DO NOTHING;

-- HISTORY & POLITICAL SCIENCE (8 chapters)
INSERT INTO chapters (subject_id, chapter_number, name, status, type, free, marks, topics)
VALUES
  ('history', 1, 'Heritage of India',                    'Ready', 'Important',      true,  5,
   ARRAY['Cultural heritage','Ancient India','Medieval India','Monuments','UNESCO sites']),
  ('history', 2, 'Renewing of India 1857-1900',          'Ready', 'High Weightage', true,  6,
   ARRAY['1857 revolt','Social reforms','Bal Gangadhar Tilak','Indian National Congress']),
  ('history', 3, 'Growth of Nationalism 1900-1947',      'Ready', 'High Weightage', false, 7,
   ARRAY['Non-cooperation','Civil disobedience','Quit India','Gandhi','Partition']),
  ('history', 4, 'Struggle for Independence',            'Ready', 'Important',      false, 6,
   ARRAY['Subhash Chandra Bose','INA','August 15 1947','Transfer of power']),
  ('history', 5, 'India After Independence',             'Ready', 'Important',      false, 5,
   ARRAY['Constitution','Five year plans','Non-aligned movement','Nehru era']),
  ('history', 6, 'Democratic Process in India',         'Ready', 'Core',           false, 5,
   ARRAY['Elections','Parliament','Fundamental rights','Directive principles']),
  ('history', 7, 'Local Self Government',                'Ready', 'Core',           false, 5,
   ARRAY['Panchayati raj','Municipal corporations','73rd 74th amendment']),
  ('history', 8, 'Emergency and After',                  'Ready', 'Core',           false, 5,
   ARRAY['1975 emergency','Janata party','Coalition era','Economic reforms 1991'])
ON CONFLICT (subject_id, chapter_number) DO NOTHING;

-- GEOGRAPHY (8 chapters)
INSERT INTO chapters (subject_id, chapter_number, name, status, type, free, marks, topics)
VALUES
  ('geography', 1, 'Map Work and Scale',        'Ready', 'Core',           true,  5,
   ARRAY['Types of maps','Scale','Latitude longitude','Grid system','Topographic maps']),
  ('geography', 2, 'Location and Extent',       'Ready', 'Core',           true,  4,
   ARRAY['India location','Neighbouring countries','States and UTs','Standard meridian']),
  ('geography', 3, 'Physical Features of India','Ready', 'High Weightage', false, 7,
   ARRAY['Himalayas','Plains','Deccan plateau','Coastal plains','Islands']),
  ('geography', 4, 'Climate',                   'Ready', 'High Weightage', false, 7,
   ARRAY['Factors affecting climate','Monsoon','Seasons','Rainfall distribution','Cyclones']),
  ('geography', 5, 'Natural Resources',         'Ready', 'Important',      false, 6,
   ARRAY['Types of resources','Soil types','Forest resources','Water resources','Conservation']),
  ('geography', 6, 'Agriculture',               'Ready', 'Important',      false, 6,
   ARRAY['Types of farming','Kharif rabi crops','Major crops','Irrigation','Green revolution']),
  ('geography', 7, 'Industries',                'Ready', 'Important',      false, 6,
   ARRAY['Factors of location','Iron and steel','Textile','Software','Industrial regions']),
  ('geography', 8, 'Transport and Communication','Ready','Core',           false, 5,
   ARRAY['Road rail water air transport','National highways','Ports','Telecommunications'])
ON CONFLICT (subject_id, chapter_number) DO NOTHING;

-- ENGLISH (4 chapters / units)
INSERT INTO chapters (subject_id, chapter_number, name, status, type, free, marks, topics)
VALUES
  ('english', 1, 'Reading Skills',    'Ready', 'High Weightage', true,  20,
   ARRAY['Unseen passage','Note making','Comprehension questions','Vocabulary']),
  ('english', 2, 'Writing Skills',    'Ready', 'High Weightage', true,  20,
   ARRAY['Letter writing','Essay','Notice','Article','Report writing']),
  ('english', 3, 'Grammar',           'Ready', 'Important',      false, 20,
   ARRAY['Tenses','Voice','Narration','Clauses','Error correction','Prepositions']),
  ('english', 4, 'Literature',        'Ready', 'Important',      false, 20,
   ARRAY['Prose','Poetry','Drama','Character sketch','Theme analysis'])
ON CONFLICT (subject_id, chapter_number) DO NOTHING;

-- ============================================================================
-- Done. Verify with:
--   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
--   SELECT id, name, total_chapters FROM subjects;
--   SELECT subject_id, count(*) FROM chapters GROUP BY subject_id;
-- ============================================================================

-- ============================================================================
-- TABLE: subscriptions (FIX: added for full monetisation tracking)
-- Tracks active/cancelled/expired subscriptions per user.
-- Required for subscription management, cancellation, and renewal flows.
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan         TEXT        NOT NULL CHECK (plan IN ('monthly','yearly')),
  status       TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('active','cancelled','expired','failed','pending')),
  starts_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at      TIMESTAMPTZ NOT NULL,
  payment_id   UUID        REFERENCES payments(id),
  cancelled_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

-- ============================================================================
-- TABLE: quiz_attempts (FIX: added for exam simulation scoring history)
-- Records every mock test attempt with score and timing.
-- Required for real Mock Score Avg stat on dashboard.
-- ============================================================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- subject_id is NOT a foreign key — quiz subjects are labels, not locked to
  -- the subjects table. Using a FK here caused runtime constraint violations
  -- when subject strings didn't exactly match subjects.id values.
  subject_id   TEXT        NOT NULL,
  score        INT         NOT NULL CHECK (score BETWEEN 0 AND 100),
  total_q      INT         NOT NULL CHECK (total_q >= 1),
  time_taken   INT,        -- seconds, nullable
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);

-- ============================================================================
-- TABLE: doubt_topics (FIX: added to power real AI Insights panel)
-- Tracks which topics a user asks about most — powers weak-area detection.
-- ============================================================================
CREATE TABLE IF NOT EXISTS doubt_topics (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id  TEXT        NOT NULL,
  topic       TEXT        NOT NULL,
  count       INT         NOT NULL DEFAULT 1,
  last_asked  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, subject_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_doubt_topics_user ON doubt_topics(user_id);

-- RLS: deny direct client access to new tables (backend uses service key)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE doubt_topics   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_deny_direct" ON subscriptions;
CREATE POLICY "subscriptions_deny_direct" ON subscriptions FOR ALL USING (false);

DROP POLICY IF EXISTS "quiz_attempts_deny_direct" ON quiz_attempts;
CREATE POLICY "quiz_attempts_deny_direct" ON quiz_attempts  FOR ALL USING (false);

DROP POLICY IF EXISTS "doubt_topics_deny_direct" ON doubt_topics;
CREATE POLICY "doubt_topics_deny_direct"  ON doubt_topics   FOR ALL USING (false);

-- ============================================================================
-- TABLE: user_notes  (DAY 3 — personal CRUD notes, user-scoped)
-- Separate from the AI-generated chapter "notes" table.
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL CHECK (char_length(title) >= 1),
  content     TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON user_notes(user_id);

DROP TRIGGER IF EXISTS trg_user_notes_updated_at ON user_notes;
CREATE TRIGGER trg_user_notes_updated_at
  BEFORE UPDATE ON user_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: deny direct client access; backend uses service role key
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_notes_deny_direct" ON user_notes;
CREATE POLICY "user_notes_deny_direct" ON user_notes FOR ALL USING (false);

-- ============================================================================
-- DAY 6 MIGRATION — Subscription lifecycle statuses
-- Adds 'failed' and 'pending' to subscriptions.status CHECK constraint.
-- Run this in Supabase SQL Editor if upgrading from Day 5 schema.
-- Safe to skip if creating schema fresh (CREATE TABLE above already includes it).
-- ============================================================================

-- Drop old constraint and replace with full status set
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'cancelled', 'expired', 'failed', 'pending'));

-- Add trigger for subscriptions.updated_at (missed in original schema)
DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

CREATE OR REPLACE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- DAY 8 MIGRATION — Webhook + Subscription Sync
-- Adds 'pending' to payments.status CHECK constraint so webhook processing
-- can write intermediate states without a constraint violation.
-- Safe to run multiple times (DROP + ADD is idempotent).
-- ============================================================================

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN ('created', 'paid', 'failed', 'pending'));

-- Idempotency index: ensures one payment row per Razorpay order
-- (already UNIQUE on razorpay_order_id, confirmed above — no change needed)

-- ============================================================================
-- TABLE: generated_questions (DAY 10)
-- Caches AI-generated MCQ questions by chapter to avoid Gemini calls on
-- every quiz load. Questions expire after 7 days via the expires_at column.
-- ============================================================================
CREATE TABLE IF NOT EXISTS generated_questions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id   UUID        NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  subject_id   TEXT        NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  question     TEXT        NOT NULL,
  options      JSONB       NOT NULL,  -- array of 4 strings: ["A","B","C","D"]
  correct_index INT        NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  difficulty   TEXT        NOT NULL DEFAULT 'medium'
               CHECK (difficulty IN ('easy','medium','hard')),
  marks        INT         NOT NULL DEFAULT 2,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_genq_chapter ON generated_questions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_genq_subject ON generated_questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_genq_expires ON generated_questions(expires_at);

ALTER TABLE generated_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "genq_deny_direct" ON generated_questions;
CREATE POLICY "genq_deny_direct" ON generated_questions FOR ALL USING (false);

-- ============================================================================
-- COLUMN: users.exam_date (DAY 11)
-- Stores the student's target board exam date for countdown display.
-- Maharashtra SSC exams are typically in March.
-- NULL means the student has not set their exam date yet.
-- ============================================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS exam_date DATE NULL;

COMMENT ON COLUMN users.exam_date IS
  'Target board exam date set by student. NULL = not set. Used for dashboard countdown.';

-- ============================================================================
-- TABLE: chapter_content (DAY 12)
-- Stores structured Maharashtra SSC board-specific content for each chapter.
-- This is the knowledge base that makes AI answers board-specific.
--
-- key_concepts  : array of {term, definition} objects
-- formulas      : array of {name, formula, when_to_use} objects  
-- board_tips    : paragraph of what examiners check for, common mistakes
-- important_points : bullet array of must-know facts
-- pyq_patterns  : how this chapter appears in past Maharashtra SSC papers
-- marks_breakdown  : marks distribution (e.g. "1 mark definition, 4 mark proof")
-- ============================================================================
CREATE TABLE IF NOT EXISTS chapter_content (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id       UUID        NOT NULL UNIQUE REFERENCES chapters(id) ON DELETE CASCADE,
  key_concepts     JSONB       NOT NULL DEFAULT '[]',
  formulas         JSONB       NOT NULL DEFAULT '[]',
  board_tips       TEXT        NOT NULL DEFAULT '',
  important_points TEXT[]      NOT NULL DEFAULT '{}',
  pyq_patterns     TEXT        NOT NULL DEFAULT '',
  marks_breakdown  TEXT        NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chapter_content_chapter
  ON chapter_content(chapter_id);

ALTER TABLE chapter_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chapter_content_deny_direct" ON chapter_content;
CREATE POLICY "chapter_content_deny_direct"
  ON chapter_content FOR ALL USING (false);

-- ============================================================================
-- SEED: Maharashtra SSC Class 10 Maths — chapter_content
-- 13 chapters: 5 Algebra + 8 Geometry
--
-- HOW TO RUN:
-- 1. First run the CREATE TABLE block above in Supabase SQL Editor
-- 2. Then run the INSERT blocks below chapter by chapter
--    (or all at once — they use ON CONFLICT DO NOTHING so safe to re-run)
--
-- The chapter UUIDs below use the WITH clause to look up chapters by name
-- so this seed works regardless of what UUIDs were generated for your chapters.
-- ============================================================================

-- ── ALGEBRA ──────────────────────────────────────────────────────────────────

-- 1. Linear Equations in Two Variables
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Linear equation in two variables", "definition": "An equation of the form ax + by + c = 0 where a, b, c are real numbers and a, b are not both zero. Its graph is always a straight line."},
    {"term": "Solution of a system", "definition": "A pair of values (x, y) that satisfies both equations simultaneously. Geometrically it is the point of intersection of the two lines."},
    {"term": "Consistent system", "definition": "A system that has at least one solution. If lines intersect at one point: unique solution. If lines coincide: infinitely many solutions."},
    {"term": "Inconsistent system", "definition": "A system with no solution. Lines are parallel and never intersect. Condition: a1/a2 = b1/b2 ≠ c1/c2."},
    {"term": "Graphical method", "definition": "Plot both equations as straight lines on coordinate axes. The intersection point gives the solution."},
    {"term": "Substitution method", "definition": "Express one variable in terms of the other from one equation and substitute into the second equation."},
    {"term": "Elimination method", "definition": "Multiply equations by suitable constants to make coefficients of one variable equal, then add or subtract to eliminate that variable."}
  ]'::jsonb,
  '[
    {"name": "Consistency conditions", "formula": "Unique solution: a1/a2 ≠ b1/b2 | Infinite solutions: a1/a2 = b1/b2 = c1/c2 | No solution: a1/a2 = b1/b2 ≠ c1/c2", "when_to_use": "To determine type of system before solving. Always check this in 4-mark problems."},
    {"name": "Cross-multiplication method", "formula": "x/(b1c2 - b2c1) = y/(c1a2 - c2a1) = 1/(a1b2 - a2b1)", "when_to_use": "When elimination and substitution are both messy. Fast for competitive exam style questions."}
  ]'::jsonb,
  'Maharashtra SSC examiners award marks for each step shown clearly. Always write: Step 1 — form equations from word problem. Step 2 — label which method you are using. Step 3 — show all arithmetic. Step 4 — write answer in a box or underline it. Common mistakes: writing equations with wrong signs from word problems, forgetting to verify the solution by substituting back.',
  ARRAY[
    'A system of two linear equations can have exactly one solution, infinitely many solutions, or no solution.',
    'Graphical method: if lines intersect → one solution; parallel → no solution; coincident → infinite solutions.',
    'For word problems always define variables explicitly at the start: Let x = ... and y = ...',
    'Elimination method: make coefficients of one variable equal then add/subtract equations.',
    'Always verify your solution by substituting back into BOTH original equations.',
    'The consistency condition ratios use a1, b1, c1 from equation 1 and a2, b2, c2 from equation 2.'
  ],
  '2019-2024 pattern: A word problem forming two equations appears every year as a 4-mark question. Common word problem types: age problems, price problems, speed-distance problems, digit problems. A straight definition or consistency type question appears as 2-mark question almost every year.',
  '1 mark: state type of system (consistent/inconsistent). 2 marks: solve simple system by one method. 4 marks: word problem forming system and solving completely.'
FROM chapters c
JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%linear equation%' AND s.id = 'algebra'
ON CONFLICT (chapter_id) DO NOTHING;

-- 2. Quadratic Equations
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Quadratic equation", "definition": "An equation of the form ax² + bx + c = 0 where a ≠ 0. The highest power of the variable is 2."},
    {"term": "Roots of quadratic equation", "definition": "The values of x that satisfy ax² + bx + c = 0. A quadratic equation has exactly two roots (real or complex)."},
    {"term": "Discriminant", "definition": "The value b² - 4ac. Determines the nature of roots without actually solving the equation."},
    {"term": "Nature of roots", "definition": "If D > 0: two distinct real roots. If D = 0: two equal real roots. If D < 0: no real roots (roots are complex/imaginary)."},
    {"term": "Factorisation method", "definition": "Express ax² + bx + c as a product of two linear factors (px + q)(rx + s) and set each factor to zero."},
    {"term": "Completing the square", "definition": "Rewrite ax² + bx + c by adding and subtracting (b/2a)² to form a perfect square trinomial, then solve."},
    {"term": "Sum and product of roots", "definition": "If α and β are roots: α + β = -b/a and α × β = c/a. Used to verify roots and form equations."}
  ]'::jsonb,
  '[
    {"name": "Quadratic formula", "formula": "x = (-b ± √(b² - 4ac)) / 2a", "when_to_use": "When factorisation is not obvious or roots are irrational. Always mention this formula by name before using it."},
    {"name": "Discriminant", "formula": "D = b² - 4ac", "when_to_use": "To find nature of roots WITHOUT solving. Examiners frequently ask this as a standalone 2-mark question."},
    {"name": "Sum of roots", "formula": "α + β = -b/a", "when_to_use": "To verify roots after solving, or to find unknown coefficients."},
    {"name": "Product of roots", "formula": "α × β = c/a", "when_to_use": "Same as sum of roots — verification and coefficient problems."},
    {"name": "Form equation from roots", "formula": "x² - (α+β)x + αβ = 0", "when_to_use": "When asked to form equation given two roots."}
  ]'::jsonb,
  'Examiners check: (1) correct identification of a, b, c values with signs, (2) discriminant calculated correctly, (3) nature of roots stated explicitly using board language — write "Since D > 0, the roots are real and distinct" not just the number. For factorisation method, show the middle term split step clearly: 6x² + 7x - 3 = 6x² + 9x - 2x - 3. Word problems: always state what x represents, form equation, solve, and check if answer makes sense in context (no negative lengths etc).',
  ARRAY[
    'Standard form is ax² + bx + c = 0 — always rearrange to this form before identifying a, b, c.',
    'Discriminant D = b² - 4ac: D > 0 means real distinct roots, D = 0 means real equal roots, D < 0 means no real roots.',
    'Factorisation: split middle term bx into two terms whose product = ac and sum = b.',
    'Quadratic formula gives exact roots even when factorisation fails — preferred for irrational roots.',
    'Sum of roots α + β = -b/a and product of roots αβ = c/a — memorise these.',
    'To form a quadratic equation from given roots α and β: x² - (α+β)x + αβ = 0.',
    'Always check your roots by substituting back into the original equation.'
  ],
  '2019-2024 pattern: Nature of roots (find D and state nature) appears as 2-mark question every single year without exception. Word problem requiring formation and solution of quadratic appears as 4-mark question in most years. Factorisation by middle term split is the most tested method. Quadratic formula questions appear when roots are irrational (often involve √ in answer).',
  '1 mark: identify type of equation. 2 marks: find discriminant and state nature of roots. 4 marks: solve word problem using quadratic equation completely.'
FROM chapters c
JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%quadratic%' AND s.id = 'algebra'
ON CONFLICT (chapter_id) DO NOTHING;

-- 3. Arithmetic Progression
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Arithmetic Progression (AP)", "definition": "A sequence of numbers where the difference between any two consecutive terms is constant. This constant difference is called the common difference d."},
    {"term": "Common difference (d)", "definition": "d = a2 - a1 = a3 - a2 = ... (any term minus preceding term). Can be positive, negative, or zero."},
    {"term": "General term (nth term)", "definition": "tn = a + (n-1)d where a is the first term, n is the term number, d is the common difference."},
    {"term": "Sum of n terms (Sn)", "definition": "The sum of the first n terms of an AP. Two formulas exist — use Sn = n/2[2a + (n-1)d] when last term is unknown, use Sn = n/2[a + l] when last term l is known."},
    {"term": "First term (a)", "definition": "The starting value of the sequence. Also written as t1 or a1."},
    {"term": "Last term (l or tn)", "definition": "The nth term of the AP. l = a + (n-1)d."}
  ]'::jsonb,
  '[
    {"name": "nth term formula", "formula": "tn = a + (n-1)d", "when_to_use": "To find any specific term, or to find n given a term value, or to find d given two terms."},
    {"name": "Sum formula 1", "formula": "Sn = n/2 × [2a + (n-1)d]", "when_to_use": "When you know a, d, and n but NOT the last term."},
    {"name": "Sum formula 2", "formula": "Sn = n/2 × (a + l)", "when_to_use": "When you know the first term a and last term l."},
    {"name": "Find number of terms", "formula": "n = (l - a)/d + 1", "when_to_use": "When asked how many terms are in the AP."},
    {"name": "Three terms in AP", "formula": "Use a-d, a, a+d as three terms", "when_to_use": "When three numbers are in AP — this substitution simplifies the algebra significantly."},
    {"name": "Four terms in AP", "formula": "Use a-3d, a-d, a+d, a+3d as four terms", "when_to_use": "When four numbers are in AP — symmetric form keeps algebra clean."}
  ]'::jsonb,
  'Examiners give full marks only if you write the formula first, then substitute values. Never substitute directly without writing the formula. Common mistakes: confusing n (number of terms) with tn (nth term), using wrong formula (Sn formula when tn is asked), sign errors with negative d. For problems asking to find AP when sum of terms is given with other conditions — set up two equations using Sn and tn formulas and solve simultaneously.',
  ARRAY[
    'An AP is defined by its first term a and common difference d.',
    'Common difference d = (any term) - (immediately preceding term). Always check with at least two consecutive pairs.',
    'nth term: tn = a + (n-1)d. The n must be a positive integer.',
    'Sum of n terms: Sn = n/2[2a + (n-1)d]. If last term is known use Sn = n/2[a+l].',
    'If nth term is given as an expression in n, it is NOT necessarily an AP — check if common difference is constant.',
    'Three consecutive terms in AP: take as a-d, a, a+d to simplify word problems.',
    'Sn - S(n-1) = tn. Use this to find nth term from sum formula.'
  ],
  '2019-2024 pattern: Finding nth term and sum of n terms each appear as 2-mark questions almost every year. Word problem (find AP given conditions on sum or terms) appears as 4-mark question frequently. Questions about how many terms give a particular sum are common. First term and common difference from given conditions is a reliable 2-mark question type.',
  '1 mark: check if sequence is AP, find common difference. 2 marks: find specific term or sum. 4 marks: word problem finding AP from given conditions or sum problems with two conditions.'
FROM chapters c
JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%arithmetic%' AND s.id = 'algebra'
ON CONFLICT (chapter_id) DO NOTHING;

-- 4. Financial Planning (Algebra)
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "GST (Goods and Services Tax)", "definition": "A unified indirect tax levied on supply of goods and services in India. Replaced multiple taxes like VAT, service tax, excise duty."},
    {"term": "CGST", "definition": "Central GST — collected by Central Government. Always equal to SGST in intra-state transactions."},
    {"term": "SGST", "definition": "State GST — collected by State Government. Equal to CGST for intra-state supply."},
    {"term": "IGST", "definition": "Integrated GST — for inter-state supply. IGST = CGST + SGST rate combined."},
    {"term": "GST rate slabs", "definition": "0%, 5%, 12%, 18%, 28% are the main GST slabs. Examiners specify the rate in each question."},
    {"term": "Marked price (MP)", "definition": "The price listed on the item before any discount. Also called list price or MRP."},
    {"term": "Discount", "definition": "Reduction on marked price. Discount = MP × discount% / 100. Selling Price = MP - Discount."},
    {"term": "Selling price (SP)", "definition": "The price at which item is sold. GST is calculated on SP (after discount), not on MP."},
    {"term": "Input tax credit", "definition": "The GST already paid by a business on its purchases, which it can deduct from its GST liability on sales."}
  ]'::jsonb,
  '[
    {"name": "GST calculation", "formula": "GST amount = SP × GST rate / 100 | CGST = SGST = GST/2 (for intra-state)", "when_to_use": "All GST problems. Remember GST is on SP after discount, NOT on MP."},
    {"name": "Selling price with discount", "formula": "SP = MP - Discount = MP × (1 - discount%/100)", "when_to_use": "When marked price and discount percentage are given."},
    {"name": "Price paid by customer", "formula": "Total price = SP + GST amount = SP × (1 + GST rate/100)", "when_to_use": "Final amount customer pays including GST."},
    {"name": "Tax payable to government", "formula": "Tax payable = Output tax - Input tax credit", "when_to_use": "In chain of supply questions (manufacturer → wholesaler → retailer)."}
  ]'::jsonb,
  'Maharashtra SSC examiners always specify: (1) whether transaction is intra-state or inter-state, (2) the GST rate. Students must remember: GST is calculated on SP (price after discount), not on marked price. A very common mistake is applying GST to the marked price. Always show: Step 1 find SP after discount, Step 2 calculate GST, Step 3 split into CGST+SGST or show as IGST, Step 4 find total price paid.',
  ARRAY[
    'GST replaced VAT, Service Tax, and Excise Duty from 1 July 2017.',
    'Intra-state: CGST + SGST (each half of total GST rate). Inter-state: IGST only.',
    'GST is always calculated on the selling price AFTER discount — never on marked price.',
    'Common GST rates in exam problems: 5% (essential goods), 12% (processed food), 18% (electronics, services), 28% (luxury items).',
    'Input tax credit: a business pays GST on purchase but can claim it back against GST collected on sales.',
    'Profit/Loss: Profit = SP - CP. Profit% = (Profit/CP) × 100.'
  ],
  '2019-2024 pattern: GST problem with intra-state transaction (split into CGST+SGST) appears every year as 3-4 mark question. Problems involving discount then GST are very common. Input tax credit problems (manufacturer-wholesaler-retailer chain) appear occasionally as 4-mark questions.',
  '2 marks: simple GST calculation on a transaction. 3-4 marks: GST with discount, or GST in a supply chain with input tax credit.'
FROM chapters c
JOIN subjects s ON c.subject_id = s.id
WHERE (c.name ILIKE '%financial%' OR c.name ILIKE '%GST%' OR c.name ILIKE '%tax%') AND s.id = 'algebra'
ON CONFLICT (chapter_id) DO NOTHING;

-- 5. Probability (Algebra)
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Experiment", "definition": "Any action or process that produces observable outcomes. Example: tossing a coin, rolling a die."},
    {"term": "Sample space (S)", "definition": "The set of all possible outcomes of an experiment. For a coin: S = {H, T}. For a die: S = {1,2,3,4,5,6}."},
    {"term": "Event", "definition": "Any subset of the sample space. It is the collection of outcomes we are interested in."},
    {"term": "Probability of an event", "definition": "P(A) = Number of favourable outcomes / Total number of outcomes in sample space. Always between 0 and 1 inclusive."},
    {"term": "Complementary event", "definition": "Event A complement (A'') contains all outcomes NOT in A. P(A) + P(A'') = 1, so P(A'') = 1 - P(A)."},
    {"term": "Impossible event", "definition": "An event that can never occur. P(impossible event) = 0."},
    {"term": "Certain event", "definition": "An event that always occurs. P(certain event) = 1."}
  ]'::jsonb,
  '[
    {"name": "Classical probability", "formula": "P(A) = n(A) / n(S) where n(A) = favourable outcomes, n(S) = total outcomes", "when_to_use": "All basic probability problems. Always list sample space first."},
    {"name": "Complement rule", "formula": "P(A'') = 1 - P(A)", "when_to_use": "When it is easier to find probability of event NOT happening. ''At least one'' problems always use complement."},
    {"name": "Range of probability", "formula": "0 ≤ P(A) ≤ 1", "when_to_use": "To verify your answer. Any probability outside this range means a calculation error."},
    {"name": "Cards sample space", "formula": "Total 52 cards: 4 suits (Hearts, Diamonds, Clubs, Spades) × 13 cards each. Face cards: Jack, Queen, King (12 total).", "when_to_use": "Card problems — know this structure by heart. Ace is NOT a face card."}
  ]'::jsonb,
  'Maharashtra examiners always want sample space written out (at least for small spaces like coins and dice). For playing card questions, students must know: 52 total cards, 4 suits, 13 per suit, 12 face cards, 4 aces. Ace is NOT counted as a face card in SSC board problems. Common mistake: writing P(A) = favourable/total but using wrong total (e.g. using 52 but excluding jokers which were already excluded). Always write final answer as fraction in simplest form.',
  ARRAY[
    '0 ≤ P(A) ≤ 1 always. Probability can never be negative or greater than 1.',
    'P(A) + P(A complement) = 1. Use this when direct calculation is complex.',
    'Sample space of two coins: {HH, HT, TH, TT} — 4 outcomes, not 3.',
    'Standard deck: 52 cards, 4 suits, 13 cards each. Face cards are J, Q, K only — 12 total.',
    'Ace is NOT a face card in Maharashtra SSC problems.',
    'For dice: outcomes 1 to 6. For two dice: 36 total outcomes (6×6 grid).',
    'Always express probability as fraction in lowest terms unless decimal is asked.'
  ],
  '2019-2024 pattern: One probability question appears almost every year. Common setups: playing cards (find probability of drawing specific cards), two dice (sum or difference conditions), coloured balls from a bag. Complement rule questions ("probability that event does NOT happen") are common. Sample space must be written for full marks.',
  '2 marks: find probability of one event with clear sample space. 3 marks: two-part probability problem using complement or combining events.'
FROM chapters c
JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%probability%' AND s.id = 'algebra'
ON CONFLICT (chapter_id) DO NOTHING;

-- ── GEOMETRY ──────────────────────────────────────────────────────────────────

-- 6. Similarity
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Similar figures", "definition": "Figures that have the same shape but not necessarily the same size. Corresponding angles are equal and corresponding sides are proportional."},
    {"term": "Similar triangles", "definition": "Two triangles where all corresponding angles are equal AND corresponding sides are in proportion. Written as △ABC ~ △DEF."},
    {"term": "AA test (Angle-Angle)", "definition": "If two angles of one triangle are equal to two angles of another triangle, the triangles are similar."},
    {"term": "SSS test (Side-Side-Side)", "definition": "If three sides of one triangle are proportional to three sides of another triangle, the triangles are similar."},
    {"term": "SAS test (Side-Angle-Side)", "definition": "If one angle of a triangle is equal to one angle of another and the sides including these angles are proportional, the triangles are similar."},
    {"term": "Basic Proportionality Theorem (BPT)", "definition": "If a line is drawn parallel to one side of a triangle, it divides the other two sides proportionally. Also called Thales theorem."},
    {"term": "Ratio of areas", "definition": "The ratio of areas of two similar triangles equals the square of the ratio of their corresponding sides."}
  ]'::jsonb,
  '[
    {"name": "BPT (Thales theorem)", "formula": "If DE || BC in △ABC then AD/DB = AE/EC", "when_to_use": "Any problem with a line parallel to a side of triangle dividing the other sides."},
    {"name": "Ratio of areas", "formula": "Area(△ABC) / Area(△DEF) = (AB/DE)² = (BC/EF)² = (CA/FD)²", "when_to_use": "When two triangles are similar and you need ratio of areas or a side given area ratio."},
    {"name": "Corresponding sides ratio", "formula": "AB/DE = BC/EF = CA/FD = perimeter(ABC)/perimeter(DEF)", "when_to_use": "To find unknown sides when triangles are proven similar."}
  ]'::jsonb,
  'Examiners award marks for: (1) correctly stating the similarity test used (write "By AA test, △ABC ~ △DEF"), (2) writing the correspondence of vertices in correct order — wrong order loses marks even if angles are correct, (3) showing proportion correctly when finding sides. For proof questions, state each reason (theorem name or given). BPT and its converse are frequently tested separately.',
  ARRAY[
    'Order of vertices matters in similarity: △ABC ~ △DEF means ∠A=∠D, ∠B=∠E, ∠C=∠F.',
    'BPT: line parallel to one side of triangle divides other two sides proportionally.',
    'Converse of BPT: if a line divides two sides of a triangle proportionally, it is parallel to the third side.',
    'Three similarity tests for triangles: AA, SAS, SSS.',
    'Ratio of areas of similar triangles = square of ratio of corresponding sides.',
    'All congruent triangles are similar, but not all similar triangles are congruent.',
    'If scale factor is k then ratio of perimeters is k and ratio of areas is k².'
  ],
  '2019-2024 pattern: BPT proof or application appears almost every year. Triangle similarity proof (prove △ABC ~ △DEF) is a very common 3-4 mark question. Finding sides or areas using similarity ratio is a standard 2-mark question. Converse of BPT appears occasionally.',
  '2 marks: find unknown side using similarity ratio. 3 marks: prove triangles similar and find a side. 4 marks: complete proof with BPT or similarity leading to area calculation.'
FROM chapters c
JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%similar%' AND s.id = 'geometry'
ON CONFLICT (chapter_id) DO NOTHING;

-- 7. Pythagoras Theorem
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Pythagoras theorem", "definition": "In a right-angled triangle, the square of the hypotenuse equals the sum of squares of the other two sides. (Hypotenuse)² = (Base)² + (Perpendicular)²."},
    {"term": "Hypotenuse", "definition": "The side opposite the right angle. Always the longest side of a right-angled triangle."},
    {"term": "Pythagorean triplet", "definition": "A set of three positive integers (a, b, c) satisfying a² + b² = c². Common triplets: (3,4,5), (5,12,13), (8,15,17), (7,24,25)."},
    {"term": "Converse of Pythagoras theorem", "definition": "If in a triangle, the square of one side equals the sum of squares of the other two sides, then the angle opposite the longest side is a right angle."},
    {"term": "Apollonius theorem", "definition": "In △ABC with median AD to side BC: AB² + AC² = 2(AD² + BD²). Relates median length to the sides of the triangle."}
  ]'::jsonb,
  '[
    {"name": "Pythagoras theorem", "formula": "AC² = AB² + BC² (where AC is hypotenuse)", "when_to_use": "Any right triangle problem to find third side. Also to verify right angle."},
    {"name": "Converse check", "formula": "If a² + b² = c² then angle opposite c is 90°", "when_to_use": "To prove a triangle is right-angled given three sides."},
    {"name": "Apollonius theorem", "formula": "AB² + AC² = 2(AD² + BD²) where AD is median", "when_to_use": "Problems involving medians. Find median length or side given median."},
    {"name": "Common triplets", "formula": "(3,4,5), (5,12,13), (8,15,17), (7,24,25), (9,40,41)", "when_to_use": "Quick check — if two sides are from a triplet, third side can be found without calculation."}
  ]'::jsonb,
  'For proof of Pythagoras theorem, Maharashtra SSC expects the proof using similar triangles (altitude on hypotenuse). Steps: draw altitude from right angle to hypotenuse, prove three triangles similar, write proportions, add to get result. Examiners check: correct diagram with altitude drawn, similar triangle correspondence written correctly, final step showing addition. Apollonius theorem proof is rarely asked for proof but the formula application is tested.',
  ARRAY[
    'Pythagoras theorem applies ONLY to right-angled triangles.',
    'Hypotenuse is always opposite the 90° angle and is the longest side.',
    'Common triplets to memorise: (3,4,5), (5,12,13), (8,15,17), (7,24,25).',
    'Converse: if (longest side)² = sum of squares of other two sides, triangle is right-angled.',
    'Apollonius theorem: AB² + AC² = 2(AD² + BD²) where AD is the median to BC.',
    'For any triangle: if c² > a² + b² it is obtuse; if c² < a² + b² it is acute.',
    'The altitude from the right angle to the hypotenuse creates two triangles each similar to the original.'
  ],
  '2019-2024 pattern: Proof of Pythagoras theorem using similar triangles appears approximately every other year as a 4-mark question. Application (find unknown side) is a reliable 2-mark question every year. Apollonius theorem application (find median) appears as 2-3 mark question. Pythagorean triplets appear in 1-mark questions.',
  '1 mark: identify Pythagorean triplet or apply theorem for direct calculation. 2 marks: find unknown side or verify right angle. 4 marks: complete proof of Pythagoras theorem.'
FROM chapters c
JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%pythagoras%' AND s.id = 'geometry'
ON CONFLICT (chapter_id) DO NOTHING;

-- 8. Circle (Geometry)
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Chord", "definition": "A line segment joining any two points on a circle. The diameter is the longest chord passing through the centre."},
    {"term": "Tangent", "definition": "A line that touches the circle at exactly one point called the point of tangency. A tangent is perpendicular to the radius at the point of contact."},
    {"term": "Secant", "definition": "A line that intersects a circle at two distinct points."},
    {"term": "Inscribed angle", "definition": "An angle formed by two chords meeting at a point on the circle. Inscribed angle = half the central angle subtending the same arc."},
    {"term": "Cyclic quadrilateral", "definition": "A quadrilateral whose all four vertices lie on a circle. Opposite angles of a cyclic quadrilateral are supplementary (sum to 180°)."},
    {"term": "Tangent from external point", "definition": "From an external point, two tangents to a circle are always equal in length."},
    {"term": "Angle in semicircle", "definition": "The angle inscribed in a semicircle is always 90°. (Angle in a semicircle theorem / Thales theorem for circles.)"}
  ]'::jsonb,
  '[
    {"name": "Tangent-radius perpendicularity", "formula": "Tangent ⊥ Radius at point of contact (angle = 90°)", "when_to_use": "Any tangent problem. This is the starting point for most tangent proofs."},
    {"name": "Tangents from external point", "formula": "PA = PB where P is external point and A, B are points of tangency", "when_to_use": "When two tangents are drawn from an external point — they are equal."},
    {"name": "Angle in semicircle", "formula": "Angle in semicircle = 90°", "when_to_use": "When diameter is given and angle is inscribed in the semicircle."},
    {"name": "Inscribed angle theorem", "formula": "Inscribed angle = (1/2) × Central angle (subtending same arc)", "when_to_use": "To find inscribed angles or central angles."},
    {"name": "Cyclic quadrilateral", "formula": "Opposite angles sum = 180°: ∠A + ∠C = 180° and ∠B + ∠D = 180°", "when_to_use": "Any quadrilateral inscribed in a circle."},
    {"name": "Tangent-secant from external point", "formula": "PA² = PB × PC where PA is tangent, PBC is secant", "when_to_use": "When both tangent and secant are drawn from same external point."}
  ]'::jsonb,
  'Circle theorems require both the statement and proof for 4-mark questions. The most frequently proved theorems are: (1) Tangent is perpendicular to radius — proof using contradiction, (2) Tangents from external point are equal — proof using congruent triangles. For angle problems, always mark the diagram with given information before attempting. Cyclic quadrilateral problems: remember opposite angles sum to 180°, use this as equation.',
  ARRAY[
    'Tangent is perpendicular to radius at point of contact — this is the foundation of all tangent problems.',
    'Two tangents from an external point are equal in length.',
    'Angle in a semicircle is always 90° (Thales theorem).',
    'Inscribed angle = half the central angle on the same arc.',
    'Opposite angles of cyclic quadrilateral are supplementary (sum = 180°).',
    'Tangent from external point P: PA² = PB × PC (tangent-secant relationship).',
    'All radii of a circle are equal — use this frequently in proofs.'
  ],
  '2019-2024 pattern: Tangent from external point (prove equal OR find length) appears almost every year. Angle in semicircle or inscribed angle theorem question appears very frequently. Cyclic quadrilateral angle problem appears regularly. Tangent-secant relation (PA² = PB×PC) appears as numerical problem.',
  '2 marks: find angle using circle theorem, or find tangent length. 3 marks: prove property and apply. 4 marks: complete proof of tangent theorem with application.'
FROM chapters c
JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%circle%' AND s.id = 'geometry'
ON CONFLICT (chapter_id) DO NOTHING;

-- 9. Geometric Constructions
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Construction", "definition": "Drawing geometric figures using only compass and straightedge (ruler for drawing lines only, not measuring). All construction marks must be visible."},
    {"term": "Division of line segment", "definition": "Dividing a line segment AB in a given ratio m:n using construction. Uses the concept of BPT."},
    {"term": "Similar triangle construction", "definition": "Constructing a triangle similar to a given triangle with a given scale factor using division of sides."},
    {"term": "Tangent from external point", "definition": "Constructing tangent(s) from an external point to a circle using the property that angle in semicircle is 90°."},
    {"term": "Scale factor", "definition": "The ratio by which the new triangle is smaller or larger than the original. Scale factor 3/4 means new triangle is 3/4 of original."}
  ]'::jsonb,
  '[]'::jsonb,
  'Construction questions carry guaranteed marks if steps are followed precisely. Examiners check: (1) all arcs and construction lines are visible — do NOT erase them, (2) the construction steps are written alongside the figure, (3) the final figure is labelled. Common mistake: erasing construction marks thinking they make the figure look messy. The construction marks ARE the answer. For tangent construction: draw circle, mark external point, find midpoint of segment from centre to external point, draw semicircle — where it intersects original circle are tangent points.',
  ARRAY[
    'Never erase construction arcs — they carry marks.',
    'Label all points as instructed: if question says construct △A''B''C'', label exactly that.',
    'Division of segment in ratio m:n: draw ray at acute angle, mark m+n equal parts, join last to B, draw parallel through mth point.',
    'Similar triangle with scale factor p/q: divide base in ratio p:q (or extend to p parts if p>q), draw parallel to third side.',
    'Tangent from external point: join centre O to external point P, find midpoint M of OP, draw circle with radius MP, intersections with original circle are tangent points.',
    'Two tangents from external point are always equal in length — verify this in your construction.'
  ],
  '2019-2024 pattern: Construction question appears every year as 3-4 mark question. Most common: (1) construct tangent from external point to circle, (2) divide line segment in given ratio, (3) construct similar triangle with given scale factor. Students who follow steps precisely get full marks reliably.',
  '3-4 marks: complete construction with all steps visible and figure labelled. No partial credit formula — either steps are visible or not.'
FROM chapters c
JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%construct%' AND s.id = 'geometry'
ON CONFLICT (chapter_id) DO NOTHING;

-- 10. Trigonometry
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Trigonometric ratios", "definition": "Six ratios defined for an acute angle in a right triangle: sin, cos, tan, cosec, sec, cot. Each is a ratio of two sides of the right triangle."},
    {"term": "Angle of elevation", "definition": "The angle measured upward from the horizontal line of sight to an object above. Used in height-and-distance problems."},
    {"term": "Angle of depression", "definition": "The angle measured downward from the horizontal line of sight to an object below. Equal to the angle of elevation from the lower object (alternate interior angles)."},
    {"term": "Trigonometric identity", "definition": "An equation involving trigonometric ratios that is true for all values of the angle. The three fundamental identities must be memorised."},
    {"term": "Complementary angles", "definition": "Two angles that sum to 90°. sin(θ) = cos(90°-θ), tan(θ) = cot(90°-θ), sec(θ) = cosec(90°-θ)."}
  ]'::jsonb,
  '[
    {"name": "Basic trig ratios", "formula": "sinθ = opp/hyp | cosθ = adj/hyp | tanθ = opp/adj | cosecθ = hyp/opp | secθ = hyp/adj | cotθ = adj/opp", "when_to_use": "All right-triangle problems. SOHCAHTOA to remember first three."},
    {"name": "Pythagorean identities", "formula": "sin²θ + cos²θ = 1 | 1 + tan²θ = sec²θ | 1 + cot²θ = cosec²θ", "when_to_use": "Proving trigonometric identities. Choose identity based on which ratios appear in the question."},
    {"name": "Standard angle table", "formula": "sin30=1/2, sin45=1/√2, sin60=√3/2, sin90=1 | cos30=√3/2, cos45=1/√2, cos60=1/2, cos90=0 | tan30=1/√3, tan45=1, tan60=√3", "when_to_use": "Height-distance problems always use these. Memorise completely."},
    {"name": "Complementary angle relations", "formula": "sin(90-θ)=cosθ | cos(90-θ)=sinθ | tan(90-θ)=cotθ | sec(90-θ)=cosecθ", "when_to_use": "Simplifying expressions with angles that sum to 90°."},
    {"name": "Height-distance formula", "formula": "tan(angle of elevation) = height / horizontal distance", "when_to_use": "All height-distance problems. Draw diagram first."}
  ]'::jsonb,
  'For identity proofs: always start with the more complex side and simplify to reach the simpler side. Write LHS and RHS separately, work on one side only. Do not cross-multiply in identity proofs. For height-distance problems: always draw a diagram, label all given information, identify which trig ratio links the angle to the known and unknown quantities. Examiners check: correct diagram (2 marks), correct equation setup (1 mark), correct arithmetic (1 mark).',
  ARRAY[
    'SOHCAHTOA: Sin=Opp/Hyp, Cos=Adj/Hyp, Tan=Opp/Adj.',
    'Three Pythagorean identities: sin²+cos²=1, 1+tan²=sec², 1+cot²=cosec².',
    'Standard values table must be memorised completely for 0°,30°,45°,60°,90°.',
    'Angle of elevation and angle of depression are equal (alternate interior angles with parallel horizontal lines).',
    'In height-distance problems: tan(angle) = opposite/adjacent = height/distance.',
    'For identity proofs: work on ONE side only, do not move terms across the equals sign.',
    'sin(90-θ) = cosθ and cos(90-θ) = sinθ — these are used in every other exam paper.'
  ],
  '2019-2024 pattern: Trigonometric identity proof appears every year as 3-4 mark question. Height-distance problem (find height of tower, width of river etc) appears almost every year as 3-4 mark question. Standard angle value substitution appears as 1-2 mark question. Complementary angle simplification appears regularly.',
  '1 mark: find value using standard angles. 2 marks: find unknown side using trig ratio. 3-4 marks: prove trigonometric identity OR solve height-distance problem with diagram.'
FROM chapters c
JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%trigonometry%' OR c.name ILIKE '%trigonometric%' AND s.id = 'geometry'
ON CONFLICT (chapter_id) DO NOTHING;

-- 11. Coordinate Geometry
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Coordinate plane", "definition": "A plane formed by two perpendicular number lines (axes). The horizontal axis is the x-axis and vertical is the y-axis. They intersect at the origin (0,0)."},
    {"term": "Distance formula", "definition": "The distance between two points P(x1,y1) and Q(x2,y2) is √[(x2-x1)² + (y2-y1)²]. Derived from Pythagoras theorem."},
    {"term": "Section formula", "definition": "The coordinates of point P dividing AB in ratio m:n internally are [(mx2+nx1)/(m+n), (my2+ny1)/(m+n)]."},
    {"term": "Midpoint formula", "definition": "Midpoint of segment joining (x1,y1) and (x2,y2) is [(x1+x2)/2, (y1+y2)/2]. Special case of section formula with m=n=1."},
    {"term": "Slope (gradient)", "definition": "The measure of steepness of a line. m = (y2-y1)/(x2-x1). Positive slope: line rises left to right. Negative slope: line falls left to right."},
    {"term": "Collinear points", "definition": "Three or more points lying on the same straight line. Test: area of triangle formed = 0, OR slopes between pairs of points are equal."}
  ]'::jsonb,
  '[
    {"name": "Distance formula", "formula": "PQ = √[(x2-x1)² + (y2-y1)²]", "when_to_use": "Find distance between two points, prove triangle type, verify shape of quadrilateral."},
    {"name": "Section formula (internal)", "formula": "P = [(mx2+nx1)/(m+n), (my2+ny1)/(m+n)]", "when_to_use": "Find point dividing a segment in given ratio. Midpoint is ratio 1:1."},
    {"name": "Midpoint formula", "formula": "M = [(x1+x2)/2, (y1+y2)/2]", "when_to_use": "Find midpoint of a segment or find unknown endpoint given midpoint."},
    {"name": "Slope formula", "formula": "m = (y2-y1)/(x2-x1)", "when_to_use": "Find slope, check if lines are parallel (equal slopes) or perpendicular (product of slopes = -1)."},
    {"name": "Area of triangle", "formula": "Area = (1/2)|x1(y2-y3) + x2(y3-y1) + x3(y1-y2)|", "when_to_use": "Find area of triangle with vertices, or check collinearity (area=0 means collinear)."}
  ]'::jsonb,
  'Distance formula and section formula are the most tested in Maharashtra SSC. Common mistakes: (1) forgetting the square root in distance formula, (2) mixing up which ratio value multiplies which coordinate in section formula — m multiplies the second point (x2,y2). For collinearity questions: use area method (area=0) rather than slope method as it is less prone to errors. Always simplify the final coordinates to lowest form.',
  ARRAY[
    'Distance formula: PQ = √[(x2-x1)² + (y2-y1)²]. Never forget the square root.',
    'Section formula: P divides AB in m:n internally means P = ((mx2+nx1)/(m+n), (my2+ny1)/(m+n)).',
    'Midpoint: ratio 1:1 special case. M = ((x1+x2)/2, (y1+y2)/2).',
    'Slope m = (y2-y1)/(x2-x1). Parallel lines: equal slopes. Perpendicular: m1×m2 = -1.',
    'To prove triangle type: equilateral (all sides equal), isosceles (two sides equal), right-angled (Pythagoras check).',
    'Collinear points: area of triangle = 0.',
    'Centroid of triangle: G = ((x1+x2+x3)/3, (y1+y2+y3)/3).'
  ],
  '2019-2024 pattern: Distance formula application (prove triangle is equilateral/isosceles/right-angled) appears almost every year as 3-4 mark question. Section formula to find dividing point appears frequently as 2-3 mark question. Midpoint and collinearity questions appear as 1-2 mark questions. Area of triangle formula is used in collinearity problems.',
  '1 mark: find midpoint or apply distance formula for simple case. 2 marks: find dividing point using section formula. 3-4 marks: prove triangle type using distance formula with multiple calculations.'
FROM chapters c
JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%coordinate%' AND s.id = 'geometry'
ON CONFLICT (chapter_id) DO NOTHING;

-- 12. Mensuration (Surface Area and Volume)
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Frustum", "definition": "The portion of a cone remaining after cutting off the top with a plane parallel to the base. Has two circular faces of different radii."},
    {"term": "Slant height", "definition": "The distance measured along the lateral surface from apex to base edge of cone or pyramid. For frustum: l = √[h² + (R-r)²]."},
    {"term": "Surface area", "definition": "Total area of all surfaces of a solid. Can be lateral (curved) surface area + base area(s)."},
    {"term": "Volume", "definition": "The amount of space occupied by a solid. Measured in cubic units."},
    {"term": "Combination of solids", "definition": "Many real objects are combinations of basic solids (cone on cylinder, hemisphere on cylinder). Find surface area and volume by adding/subtracting components."}
  ]'::jsonb,
  '[
    {"name": "Cylinder", "formula": "CSA = 2πrh | TSA = 2πr(r+h) | Volume = πr²h", "when_to_use": "Pipes, tanks, rollers, coins."},
    {"name": "Cone", "formula": "CSA = πrl | TSA = πr(r+l) | Volume = (1/3)πr²h | Slant height l = √(r²+h²)", "when_to_use": "Ice cream cones, funnels, mountain shapes."},
    {"name": "Sphere", "formula": "SA = 4πr² | Volume = (4/3)πr³", "when_to_use": "Balls, globes, bubbles."},
    {"name": "Hemisphere", "formula": "CSA = 2πr² | TSA = 3πr² | Volume = (2/3)πr³", "when_to_use": "Half-sphere shapes, bowls."},
    {"name": "Frustum", "formula": "CSA = π(R+r)l | TSA = π(R+r)l + πR² + πr² | Volume = (πh/3)(R²+r²+Rr) | l = √[h²+(R-r)²]", "when_to_use": "Bucket, tumbler, lampshade shapes — two different radii top and bottom."},
    {"name": "Cuboid", "formula": "TSA = 2(lb+bh+lh) | Volume = l×b×h | Diagonal = √(l²+b²+h²)", "when_to_use": "Boxes, rooms, bricks."},
    {"name": "Cube", "formula": "TSA = 6a² | Volume = a³ | Diagonal = a√3", "when_to_use": "Dice, sugar cubes."}
  ]'::jsonb,
  'Mensuration requires knowing ALL formulas — there are no shortcuts. Write the formula first, then substitute. Keep π = 22/7 unless told to use 3.14. For combination problems: identify which surfaces are exposed (the joined surfaces are internal and NOT counted). Common mistake in frustum: students confuse slant height l with vertical height h. Always calculate l = √[h²+(R-r)²] separately before substituting into surface area formula.',
  ARRAY[
    'Frustum slant height: l = √[h² + (R-r)²] where R is larger radius, r is smaller radius, h is vertical height.',
    'For combination solids: only external surfaces contribute to surface area — internal joined area is excluded.',
    'Cone volume = (1/3) × cylinder volume with same base and height.',
    'Sphere SA = 4πr², Volume = (4/3)πr³. Hemisphere SA = 3πr² (curved 2πr² + base πr²).',
    'Use π = 22/7 unless specified otherwise in the question.',
    'Volume of material = Volume of outer solid - Volume of inner solid (for hollow objects).',
    'When a solid is melted and recast: volume stays constant. Set volumes equal to find dimensions.'
  ],
  '2019-2024 pattern: Frustum problem (find CSA or volume) appears almost every year as 4-mark question. Combination of solids (cone on cylinder, hemisphere on cylinder) appears frequently. Melting-and-recasting problems appear as 3-4 mark questions. Simple mensuration (cylinder, cone, sphere individually) appears as 2-mark questions.',
  '2 marks: find surface area or volume of single solid. 3-4 marks: frustum calculation, combination solid, or melting-recasting problem.'
FROM chapters c
JOIN subjects s ON c.subject_id = s.id
WHERE (c.name ILIKE '%mensuration%' OR c.name ILIKE '%surface%' OR c.name ILIKE '%volume%') AND s.id = 'geometry'
ON CONFLICT (chapter_id) DO NOTHING;

-- 13. Statistics
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Mean (average)", "definition": "Sum of all observations divided by the number of observations. For grouped data, use assumed mean method or direct method."},
    {"term": "Median", "definition": "The middle value when data is arranged in order. For grouped data, use the median formula with cumulative frequency."},
    {"term": "Mode", "definition": "The value that occurs most frequently. For grouped data, the modal class has the highest frequency."},
    {"term": "Class interval", "definition": "The range of values in each group of a frequency distribution. Class width = upper limit - lower limit."},
    {"term": "Cumulative frequency", "definition": "Running total of frequencies. Used to find median and draw ogive."},
    {"term": "Ogive", "definition": "A cumulative frequency curve. Less-than ogive is plotted with upper class limits. The median can be read from the ogive."},
    {"term": "Histogram", "definition": "A bar graph where bars are drawn for each class interval with height equal to frequency. No gaps between bars."}
  ]'::jsonb,
  '[
    {"name": "Mean (direct method)", "formula": "x̄ = Σfx / Σf", "when_to_use": "When class midpoints and frequencies are given and numbers are manageable."},
    {"name": "Mean (assumed mean method)", "formula": "x̄ = A + (Σfd/Σf) where d = x - A (A is assumed mean)", "when_to_use": "When direct method involves large numbers. Choose A as midpoint of middle class."},
    {"name": "Median (grouped)", "formula": "Median = L + [(n/2 - cf)/f] × h where L=lower limit of median class, cf=cumulative frequency before median class, f=frequency of median class, h=class width", "when_to_use": "Finding median of grouped frequency distribution."},
    {"name": "Mode (grouped)", "formula": "Mode = L + [(f1-f0)/(2f1-f0-f2)] × h where f1=frequency of modal class, f0=frequency of class before, f2=frequency of class after", "when_to_use": "Finding mode of grouped frequency distribution."},
    {"name": "Empirical relationship", "formula": "Mode = 3 × Median - 2 × Mean", "when_to_use": "To find one measure given the other two. Quick check/verification."}
  ]'::jsonb,
  'Statistics problems require showing the frequency distribution table with all columns completed. For mean: write the table with columns x (midpoint), f (frequency), fx (or d and fd for assumed mean). For median: add cumulative frequency column. Examiners check: correct identification of median class (n/2 falls in which class), correct cf value (cumulative frequency BEFORE the median class, not including it), correct substitution of L (lower class boundary, not upper). A very common error is taking L as the lower limit of the wrong class.',
  ARRAY[
    'Mean: sum of (frequency × midpoint) divided by total frequency.',
    'Assumed mean method: d = x - A, mean = A + Σfd/Σf. Choose A as midpoint of middle class.',
    'Median class: the class where cumulative frequency first exceeds n/2.',
    'In median formula, cf is cumulative frequency of ALL classes BEFORE the median class.',
    'Modal class: class with highest frequency. f0 is class before, f2 is class after modal class.',
    'Empirical relation: Mode = 3 Median - 2 Mean (use when one measure is missing).',
    'Ogive: plot cumulative frequency against upper class limits. Median is at n/2 on y-axis.'
  ],
  '2019-2024 pattern: Mean calculation (usually assumed mean method) appears almost every year as 3-4 mark question. Median calculation with frequency table appears very frequently. Mode calculation appears as 2-3 mark question. Ogive drawing or reading appears occasionally. Empirical relationship problem appears as 2-mark question.',
  '2 marks: find mode using formula, or use empirical relationship. 3-4 marks: complete frequency table and calculate mean using assumed mean method, OR find median with complete cumulative frequency table.'
FROM chapters c
JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%statistic%' AND s.id = 'geometry'
ON CONFLICT (chapter_id) DO NOTHING;

-- ============================================================================
-- END OF DAY 12 SEED DATA
-- Run in Supabase SQL Editor. Safe to re-run (ON CONFLICT DO NOTHING).
-- ============================================================================

-- ============================================================================
-- DAY 13: Update subjects total_chapters to correct values
-- ============================================================================
UPDATE subjects SET total_chapters = 10 WHERE id = 'science1';
UPDATE subjects SET total_chapters = 10 WHERE id = 'science2';

-- ============================================================================
-- SEED: Maharashtra SSC Class 10 Science Part 1 — chapter_content (DAY 13)
-- Correct 10 chapters per official Maharashtra SSC syllabus
-- ============================================================================

-- 1. Gravitation
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Gravitation", "definition": "The force of attraction between any two objects in the universe due to their masses. Every object with mass attracts every other object with mass."},
    {"term": "Universal Law of Gravitation", "definition": "Every particle in the universe attracts every other particle with a force directly proportional to the product of their masses and inversely proportional to the square of the distance between them."},
    {"term": "Gravitational constant G", "definition": "G = 6.673 × 10⁻¹¹ N m² kg⁻². A universal constant — same everywhere in the universe."},
    {"term": "Acceleration due to gravity (g)", "definition": "The acceleration produced in a freely falling body due to Earth''s gravitational force. g = 9.8 m/s² at Earth''s surface."},
    {"term": "Free fall", "definition": "Motion of an object under the influence of gravity alone, with no other force acting. Air resistance is neglected."},
    {"term": "Weight", "definition": "The gravitational force exerted on an object by the Earth. W = mg. Weight varies with location; mass does not."},
    {"term": "Escape velocity", "definition": "The minimum velocity required for an object to escape Earth''s gravitational field permanently. ve = √(2gR) = 11.2 km/s for Earth."}
  ]'::jsonb,
  '[
    {"name": "Universal Law of Gravitation", "formula": "F = G × M × m / r²", "when_to_use": "Find gravitational force between two masses. Identify M, m, r carefully from problem."},
    {"name": "Acceleration due to gravity", "formula": "g = GM/R² | g = 9.8 m/s² (standard)", "when_to_use": "All free fall problems and weight calculations."},
    {"name": "Weight", "formula": "W = mg", "when_to_use": "Convert between mass (kg) and weight (N)."},
    {"name": "Equations of motion under gravity", "formula": "v = u + gt | s = ut + ½gt² | v² = u² + 2gs", "when_to_use": "Free fall problems. u=0 for objects dropped from rest."},
    {"name": "Escape velocity", "formula": "ve = √(2gR) = √(2GM/R)", "when_to_use": "Definition questions and derivation."}
  ]'::jsonb,
  'Maharashtra SSC examiners test: (1) Statement of Universal Law — must use words ''directly proportional to product of masses'' and ''inversely proportional to square of distance''. (2) Numericals using F = GMm/r². (3) Difference between g and G — classic 2-mark question. Common mistake: using r as diameter instead of radius. For free fall: u = 0 for objects dropped from rest.',
  ARRAY[
    'G = 6.673 × 10⁻¹¹ N m² kg⁻² — universal constant, same everywhere.',
    'g = 9.8 m/s² at Earth surface. g varies with altitude and latitude; G does not.',
    'Weight W = mg. Weight is a force (Newtons); mass is a scalar (kg).',
    'Free fall: object falls under gravity alone. Take u = 0 if dropped from rest.',
    'g on Moon = g(Earth)/6 ≈ 1.63 m/s². Weight on Moon = Weight on Earth / 6.',
    'Escape velocity for Earth = 11.2 km/s.',
    'Gravitational force is always attractive, never repulsive.'
  ],
  '2019-2024 pattern: Statement of Universal Law appears as 2-mark question almost every year. Numerical using F=GMm/r² appears regularly. Difference between G and g appears frequently. Escape velocity derivation appears in alternate years as 3-mark question.',
  '1 mark: state value of G or g. 2 marks: state Universal Law OR distinguish G and g. 3 marks: numerical using gravitation formula. 4-5 marks: derivation of escape velocity.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%gravitation%' AND s.id = 'science1'
ON CONFLICT (chapter_id) DO NOTHING;

-- 2. Periodic Classification of Elements
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Modern Periodic Law", "definition": "Properties of elements are a periodic function of their atomic numbers. (Mendeleev used atomic mass; modern law uses atomic number.)"},
    {"term": "Period", "definition": "A horizontal row in the periodic table. Elements in a period have the same number of electron shells. There are 7 periods."},
    {"term": "Group", "definition": "A vertical column in the periodic table. Elements in a group have the same number of valence electrons. There are 18 groups."},
    {"term": "Atomic radius", "definition": "Half the distance between nuclei of two bonded atoms of the same element. Decreases across a period (left to right), increases down a group."},
    {"term": "Ionisation energy", "definition": "Energy required to remove the outermost electron from a neutral gaseous atom. Increases across a period, decreases down a group."},
    {"term": "Electronegativity", "definition": "Tendency of an atom to attract electrons towards itself in a chemical bond. Increases across a period, decreases down a group."}
  ]'::jsonb,
  '[
    {"name": "Period number", "formula": "Period number = number of electron shells in the atom", "when_to_use": "To find period from electronic configuration."},
    {"name": "Group number", "formula": "Group number = number of valence electrons (for s and p block)", "when_to_use": "To find group from electronic configuration."},
    {"name": "Trends across period (L to R)", "formula": "Atomic radius ↓ | Ionisation energy ↑ | Electronegativity ↑ | Metallic character ↓", "when_to_use": "Any trend question across a period."},
    {"name": "Trends down group (top to bottom)", "formula": "Atomic radius ↑ | Ionisation energy ↓ | Electronegativity ↓ | Metallic character ↑", "when_to_use": "Any trend question down a group."}
  ]'::jsonb,
  'Examiners test trends heavily. Students must know trends for atomic radius, ionisation energy, electronegativity, metallic character — all four properties, both across period and down group. Mendeleev vs Modern periodic law comparison and electronic configuration → find period and group are regular questions.',
  ARRAY[
    'Modern Periodic Law: properties are periodic function of ATOMIC NUMBER (not atomic mass).',
    'Period = number of shells. Group = number of valence electrons (main group).',
    'Across a period (left to right): atomic radius decreases, ionisation energy increases.',
    'Down a group (top to bottom): atomic radius increases, ionisation energy decreases.',
    'Alkali metals (Group 1): most reactive metals. Halogens (Group 17): most reactive nonmetals.',
    'Noble gases (Group 18): inert, complete outermost shell.',
    'Metallic character increases down a group and decreases across a period.'
  ],
  '2019-2024 pattern: Periodic trends appear almost every year as 2-3 mark question. Mendeleev vs Modern periodic law comparison appears regularly. Electronic configuration to find period/group appears as 1-2 mark question.',
  '1 mark: state Modern Periodic Law. 2 marks: periodic trends table OR compare Mendeleev and modern. 3 marks: explain trends with reasons.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%periodic%' AND s.id = 'science1'
ON CONFLICT (chapter_id) DO NOTHING;

-- 3. Chemical Reactions and Equations
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Combination reaction", "definition": "Two or more substances combine to form a single product. A + B → AB. Example: 2H₂ + O₂ → 2H₂O."},
    {"term": "Decomposition reaction", "definition": "A single compound breaks down into two or more simpler substances. AB → A + B. Example: 2HgO → 2Hg + O₂."},
    {"term": "Displacement reaction", "definition": "A more reactive element displaces a less reactive element from its compound. A + BC → AC + B."},
    {"term": "Double displacement reaction", "definition": "Two compounds exchange their ions to form two new compounds. AB + CD → AD + CB. Often forms precipitate."},
    {"term": "Oxidation and reduction", "definition": "Oxidation: loss of electrons or gain of oxygen. Reduction: gain of electrons or loss of oxygen. Both occur simultaneously (redox reaction)."},
    {"term": "Exothermic reaction", "definition": "Reaction that releases energy (heat) to surroundings. Example: combustion, respiration."},
    {"term": "Endothermic reaction", "definition": "Reaction that absorbs energy from surroundings. Example: photosynthesis, decomposition of CaCO₃."}
  ]'::jsonb,
  '[
    {"name": "Balancing equations", "formula": "Reactants atoms = Products atoms (for each element)", "when_to_use": "All chemical equation questions. Balance by inspection."},
    {"name": "Reactivity series", "formula": "K > Na > Ca > Mg > Al > Zn > Fe > Ni > Sn > Pb > H > Cu > Hg > Ag > Au", "when_to_use": "Displacement reactions — metal higher in series displaces lower metal."}
  ]'::jsonb,
  'Always balance the equation before answering. Examiners check: (1) correct formulae, (2) balanced coefficients, (3) state symbols: (s) solid, (l) liquid, (g) gas, (aq) aqueous — include for full marks in 3+ mark questions. For reaction type: ''combining'' = combination, ''breaks down'' = decomposition, ''precipitate forms'' = double displacement.',
  ARRAY[
    'Law of Conservation of Mass: total mass of reactants = total mass of products.',
    'Types: Combination, Decomposition, Displacement, Double Displacement, Redox.',
    'Exothermic reactions release heat (combustion, neutralisation, respiration).',
    'Endothermic reactions absorb heat (photosynthesis, decomposition of CaCO₃).',
    'OIL RIG: Oxidation Is Loss (of electrons), Reduction Is Gain (of electrons).',
    'Reactivity series: metals higher in series displace those lower from salt solutions.',
    'Corrosion (rusting): Fe + H₂O + O₂ → Fe₂O₃. Rancidity: oxidation of fats.'
  ],
  '2019-2024 pattern: Balance a chemical equation appears as 2-mark question frequently. Identify type of reaction from equation appears regularly. Exothermic vs endothermic with examples is a common 2-mark question.',
  '1 mark: identify type of reaction. 2 marks: balance equation OR state exothermic/endothermic with example. 3 marks: write and balance equation with state symbols.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%chemical reaction%' AND s.id = 'science1'
ON CONFLICT (chapter_id) DO NOTHING;

-- 4. Effects of Electric Current
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Ohm''s Law", "definition": "The current through a conductor is directly proportional to the potential difference across it at constant temperature. V = IR."},
    {"term": "Resistance (R)", "definition": "Opposition offered by a conductor to the flow of electric current. SI unit is Ohm (Ω)."},
    {"term": "Resistivity", "definition": "A property of the material of a conductor. R = ρL/A. Unit: Ω·m."},
    {"term": "Series connection", "definition": "Resistors connected end-to-end. Same current through all. Rs = R1 + R2 + R3."},
    {"term": "Parallel connection", "definition": "Resistors connected between same two points. Same voltage across all. 1/Rp = 1/R1 + 1/R2 + 1/R3."},
    {"term": "Electric power", "definition": "Rate of consumption of electrical energy. P = VI = I²R = V²/R. Unit: Watt (W)."},
    {"term": "Electric energy", "definition": "E = Pt. Commercial unit: kilowatt-hour (kWh). 1 kWh = 3.6 × 10⁶ J."},
    {"term": "Heating effect (Joule''s law)", "definition": "Heat produced H = I²Rt. Basis of electric heater, iron, fuse."}
  ]'::jsonb,
  '[
    {"name": "Ohm''s Law", "formula": "V = IR | I = V/R | R = V/I", "when_to_use": "Most circuit problems. Identify two known quantities and find the third."},
    {"name": "Series resistance", "formula": "Rs = R1 + R2 + R3 + ...", "when_to_use": "Total resistance in series. Current same; voltages add."},
    {"name": "Parallel resistance", "formula": "1/Rp = 1/R1 + 1/R2 + 1/R3", "when_to_use": "Total resistance in parallel. Voltage same; currents add."},
    {"name": "Electric power", "formula": "P = VI = I²R = V²/R", "when_to_use": "Find power consumed by device."},
    {"name": "Electric energy", "formula": "E = Pt = VIt | 1 kWh = 3.6 × 10⁶ J", "when_to_use": "Electricity bill problems."},
    {"name": "Resistivity", "formula": "R = ρL/A", "when_to_use": "Effect of length, area, material on resistance."},
    {"name": "Joule''s heating law", "formula": "H = I²Rt", "when_to_use": "Heat produced in a conductor."}
  ]'::jsonb,
  'Highest numerical density chapter in Science Part 1. Every numerical must show: Given data with units, formula, substitution, and final answer with unit. Common mistakes: (1) wrong power formula, (2) not converting kWh to Joules, (3) adding parallel resistances directly instead of reciprocals.',
  ARRAY[
    'Ohm''s Law: V = IR. Valid only at constant temperature.',
    'Series: same current (I), voltage divides. Rs = R1+R2+...',
    'Parallel: same voltage (V), current divides. 1/Rp = 1/R1+1/R2+...',
    'Electric power P = VI = I²R = V²/R. Unit: Watt (W).',
    'Electric energy E = Pt. 1 kWh = 3.6 × 10⁶ J (used in electricity bills).',
    'Heating effect: H = I²Rt. Basis of electric heater, iron, fuse wire.',
    'Nichrome has high resistivity → used in heaters.'
  ],
  '2019-2024 pattern: Ohm''s Law numerical appears every year. Series-parallel combination is a very reliable 4-mark numerical. Power and energy calculation appears as 3-4 mark question. Joule''s heating law numerical appears regularly.',
  '1 mark: state Ohm''s Law. 2 marks: simple V=IR numerical OR series/parallel formula. 4-5 marks: series-parallel circuit OR energy/cost calculation.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%electric current%' AND s.id = 'science1'
ON CONFLICT (chapter_id) DO NOTHING;

-- 5. Heat
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Specific heat capacity", "definition": "Amount of heat required to raise the temperature of 1 kg of a substance by 1°C. Unit: J kg⁻¹ K⁻¹. Water: 4200 J kg⁻¹ K⁻¹."},
    {"term": "Latent heat", "definition": "Heat absorbed or released during a change of state at constant temperature. Latent heat of fusion: solid to liquid. Latent heat of vaporisation: liquid to gas."},
    {"term": "Calorimetry", "definition": "Method of measuring heat exchange. Heat lost by hot body = heat gained by cold body."},
    {"term": "Conduction", "definition": "Heat transfer through a solid medium, particle to particle, without bulk movement of matter."},
    {"term": "Convection", "definition": "Heat transfer through fluids (liquid or gas) by bulk movement of the fluid."},
    {"term": "Radiation", "definition": "Heat transfer without any medium through electromagnetic waves. Example: heat from the Sun reaching Earth."}
  ]'::jsonb,
  '[
    {"name": "Heat gained/lost", "formula": "Q = mcΔT (m=mass, c=specific heat, ΔT=temp change)", "when_to_use": "Any calorimetry problem."},
    {"name": "Latent heat", "formula": "Q = mL (L = latent heat in J/kg)", "when_to_use": "Change of state problems."},
    {"name": "Calorimetry principle", "formula": "m₁c₁(T₁-T) = m₂c₂(T-T₂)", "when_to_use": "Mixing hot and cold substances to find final temperature."},
    {"name": "Temperature conversion", "formula": "K = °C + 273 | °F = (9/5 × °C) + 32", "when_to_use": "Unit conversion in problems."}
  ]'::jsonb,
  'Calorimetry numericals: identify which body loses heat and which gains. Write heat lost = heat gained, substitute Q=mcΔT, solve. Common mistake: ΔT sign error for hot body. Latent heat: temperature stays CONSTANT during state change. Sea breeze (day: sea to land) and land breeze (night: land to sea) are convection examples — appear as 2-mark questions.',
  ARRAY[
    'Q = mcΔT. Specific heat of water = 4200 J/kg/K (highest among common substances).',
    'Latent heat: Q = mL. Temperature does not change during state change.',
    'Latent heat of fusion of ice = 336,000 J/kg. Vaporisation of water = 2,260,000 J/kg.',
    'Heat transfer: Conduction (solids), Convection (fluids), Radiation (no medium needed).',
    'Sea breeze: sea to land (day). Land breeze: land to sea (night). Both due to convection.',
    'Good conductors of heat: metals. Insulators: wood, rubber, air.'
  ],
  '2019-2024 pattern: Calorimetry numerical (mixing hot and cold water) appears almost every year as 3-4 mark question. Latent heat numerical appears regularly. Modes of heat transfer with examples appears as 2-3 mark question.',
  '2 marks: modes of heat transfer with examples. 3-4 marks: calorimetry numerical OR latent heat numerical.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%heat%' AND s.id = 'science1'
ON CONFLICT (chapter_id) DO NOTHING;

-- 6. Refraction of Light
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Refraction", "definition": "The bending of light when it passes from one medium to another due to a change in its speed. Light bends towards the normal when entering a denser medium."},
    {"term": "Refractive index (n)", "definition": "n = c/v = sin i / sin r. The ratio of speed of light in vacuum to speed of light in the medium."},
    {"term": "Snell''s Law", "definition": "n₁ sin i = n₂ sin r. The ratio of sine of angle of incidence to sine of angle of refraction is constant for a given pair of media."},
    {"term": "Critical angle", "definition": "The angle of incidence in denser medium for which angle of refraction in rarer medium is 90°. sin C = 1/n."},
    {"term": "Total Internal Reflection (TIR)", "definition": "When angle of incidence exceeds critical angle, all light reflects back into the denser medium. Basis of optical fibres and mirage."},
    {"term": "Apparent depth", "definition": "Objects in water appear closer to surface. Apparent depth = Real depth / n."}
  ]'::jsonb,
  '[
    {"name": "Refractive index", "formula": "n = c/v = sin i / sin r = Real depth / Apparent depth", "when_to_use": "Any refraction problem. Use whichever quantities are given."},
    {"name": "Snell''s Law", "formula": "n₁ sin i = n₂ sin r", "when_to_use": "Light passes between two media with given refractive indices."},
    {"name": "Critical angle", "formula": "sin C = 1/n (medium to air)", "when_to_use": "Find critical angle from refractive index."},
    {"name": "Apparent depth", "formula": "Apparent depth = Real depth / n", "when_to_use": "Object in water appears shallower."}
  ]'::jsonb,
  'Always draw a ray diagram: incident ray, refracted ray, normal at point of incidence. Label i and r from the NORMAL, not the surface. TIR conditions: (1) light from denser to rarer medium AND (2) i > critical angle — state BOTH conditions. Applications of TIR (optical fibre, mirage, diamond) are 1-mark questions.',
  ARRAY[
    'Light bends towards normal when entering denser medium (speed decreases).',
    'Refractive index n = sin i / sin r = c/v = Real depth/Apparent depth.',
    'Snell''s Law: n₁ sin i = n₂ sin r.',
    'TIR: (1) denser to rarer medium AND (2) i > critical angle.',
    'Critical angle: sin C = 1/n. Higher n → smaller critical angle.',
    'Applications of TIR: optical fibres, mirage, diamond brilliance.',
    'Apparent depth = Real depth / n. Objects in water look shallower.'
  ],
  '2019-2024 pattern: Numerical using n = sin i/sin r or apparent depth appears almost every year. TIR conditions appear as 2-mark question. Critical angle calculation appears as 2-mark numerical.',
  '1 mark: state TIR condition or application. 2 marks: define refractive index OR TIR conditions. 3-4 marks: numerical using Snell''s law or apparent depth.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%refraction%' AND s.id = 'science1'
ON CONFLICT (chapter_id) DO NOTHING;

-- 7. Lenses
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Convex lens", "definition": "A lens thicker at the centre than at the edges. Converges parallel rays to a real focus. Used in cameras, magnifying glass, human eye."},
    {"term": "Concave lens", "definition": "A lens thinner at the centre than at the edges. Diverges parallel rays. Used to correct myopia."},
    {"term": "Power of a lens (P)", "definition": "Reciprocal of focal length in metres. P = 1/f(m). Unit: Dioptre (D). Convex: positive power. Concave: negative power."},
    {"term": "Lens formula", "definition": "1/v - 1/u = 1/f. Relates object distance (u), image distance (v), and focal length (f)."},
    {"term": "Magnification", "definition": "m = v/u. Negative m = inverted (real) image. Positive m = erect (virtual) image."},
    {"term": "Human eye defects", "definition": "Myopia: image forms in front of retina, corrected by concave lens. Hypermetropia: image forms behind retina, corrected by convex lens."}
  ]'::jsonb,
  '[
    {"name": "Lens formula", "formula": "1/v - 1/u = 1/f", "when_to_use": "Find image distance, object distance, or focal length. u is always negative for real object."},
    {"name": "Power of lens", "formula": "P = 1/f(in metres) | Unit: Dioptre (D)", "when_to_use": "Convert focal length to power."},
    {"name": "Magnification", "formula": "m = v/u", "when_to_use": "Find size or nature of image."},
    {"name": "Combined power", "formula": "P_total = P₁ + P₂", "when_to_use": "Two lenses in contact."}
  ]'::jsonb,
  'Sign convention is critical. u is ALWAYS negative (object on left). For convex with object beyond F: v is positive (real image). For concave: v is always negative (virtual image). Common mistake: forgetting negative sign for u. Eye defects: state defect name, cause, and correction lens — do not just name the lens.',
  ARRAY[
    'Lens formula: 1/v - 1/u = 1/f. Use sign convention consistently.',
    'Power P = 1/f(m). Convex: positive power. Concave: negative power.',
    'Magnification m = v/u. Negative = inverted real; positive = erect virtual.',
    'Myopia: image in front of retina. Correction: concave lens.',
    'Hypermetropia: image behind retina. Correction: convex lens.',
    'Two lenses in contact: P_total = P₁ + P₂.',
    'Combined focal length: 1/f = 1/f₁ + 1/f₂.'
  ],
  '2019-2024 pattern: Lens formula numerical appears almost every year as 3-mark question. Power of lens calculation appears as 2-mark question. Eye defects appear as 2-3 mark question.',
  '1 mark: state power formula. 2 marks: calculate power OR describe one eye defect with correction. 3-4 marks: lens formula numerical.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%lens%' AND s.id = 'science1'
ON CONFLICT (chapter_id) DO NOTHING;

-- 8. Metallurgy
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Mineral vs Ore", "definition": "Mineral: naturally occurring compound in Earth''s crust. Ore: mineral from which metal can be extracted PROFITABLY. All ores are minerals, not all minerals are ores."},
    {"term": "Gangue", "definition": "Unwanted impurities (sand, soil, rock) mixed with the ore. Removed during concentration/beneficiation."},
    {"term": "Calcination", "definition": "Heating ore strongly in ABSENCE of air. Used for carbonate ores — converts to oxide. Example: ZnCO₃ → ZnO + CO₂."},
    {"term": "Roasting", "definition": "Heating ore strongly in PRESENCE of excess air. Used for sulphide ores — converts to oxide. Example: 2ZnS + 3O₂ → 2ZnO + 2SO₂."},
    {"term": "Electrolytic refining", "definition": "Purifying crude metal using electrolysis. Anode: impure metal. Cathode: pure metal. Electrolyte: metal salt solution."},
    {"term": "Alloys", "definition": "Homogeneous mixture of two or more metals (or metal + non-metal). Examples: brass (Cu+Zn), bronze (Cu+Sn), stainless steel (Fe+Cr+Ni)."}
  ]'::jsonb,
  '[
    {"name": "Calcination reaction", "formula": "ZnCO₃ → ZnO + CO₂ (heat, no air)", "when_to_use": "Carbonate ore processing."},
    {"name": "Roasting reaction", "formula": "2ZnS + 3O₂ → 2ZnO + 2SO₂ (heat, excess air)", "when_to_use": "Sulphide ore processing."},
    {"name": "Reduction with carbon", "formula": "ZnO + C → Zn + CO (high temperature)", "when_to_use": "Moderately reactive metals extracted by carbon reduction."}
  ]'::jsonb,
  'Students must clearly distinguish: mineral vs ore, calcination vs roasting. For flow chart questions: Ore → Concentration → Calcination/Roasting → Reduction → Refining. Electrolytic refining diagram is frequently asked — label anode (impure), cathode (pure), electrolyte (metal salt solution).',
  ARRAY[
    'Mineral: naturally occurring compound. Ore: mineral from which metal is profitably extracted.',
    'Gangue: unwanted impurities — removed by concentration.',
    'Calcination: heat carbonate ore WITHOUT air → metal oxide.',
    'Roasting: heat sulphide ore IN air → metal oxide.',
    'Electrolytic refining: anode = impure metal, cathode = pure metal.',
    'Aluminium: from bauxite (Al₂O₃) by electrolysis (Hall-Heroult process).',
    'Alloys: brass (Cu+Zn), bronze (Cu+Sn), stainless steel (Fe+Cr+Ni).'
  ],
  '2019-2024 pattern: Distinguish mineral/ore OR calcination/roasting appears as 2-mark question regularly. Steps of extraction appears as 3-mark question. Electrolytic refining with diagram appears as 3-4 mark question.',
  '1 mark: name ore or alloy. 2 marks: distinguish mineral/ore OR calcination/roasting. 3-4 marks: extraction flow chart OR electrolytic refining.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%metallurgy%' AND s.id = 'science1'
ON CONFLICT (chapter_id) DO NOTHING;

-- 9. Carbon Compounds
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Covalent bond", "definition": "A chemical bond formed by sharing of electron pairs between atoms. Carbon forms 4 covalent bonds (tetravalent)."},
    {"term": "Carbon''s unique properties", "definition": "Tetravalency (4 bonds) and catenation (ability to form long chains with itself) — make millions of organic compounds possible."},
    {"term": "Saturated compounds", "definition": "Compounds with only single bonds between carbon atoms. General formula CₙH₂ₙ₊₂. Example: alkanes (methane, ethane, propane)."},
    {"term": "Unsaturated compounds", "definition": "Compounds with double or triple bonds. Alkenes (double bond): CₙH₂ₙ. Alkynes (triple bond): CₙH₂ₙ₋₂."},
    {"term": "Functional groups", "definition": "Atoms or groups that determine the chemical properties of organic compounds. Examples: -OH (alcohol), -COOH (carboxylic acid), -CHO (aldehyde), -CO- (ketone)."},
    {"term": "Homologous series", "definition": "Series of organic compounds with the same functional group, same general formula, differing by CH₂ unit. Properties change gradually."},
    {"term": "Ethanol (C₂H₅OH)", "definition": "An alcohol. Used as fuel, solvent, and in alcoholic beverages. Dehydration with conc. H₂SO₄ gives ethene. Oxidation gives ethanoic acid."},
    {"term": "Ethanoic acid (CH₃COOH)", "definition": "A carboxylic acid (acetic acid). Present in vinegar. Reacts with ethanol to form ethyl ethanoate (ester). pH < 7."}
  ]'::jsonb,
  '[
    {"name": "Alkane general formula", "formula": "CₙH₂ₙ₊₂ (n = number of carbon atoms)", "when_to_use": "Finding molecular formula of any alkane."},
    {"name": "Alkene general formula", "formula": "CₙH₂ₙ", "when_to_use": "Finding molecular formula of any alkene."},
    {"name": "Alkyne general formula", "formula": "CₙH₂ₙ₋₂", "when_to_use": "Finding molecular formula of any alkyne."},
    {"name": "Esterification reaction", "formula": "Alcohol + Carboxylic acid → Ester + Water (conc. H₂SO₄ catalyst)", "when_to_use": "Reaction between ethanol and ethanoic acid."},
    {"name": "Combustion of carbon compound", "formula": "CₓHᵧ + O₂ → CO₂ + H₂O + heat", "when_to_use": "All combustion reactions of organic compounds."}
  ]'::jsonb,
  'Carbon compounds: IUPAC naming is frequently tested. Steps: (1) find longest carbon chain (parent chain), (2) identify functional group and give lowest locant, (3) add prefix/suffix. Structural isomers — draw all possible structures. Ethanol vs ethanoic acid properties comparison is a common 2-mark question. Saponification (soap making) and esterification reactions must be memorised.',
  ARRAY[
    'Carbon is tetravalent (4 bonds) and shows catenation — basis of organic chemistry.',
    'Alkanes (single bonds): CₙH₂ₙ₊₂. Alkenes (double bond): CₙH₂ₙ. Alkynes (triple): CₙH₂ₙ₋₂.',
    'Functional groups: -OH (alcohol), -COOH (carboxylic acid), -CHO (aldehyde).',
    'Ethanol (C₂H₅OH): oxidised to ethanoic acid. Dehydration gives ethene.',
    'Ethanoic acid (CH₃COOH): present in vinegar. Forms ester with ethanol.',
    'Esterification: alcohol + acid → ester + water (conc. H₂SO₄ catalyst).',
    'Saponification: ester + NaOH → soap + glycerol (reverse of esterification).'
  ],
  '2019-2024 pattern: IUPAC naming of organic compounds appears every year. Structural formula of given compound appears regularly. Properties of ethanol and ethanoic acid appears as 2-mark question. Esterification or saponification reaction appears as 2-3 mark question.',
  '1 mark: write molecular formula using general formula. 2 marks: IUPAC name OR properties of ethanol/ethanoic acid. 3 marks: draw structural formula OR explain esterification with reaction.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%carbon%' AND s.id = 'science1'
ON CONFLICT (chapter_id) DO NOTHING;

-- 10. Space Missions
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Satellite", "definition": "An object that revolves around a planet due to gravitational force. Natural: Moon. Artificial: INSAT, Aryabhata, IRS satellites."},
    {"term": "Orbital velocity", "definition": "The velocity required for an object to remain in a stable orbit around Earth. vo = √(gR) ≈ 7.9 km/s for Low Earth Orbit."},
    {"term": "ISRO", "definition": "Indian Space Research Organisation. India''s national space agency established in 1969. Headquarters: Bengaluru. Launches from Sriharikota (SDSC-SHAR)."},
    {"term": "Chandrayaan missions", "definition": "Chandrayaan-1 (2008): first Indian lunar orbiter, discovered water on Moon. Chandrayaan-2 (2019): orbiter + lander (Vikram) + rover (Pragyan). Chandrayaan-3 (2023): successful soft landing on Moon''s south pole."},
    {"term": "Mangalyaan (Mars Orbiter Mission)", "definition": "India''s first interplanetary mission (2013). Made India the first country to reach Mars orbit on first attempt and at lowest cost."},
    {"term": "International Space Station (ISS)", "definition": "A habitable artificial satellite in Low Earth Orbit. Joint project of NASA, Roscosmos, ESA, JAXA, CSA. Astronauts live and work there for months."}
  ]'::jsonb,
  '[
    {"name": "Orbital velocity", "formula": "vo = √(gR) where g = 9.8 m/s², R = radius of Earth", "when_to_use": "Find minimum speed to maintain Earth orbit."},
    {"name": "Escape velocity", "formula": "ve = √(2gR) = √2 × vo = 11.2 km/s", "when_to_use": "Minimum speed to escape Earth''s gravity."}
  ]'::jsonb,
  'Space missions chapter is mostly factual — focus on dates, names, and firsts. For ISRO missions: memorise year, mission name, what it achieved. Questions are usually 1-2 marks. Common question: name the ISRO mission that discovered water on Moon (Chandrayaan-1). India''s achievement with Mangalyaan (first country to reach Mars on first attempt) is a definite 1-marker. Chandrayaan-3 landing year (2023) is important for recent board exams.',
  ARRAY[
    'ISRO founded 1969. Launches from Sriharikota, Andhra Pradesh.',
    'Chandrayaan-1 (2008): discovered water molecules on Moon.',
    'Chandrayaan-2 (2019): orbiter successful; Vikram lander crashed.',
    'Chandrayaan-3 (2023): first successful soft landing on Moon''s south pole.',
    'Mangalyaan (MOM, 2013): India first country to reach Mars on first attempt.',
    'Orbital velocity ≈ 7.9 km/s. Escape velocity = 11.2 km/s.',
    'ISS: international space station in Low Earth Orbit (about 400 km altitude).'
  ],
  '2019-2024 pattern: Name of ISRO mission and achievement appears as 1-mark question. Short note on Chandrayaan or Mangalyaan appears occasionally as 2-mark question. Difference between orbital velocity and escape velocity appears as 2-mark question.',
  '1 mark: name ISRO mission or its achievement. 2 marks: short note on Chandrayaan-1 or Mangalyaan. 3 marks: describe any two Indian space missions with year and achievement.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%space%' AND s.id = 'science1'
ON CONFLICT (chapter_id) DO NOTHING;

-- ============================================================================
-- SEED: Maharashtra SSC Class 10 Science Part 2 — chapter_content (DAY 13)
-- Correct 10 chapters per official Maharashtra SSC syllabus
-- ============================================================================

-- 1. Heredity and Evolution
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Heredity", "definition": "Transmission of characters (traits) from parents to offspring through genes. The study of how traits are inherited."},
    {"term": "Variation", "definition": "Differences in characteristics among individuals of the same species. Can be inherited (genetic) or acquired (environmental)."},
    {"term": "Dominant trait", "definition": "A trait expressed even in heterozygous (Tt) condition. Represented by capital letter (T)."},
    {"term": "Recessive trait", "definition": "A trait expressed only in homozygous (tt) condition. Represented by lowercase letter (t)."},
    {"term": "Mendel''s Law of Segregation", "definition": "Alleles separate during gamete formation. Each gamete carries only one allele for each trait."},
    {"term": "Evolution", "definition": "Gradual change in inherited characteristics of a population over successive generations."},
    {"term": "Darwin''s Natural Selection", "definition": "Individuals with traits better suited to environment survive and reproduce more. Drives evolution."},
    {"term": "Lamarck''s Theory", "definition": "Acquired characters are inherited. Disproved by modern genetics — use or disuse of organ leads to development or reduction."}
  ]'::jsonb,
  '[
    {"name": "Monohybrid cross F2 ratio", "formula": "Phenotype: 3 dominant : 1 recessive | Genotype: 1 TT : 2 Tt : 1 tt", "when_to_use": "All Punnett square problems with one trait."},
    {"name": "Dihybrid cross F2 ratio", "formula": "Phenotype ratio = 9:3:3:1", "when_to_use": "Two-trait crosses."}
  ]'::jsonb,
  'Genetics problems require drawing the complete Punnett square. Write: P generation → F1 generation → F2 generation. State BOTH phenotype ratio and genotype ratio. Evolution section: Darwin vs Lamarck comparison is frequent — Lamarck: acquired chars inherited; Darwin: natural selection on existing variation. Common mistake: confusing genotype (genetic makeup) with phenotype (observable trait).',
  ARRAY[
    'Dominant (T) expressed in TT and Tt. Recessive (t) only in tt.',
    'Monohybrid F2 ratio: 3:1 (phenotype). 1:2:1 (genotype).',
    'Dihybrid F2 ratio: 9:3:3:1.',
    'Mendel''s Law of Segregation: alleles separate during gamete formation.',
    'Evolution: gradual change in species over generations. Darwin: natural selection.',
    'Inherited variation: passed to offspring. Acquired: not inherited.',
    'DNA → Gene → Chromosome → Nucleus → Cell.'
  ],
  '2019-2024 pattern: Monohybrid Punnett square appears almost every year as 3-mark question. Mendel''s laws as 2-mark question. Darwin vs Lamarck comparison regularly as 2-mark question.',
  '2 marks: state Mendel''s laws OR compare Darwin and Lamarck. 3 marks: Punnett square for monohybrid cross. 4 marks: dihybrid cross with ratio.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%heredity%' AND s.id = 'science2'
ON CONFLICT (chapter_id) DO NOTHING;

-- 2. Life Processes in Living Organisms Part 1
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Photosynthesis", "definition": "Process by which green plants use sunlight, CO₂, and water to produce glucose and oxygen. Occurs in chloroplasts. 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂."},
    {"term": "Aerobic respiration", "definition": "Breaking down glucose using oxygen to release energy as ATP. Products: CO₂ + H₂O + 38 ATP. Occurs in mitochondria."},
    {"term": "Anaerobic respiration", "definition": "Breaking down glucose WITHOUT oxygen. Yeast: glucose → ethanol + CO₂ + 2 ATP. Muscle: glucose → lactic acid + 2 ATP."},
    {"term": "Glycolysis", "definition": "First step of respiration. Glucose (6C) splits into 2 pyruvate (3C) molecules in cytoplasm. Produces 2 ATP. Occurs in absence or presence of oxygen."},
    {"term": "ATP", "definition": "Adenosine Triphosphate. The energy currency of cells. Energy is stored and released by breaking the phosphate bond."}
  ]'::jsonb,
  '[
    {"name": "Photosynthesis equation", "formula": "6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂", "when_to_use": "All photosynthesis questions. Chlorophyll as catalyst."},
    {"name": "Aerobic respiration", "formula": "C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 38 ATP", "when_to_use": "Energy release in cells with oxygen."},
    {"name": "Anaerobic respiration (yeast)", "formula": "C₆H₁₂O₆ → 2C₂H₅OH + 2CO₂ + 2 ATP", "when_to_use": "Fermentation in yeast."},
    {"name": "Anaerobic respiration (muscle)", "formula": "C₆H₁₂O₆ → 2C₃H₆O₃ + 2 ATP", "when_to_use": "Energy in muscle during intense exercise."}
  ]'::jsonb,
  'Examiners check balanced chemical equations for photosynthesis and respiration. Always mention: chloroplast as site of photosynthesis, mitochondria as site of aerobic respiration, cytoplasm for glycolysis. Comparison table between aerobic and anaerobic respiration (5 points) is a very reliable 3-mark question.',
  ARRAY[
    'Photosynthesis: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂. Site: chloroplast.',
    'Aerobic respiration: glucose + oxygen → CO₂ + water + 38 ATP. Site: mitochondria.',
    'Anaerobic: yeast → ethanol + CO₂. Muscle → lactic acid (causes cramps).',
    'Glycolysis: glucose (6C) → 2 pyruvate (3C). Occurs in cytoplasm. 2 ATP produced.',
    'Chlorophyll: absorbs light energy. Found in thylakoids (grana) of chloroplast.',
    'ATP: energy currency of cells. ADP + phosphate + energy → ATP.'
  ],
  '2019-2024 pattern: Photosynthesis equation and conditions appear as 2-mark question regularly. Aerobic vs anaerobic respiration comparison appears as 2-3 mark question. Glycolysis stages appear occasionally.',
  '1 mark: write photosynthesis equation. 2 marks: compare aerobic and anaerobic. 3 marks: explain photosynthesis with site and conditions.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%life process%part 1%' AND s.id = 'science2'
ON CONFLICT (chapter_id) DO NOTHING;

-- 3. Life Processes in Living Organisms Part 2
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Transpiration", "definition": "Loss of water vapour from aerial parts of plants, mainly through stomata. Creates transpiration pull — draws water up from roots to leaves."},
    {"term": "Transportation in plants", "definition": "Xylem: transports water and minerals from roots to leaves (unidirectional, upward). Phloem: transports food (sugars) from leaves to all parts (bidirectional)."},
    {"term": "Human heart", "definition": "4-chambered muscular organ. Right side: pumps deoxygenated blood to lungs (pulmonary circulation). Left side: pumps oxygenated blood to body (systemic circulation)."},
    {"term": "Blood components", "definition": "Plasma (55%): liquid part, carries nutrients. RBC: carries oxygen (haemoglobin). WBC: immunity. Platelets: blood clotting."},
    {"term": "Excretion", "definition": "Removal of metabolic waste products from the body. Kidneys: remove urea (urine). Skin: removes salts (sweat). Lungs: remove CO₂."},
    {"term": "Nephron", "definition": "Structural and functional unit of kidney. Filtration of blood occurs in Bowman''s capsule (glomerulus). Useful substances are reabsorbed."}
  ]'::jsonb,
  '[]'::jsonb,
  'Heart diagram is a high-yield question — draw and label: right atrium, right ventricle, left atrium, left ventricle, aorta, pulmonary artery, pulmonary vein, vena cava. Nephron diagram is also frequently asked — label Bowman''s capsule, glomerulus, proximal convoluted tubule, loop of Henle, distal convoluted tubule, collecting duct. Transportation in plants: remember xylem = water UP, phloem = food UP AND DOWN.',
  ARRAY[
    'Xylem: transports water + minerals UPWARD from root to leaf.',
    'Phloem: transports food (sugars) in BOTH directions.',
    'Heart: 4 chambers. Right side: deoxygenated blood. Left side: oxygenated blood.',
    'Blood: plasma + RBC (oxygen) + WBC (immunity) + platelets (clotting).',
    'Excretion: kidney (urea in urine), lungs (CO₂), skin (salts in sweat).',
    'Nephron: functional unit of kidney. Glomerulus filters blood. Tubule reabsorbs useful substances.',
    'Dialysis: artificial kidney — used when kidneys fail.'
  ],
  '2019-2024 pattern: Labelled diagram of heart or nephron appears frequently as 3-mark question. Transportation in plants (xylem vs phloem) appears as 2-mark question. Excretion — organs and waste products appears as 2-mark question.',
  '2 marks: xylem vs phloem OR excretory organs and their waste products. 3 marks: labelled diagram of heart or nephron. 4 marks: describe double circulation in human body.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%life process%part 2%' AND s.id = 'science2'
ON CONFLICT (chapter_id) DO NOTHING;

-- 4. Environmental Management
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Ecosystem", "definition": "A community of living organisms (biotic) interacting with the non-living components (abiotic) of their environment. Examples: forest, pond, grassland."},
    {"term": "Food chain", "definition": "A linear sequence showing flow of energy from producers to consumers. Example: Grass → Grasshopper → Frog → Snake → Eagle."},
    {"term": "Food web", "definition": "Interconnected food chains in an ecosystem. More realistic representation of feeding relationships."},
    {"term": "Biodiversity", "definition": "Variety of life forms in a given area — includes genetic, species, and ecosystem diversity. India is a mega-biodiversity country."},
    {"term": "Deforestation", "definition": "Large-scale cutting of forests. Causes: soil erosion, loss of biodiversity, climate change, reduced rainfall."},
    {"term": "Ozone depletion", "definition": "Thinning of the ozone layer (stratosphere) due to CFCs (chlorofluorocarbons). Ozone absorbs harmful UV radiation."}
  ]'::jsonb,
  '[]'::jsonb,
  'Environmental management questions test understanding of cause and effect. For pollution questions: state type of pollution, its causes, effects, and prevention — 4 points for a 2-mark answer is sufficient. Food chain questions: always start with a PRODUCER (plant) and end with a top carnivore. 10% law of energy transfer — only 10% of energy passes to the next trophic level.',
  ARRAY[
    'Food chain: Producer → Primary consumer → Secondary consumer → Tertiary consumer.',
    'Only 10% energy passes to the next trophic level (10% law / Lindeman''s law).',
    'Biodiversity hotspots in India: Western Ghats, Eastern Himalayas.',
    'CFCs cause ozone depletion. Ozone absorbs UV-B radiation.',
    'Greenhouse gases: CO₂, CH₄, N₂O, water vapour. Cause global warming.',
    'Deforestation causes: soil erosion, desertification, loss of biodiversity.',
    'Organic farming, vermiculture, and composting are sustainable practices.'
  ],
  '2019-2024 pattern: Food chain with 4-5 organisms appears as 2-mark question. Causes and effects of deforestation appears regularly. Ozone depletion causes and effects appears as 2-mark question. Biodiversity conservation methods appears occasionally.',
  '1 mark: give one example of food chain. 2 marks: effects of deforestation OR ozone depletion. 3 marks: describe ecosystem with biotic and abiotic components.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%environment%' AND s.id = 'science2'
ON CONFLICT (chapter_id) DO NOTHING;

-- 5. Towards Green Energy
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Conventional energy sources", "definition": "Non-renewable energy sources formed from fossils: coal, petroleum, natural gas. Cause pollution, will be exhausted."},
    {"term": "Solar energy", "definition": "Energy from the Sun. Converted to electricity via photovoltaic cells (solar panels) or solar thermal energy. Clean, renewable, inexhaustible."},
    {"term": "Wind energy", "definition": "Kinetic energy of wind converted to electricity by wind turbines. Renewable and clean. Best in coastal and hilly areas."},
    {"term": "Biogas", "definition": "Gas produced by anaerobic decomposition of organic waste (mainly dung + water). Mainly methane (CH₄). Used for cooking and lighting."},
    {"term": "Nuclear energy", "definition": "Energy released by nuclear fission (splitting of heavy atoms like U-235). Produces large amounts of energy with no greenhouse gases but creates radioactive waste."},
    {"term": "Hydroelectric power", "definition": "Electricity generated from the potential energy of stored water. Clean and renewable but displaces communities and affects ecosystems."}
  ]'::jsonb,
  '[]'::jsonb,
  'This chapter is mostly factual. Questions ask: advantages and disadvantages of each energy source (2 marks each type). For biogas: always mention it is produced by ANAEROBIC decomposition and main component is METHANE. Solar energy advantages: free, inexhaustible, no pollution — students must know at least 3 advantages. Compare conventional vs non-conventional energy sources is a reliable 3-mark question.',
  ARRAY[
    'Fossil fuels (coal, petroleum, natural gas): non-renewable, cause air pollution.',
    'Solar energy: from photovoltaic cells. Clean, renewable, no pollution.',
    'Biogas: produced by anaerobic decomposition of organic waste. Main gas: methane (CH₄).',
    'Wind energy: clean and renewable. Wind turbines convert kinetic to electrical energy.',
    'Nuclear energy: fission of U-235. Large energy output but radioactive waste problem.',
    'Hydroelectric power: from falling water. Clean but large dams displace people.',
    'Green energy: energy from renewable sources with minimal environmental impact.'
  ],
  '2019-2024 pattern: Advantages of solar energy or biogas appears as 2-mark question. Compare conventional and non-conventional energy appears as 3-mark question. Describe biogas plant construction appears occasionally.',
  '2 marks: advantages of any one renewable energy source. 3 marks: compare conventional vs non-conventional OR describe biogas production. 4 marks: need for green energy with examples.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%green energy%' AND s.id = 'science2'
ON CONFLICT (chapter_id) DO NOTHING;

-- 6. Animal Classification
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Classification", "definition": "Systematic arrangement of organisms into groups based on similarities and differences. Helps in studying and understanding biodiversity."},
    {"term": "Invertebrates", "definition": "Animals without a backbone (vertebral column). Include Porifera, Coelenterata, Platyhelminthes, Nematoda, Annelida, Arthropoda, Mollusca, Echinodermata."},
    {"term": "Vertebrates", "definition": "Animals with a backbone. Phylum Chordata. Classes: Pisces, Amphibia, Reptilia, Aves (birds), Mammalia."},
    {"term": "Arthropoda", "definition": "Largest phylum. Jointed legs, exoskeleton. Examples: insects (Insecta), spiders (Arachnida), crabs (Crustacea)."},
    {"term": "Mammalia", "definition": "Warm-blooded vertebrates. Have hair/fur, give birth to live young (except monotremes), suckle young with milk. Examples: humans, whales, bats."},
    {"term": "Binomial nomenclature", "definition": "System of giving each organism a two-part scientific name (Genus + species). Introduced by Linnaeus. Example: Homo sapiens (humans)."}
  ]'::jsonb,
  '[]'::jsonb,
  'Animal classification requires memorising phyla names and their key characteristics with examples. Questions are usually: (1) name the phylum/class and give 2 examples, (2) state one characteristic feature. Arthropoda is the LARGEST phylum — remember this. For vertebrate classes: Fish (cold-blooded, gills), Amphibia (both land and water), Reptilia (scales), Aves (feathers, warm-blooded), Mammalia (hair, mammary glands).',
  ARRAY[
    'Arthropoda: largest phylum. Jointed legs, exoskeleton. Examples: insects, spiders, crabs.',
    'Vertebrates (Chordata): Pisces → Amphibia → Reptilia → Aves → Mammalia (evolutionary order).',
    'Mammals: warm-blooded, have hair, suckle young with milk.',
    'Binomial nomenclature: Genus + species. Introduced by Linnaeus.',
    'Porifera (sponges): simplest multicellular animals. No true tissues.',
    'Annelida: segmented worms. Example: Earthworm (Lumbricus). Have setae.',
    'Echinodermata: spiny skin, radial symmetry. Examples: starfish, sea urchin.'
  ],
  '2019-2024 pattern: Name phylum and give examples appears as 1-2 mark question frequently. Distinguish vertebrates and invertebrates appears as 2-mark question. Characteristics and examples of any one phylum appears regularly.',
  '1 mark: name phylum or class with one example. 2 marks: characteristics of any phylum with examples OR distinguish vertebrate/invertebrate. 3 marks: describe any two classes of vertebrates with examples.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%animal class%' AND s.id = 'science2'
ON CONFLICT (chapter_id) DO NOTHING;

-- 7. Introduction to Microbiology
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Microbiology", "definition": "Study of microscopic organisms (microorganisms) including bacteria, viruses, fungi, protozoa, and algae."},
    {"term": "Bacteria", "definition": "Single-celled prokaryotic microorganisms. Can be useful (nitrogen fixation, curd formation, antibiotics) or harmful (TB, cholera, typhoid)."},
    {"term": "Viruses", "definition": "Non-cellular entities with nucleic acid (DNA or RNA) surrounded by protein coat (capsid). Can only reproduce inside living cells. Cause: influenza, COVID-19, polio, HIV/AIDS."},
    {"term": "Fungi", "definition": "Eukaryotic organisms that are mostly saprophytic (decomposers). Some are useful (yeast for bread/wine, Penicillium for penicillin), some harmful (ringworm, athlete''s foot)."},
    {"term": "Protozoa", "definition": "Single-celled eukaryotic microorganisms. Examples: Amoeba, Plasmodium (malaria), Trypanosoma (sleeping sickness)."},
    {"term": "Antibiotics", "definition": "Substances produced by microorganisms that kill or inhibit growth of other microorganisms. First antibiotic: penicillin (discovered by Alexander Fleming in 1928 from Penicillium mould)."}
  ]'::jsonb,
  '[]'::jsonb,
  'Microbiology questions are factual. Common question formats: (1) give one useful and one harmful role of bacteria/fungi, (2) name the microorganism causing a disease, (3) explain why viruses are not considered truly living. Antibiotic discovery (Fleming, 1928, Penicillium) is a 1-mark question. Nitrogen fixation bacteria (Rhizobium in root nodules of legumes) is a frequently asked 2-mark question.',
  ARRAY[
    'Bacteria: prokaryotic. Useful: nitrogen fixation (Rhizobium), curd (Lactobacillus), antibiotics.',
    'Viruses: non-cellular. Cause influenza, polio, HIV/AIDS, COVID-19. Only replicate in living cells.',
    'Fungi: eukaryotic, saprophytic. Yeast: bread/wine fermentation. Penicillium: penicillin antibiotic.',
    'Penicillin discovered by Alexander Fleming in 1928 from Penicillium notatum mould.',
    'Plasmodium (protozoa) causes malaria. Spread by female Anopheles mosquito.',
    'Rhizobium lives in root nodules of legumes — fixes atmospheric nitrogen.',
    'Pasteurisation: heating milk to 63°C/30 min or 72°C/15 sec to kill pathogens.'
  ],
  '2019-2024 pattern: Useful and harmful roles of bacteria or fungi appears as 2-mark question. Disease caused by named microorganism appears as 1-mark question. Antibiotic discovery — Fleming appears regularly. Nitrogen fixation by Rhizobium appears as 2-mark question.',
  '1 mark: name microorganism causing disease. 2 marks: useful and harmful roles of bacteria OR nitrogen fixation. 3 marks: describe role of microorganisms in nature.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%microbiology%' AND s.id = 'science2'
ON CONFLICT (chapter_id) DO NOTHING;

-- 8. Cell Biology and Biotechnology
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Cell organelles", "definition": "Specialised structures within a cell performing specific functions. Examples: nucleus (control centre), mitochondria (energy), ribosome (protein synthesis), chloroplast (photosynthesis)."},
    {"term": "Mitosis", "definition": "Cell division that produces two identical daughter cells with same chromosome number as parent cell (2n). Occurs in somatic (body) cells. Used for growth and repair."},
    {"term": "Meiosis", "definition": "Cell division that produces four daughter cells with HALF the chromosome number (n = haploid). Occurs in reproductive cells. Introduces genetic variation."},
    {"term": "DNA", "definition": "Deoxyribonucleic acid. Double helix structure (Watson and Crick, 1953). Carries genetic information. Made of nucleotides (deoxyribose sugar + phosphate + nitrogenous base)."},
    {"term": "Biotechnology", "definition": "Use of living organisms or their products to develop useful products. Examples: insulin production, golden rice, Bt cotton, gene therapy."},
    {"term": "Genetic engineering", "definition": "Deliberate modification of genetic material of an organism. Recombinant DNA technology — inserting foreign genes into host organisms."}
  ]'::jsonb,
  '[]'::jsonb,
  'Cell division diagrams are high-yield. Draw stages of mitosis: Prophase (chromosomes condense), Metaphase (align at equator), Anaphase (chromatids separate), Telophase (new nuclei form). Key distinction: mitosis = 2 daughter cells, same chromosome number (2n). Meiosis = 4 daughter cells, half chromosome number (n). DNA structure by Watson and Crick (1953) is a 1-mark question.',
  ARRAY[
    'Mitosis: 2 daughter cells, same chromosome number (2n). For growth and repair.',
    'Meiosis: 4 daughter cells, half chromosome number (n). For gamete formation.',
    'DNA double helix discovered by Watson and Crick in 1953.',
    'DNA: deoxyribose sugar + phosphate + nitrogenous base (A, T, G, C).',
    'Base pairing: Adenine-Thymine (A-T), Guanine-Cytosine (G-C).',
    'Biotechnology: insulin from E. coli bacteria via recombinant DNA technology.',
    'Bt cotton: Bacillus thuringiensis gene inserted to resist bollworm pest.'
  ],
  '2019-2024 pattern: Difference between mitosis and meiosis appears almost every year as 2-3 mark question. DNA structure (Watson and Crick) appears as 1-2 mark question. Biotechnology application (insulin production) appears regularly.',
  '1 mark: name who discovered DNA structure. 2 marks: distinguish mitosis and meiosis. 3 marks: explain DNA structure OR stages of mitosis with diagram.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%cell biology%' AND s.id = 'science2'
ON CONFLICT (chapter_id) DO NOTHING;

-- 9. Social Health
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Health", "definition": "A state of complete physical, mental, and social well-being. Not merely the absence of disease. WHO definition."},
    {"term": "Communicable diseases", "definition": "Diseases that spread from one person to another. Modes of transmission: air (TB, cold), water (cholera, typhoid), contact (chickenpox), vector (malaria, dengue)."},
    {"term": "Immunity", "definition": "The ability of the body to resist diseases. Innate immunity: present from birth. Acquired immunity: developed after exposure to pathogen or vaccine."},
    {"term": "Vaccination", "definition": "Administration of weakened or dead pathogens to stimulate immunity. Prevents future infections. Examples: BCG (TB), OPV (polio), MMR (measles, mumps, rubella)."},
    {"term": "Substance abuse", "definition": "Excessive use of drugs, alcohol, or tobacco beyond medical need. Leads to addiction, health problems, and social issues."},
    {"term": "Mental health", "definition": "A state of well-being in which an individual realises their abilities, copes with normal stresses, works productively, and can contribute to the community."}
  ]'::jsonb,
  '[]'::jsonb,
  'Social health questions test understanding of health concepts and their social dimensions. For communicable disease questions: name the disease, causative agent, mode of spread, and one prevention. Vaccination table is commonly asked — BCG (TB), OPV (polio), DPT (diphtheria, pertussis, tetanus). Difference between communicable and non-communicable diseases is a reliable 2-mark question.',
  ARRAY[
    'Health (WHO): complete physical, mental, and social well-being.',
    'Communicable diseases spread through air, water, contact, or vectors.',
    'Malaria: Plasmodium, female Anopheles mosquito. Dengue: Aedes mosquito.',
    'TB (tuberculosis): caused by Mycobacterium tuberculosis. Spreads by air.',
    'Vaccination: BCG (TB), OPV (polio), DPT (diphtheria, pertussis, tetanus), MMR.',
    'Addiction: physical and psychological dependence on substance.',
    'Balanced diet and exercise are essential for maintaining good health.'
  ],
  '2019-2024 pattern: Distinguish communicable and non-communicable diseases appears as 2-mark question. Name vaccine for specific disease appears as 1-mark question. Effects of substance abuse appears as 2-mark question.',
  '1 mark: name vaccine or causative agent of disease. 2 marks: distinguish communicable/non-communicable OR effects of substance abuse. 3 marks: describe modes of disease transmission with examples.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%social health%' AND s.id = 'science2'
ON CONFLICT (chapter_id) DO NOTHING;

-- 10. Disaster Management
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[
    {"term": "Disaster", "definition": "A sudden calamitous event causing great damage, loss of life, and disruption of normal life. Can be natural or man-made."},
    {"term": "Natural disasters", "definition": "Disasters caused by natural forces. Examples: earthquake, flood, cyclone, tsunami, drought, landslide, volcanic eruption."},
    {"term": "Earthquake", "definition": "Sudden shaking of Earth''s crust due to movement of tectonic plates. Measured on Richter scale. Focus: origin point. Epicentre: point on surface above focus."},
    {"term": "Flood", "definition": "Overflow of water onto normally dry land. Causes: heavy rainfall, cyclone, dam failure. Effects: crop damage, disease outbreak, displacement."},
    {"term": "Disaster management phases", "definition": "Pre-disaster phase (preparedness), Warning phase, Emergency phase (rescue and relief), Rehabilitation phase, Recovery phase, Reconstruction phase."},
    {"term": "Do''s and Don''ts", "definition": "Earthquake: Drop, Cover, Hold On. Do NOT use elevator. Flood: move to higher ground, do not enter floodwater. Cyclone: stay indoors, secure objects, listen to warnings."}
  ]'::jsonb,
  '[]'::jsonb,
  'Disaster management questions are practical and applied. Common question: state 3 precautions during earthquake/flood/cyclone. Richter scale: below 2 = not felt; 2-4 = minor; 4-6 = moderate; above 7 = major. Phases of disaster management (6 phases) is a 3-mark question. NDMA (National Disaster Management Authority) established under Disaster Management Act 2005.',
  ARRAY[
    'Natural disasters: earthquake, flood, cyclone, tsunami, drought, landslide.',
    'Earthquake measured on Richter scale. Focus = origin; Epicentre = surface point above focus.',
    'Phases: Pre-disaster → Warning → Emergency → Rehabilitation → Recovery → Reconstruction.',
    'Earthquake: Drop, Cover, Hold On. Do NOT use lift during earthquake.',
    'Flood: move to higher ground. Drink only safe water. Avoid floodwater (electric hazard).',
    'Cyclone: named by meteorological departments. Evacuate coastal areas before landfall.',
    'NDMA: National Disaster Management Authority, India. Set up under DM Act 2005.'
  ],
  '2019-2024 pattern: Precautions during earthquake or flood appears almost every year as 2-3 mark question. Phases of disaster management appears as 3-mark question. Define disaster with types appears as 1-2 mark question.',
  '1 mark: define disaster or name Richter scale. 2 marks: precautions during earthquake/flood. 3 marks: phases of disaster management OR compare two types of disasters.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%disaster%' AND s.id = 'science2'
ON CONFLICT (chapter_id) DO NOTHING;

-- ============================================================================
-- END OF DAY 13 SEED DATA
-- Run in Supabase SQL Editor after Day 12 seed. Safe to re-run (ON CONFLICT DO NOTHING).
-- ============================================================================

-- ============================================================================
-- SYLLABUS CORRECTION PATCH
-- Fixes wrong History/Geography/English chapter names and seeds content
-- Adds missing Algebra Statistics chapter (chapter 6)
-- Removes non-existent Geometry chapter 8 (Geometry has exactly 7 chapters)
-- Maharashtra SSC 10th Standard — Official Balbharati Syllabus
-- Source: Shaalaa.com official Balbharati solutions (verified 2024-25)
-- Safe to re-run: uses ON CONFLICT DO UPDATE / DO NOTHING and targeted DELETEs
-- ============================================================================

-- STEP 1: Fix subject total_chapters counts
UPDATE subjects SET total_chapters = 14 WHERE id = 'history';
UPDATE subjects SET total_chapters = 9  WHERE id = 'geography';
UPDATE subjects SET total_chapters = 22 WHERE id = 'english';
UPDATE subjects SET total_chapters = 6  WHERE id = 'algebra';
UPDATE subjects SET total_chapters = 7  WHERE id = 'geometry';

-- STEP 2: Remove wrong chapter_content (FK child rows must go first)
DELETE FROM chapter_content WHERE chapter_id IN (SELECT id FROM chapters WHERE subject_id = 'history');
DELETE FROM chapter_content WHERE chapter_id IN (SELECT id FROM chapters WHERE subject_id = 'geography');
DELETE FROM chapter_content WHERE chapter_id IN (SELECT id FROM chapters WHERE subject_id = 'english');
DELETE FROM chapter_content WHERE chapter_id IN (SELECT id FROM chapters WHERE subject_id = 'geometry' AND chapter_number = 8);

-- Remove wrong chapters
DELETE FROM chapters WHERE subject_id = 'history';
DELETE FROM chapters WHERE subject_id = 'geography';
DELETE FROM chapters WHERE subject_id = 'english';
DELETE FROM chapters WHERE subject_id = 'geometry' AND chapter_number = 8;

-- ============================================================================
-- HISTORY: 14 chapters (9 Itihas + 5 Rajyashastra)
-- ============================================================================
INSERT INTO chapters (subject_id, chapter_number, name, status, type, free, marks, topics) VALUES
  ('history',  1, 'Itihaslekhan: Pashchatya Parampara', 'Ready', 'High Weightage', true,  5, ARRAY['Historiography','Western tradition','Herodotus','Thucydides','Primary secondary sources','Scientific method']),
  ('history',  2, 'Itihaslekhan: Bharatiya Parampara',  'Ready', 'High Weightage', true,  5, ARRAY['Indian historiography','Puranas','Charita literature','Inscriptions','Kalhana','Rajatarangini','ASI']),
  ('history',  3, 'Upayojit Itihas',                    'Ready', 'Important',      false, 5, ARRAY['Applied history','Uses of history','Oral history','Public history','Museum','Historical consciousness']),
  ('history',  4, 'Bharatiya Kalancha Itihas',          'Ready', 'Important',      false, 5, ARRAY['Classical dance forms','Hindustani Carnatic music','Cave paintings','Temple architecture','Mughal paintings','Maharashtra folk arts']),
  ('history',  5, 'Prasar Madhyame Aani Itihas',        'Ready', 'Core',           false, 4, ARRAY['Mass media and history','Newspapers','Radio','Television','Cinema as historical source']),
  ('history',  6, 'Manoranjanachi Madhyame Aani Itihas','Ready', 'Core',           false, 4, ARRAY['Entertainment media','Films','Theatre history','Powada','Documentaries']),
  ('history',  7, 'Khel Aani Itihas',                   'Ready', 'Core',           false, 4, ARRAY['Sports and history','Olympic history','Cricket history','Indigenous sports','Dhyan Chand']),
  ('history',  8, 'Paryatan Aani Itihas',               'Ready', 'Core',           false, 4, ARRAY['Tourism and history','Heritage tourism','UNESCO sites in India','Historical monuments']),
  ('history',  9, 'Aitihasik Thevyanache Jatan',        'Ready', 'Important',      false, 4, ARRAY['Conservation of heritage','ASI role','Restoration','Intangible heritage','Community conservation']),
  ('history', 10, 'Savidhanachi Vatchal',               'Ready', 'High Weightage', false, 5, ARRAY['Constitution','Constituent Assembly','Preamble','Fundamental Rights','Directive Principles','Amendments']),
  ('history', 11, 'Nivadnuk Prakriya',                  'Ready', 'High Weightage', false, 5, ARRAY['Election process','Election Commission','Lok Sabha','Rajya Sabha','EVMs','Model Code of Conduct']),
  ('history', 12, 'Rajkiya Paksh',                      'Ready', 'Important',      false, 4, ARRAY['Political parties','National parties','State parties','Coalition','Opposition']),
  ('history', 13, 'Samajik Va Rajkiya Chalvali',        'Ready', 'Important',      false, 4, ARRAY['Social movements','Chipko','Narmada Bachao','RTI movement','Mahad Satyagraha']),
  ('history', 14, 'Bhartiya Lokshahisamoril Aavhane',   'Ready', 'Important',      false, 4, ARRAY['Challenges to democracy','Corruption','Communalism','Regionalism','Poverty'])
ON CONFLICT (subject_id, chapter_number) DO UPDATE SET name = EXCLUDED.name, topics = EXCLUDED.topics;

-- ============================================================================
-- GEOGRAPHY: 9 chapters (India AND Brazil comparative)
-- ============================================================================
INSERT INTO chapters (subject_id, chapter_number, name, status, type, free, marks, topics) VALUES
  ('geography', 1, 'Kshetrabhet',                        'Ready', 'Core',           true,  4, ARRAY['Field visit','Observation','Data collection','Contour maps','Map reading']),
  ('geography', 2, 'Sthan-Vistar',                       'Ready', 'High Weightage', true,  6, ARRAY['Location India','Location Brazil','Extent','Latitudes longitudes','Neighbours','Size comparison']),
  ('geography', 3, 'Prakrutik Rachna Va Jalpranali',     'Ready', 'High Weightage', false, 7, ARRAY['Physiography India','Physiography Brazil','Himalayan ranges','Amazon','Ganga','Deccan plateau','Brazilian Highlands']),
  ('geography', 4, 'Hawamaan',                           'Ready', 'High Weightage', false, 7, ARRAY['Climate India','Climate Brazil','Monsoon','Tropical climate','Four seasons','Rainfall','El Nino']),
  ('geography', 5, 'Naisargik Vanaspati Va Prani',       'Ready', 'Important',      false, 6, ARRAY['Vegetation India','Vegetation Brazil','Amazon rainforest','Deciduous forests','Sunderbans','Project Tiger']),
  ('geography', 6, 'Loksankhya',                         'Ready', 'Important',      false, 6, ARRAY['Population India','Population Brazil','Density','Sex ratio','Literacy','Census']),
  ('geography', 7, 'Manavi Vasti',                       'Ready', 'Important',      false, 5, ARRAY['Settlements India','Settlements Brazil','Urbanisation','Slums','Favelas','Rural urban migration']),
  ('geography', 8, 'Arthvyavastha Aani Vyavsay',        'Ready', 'High Weightage', false, 7, ARRAY['Economy India','Economy Brazil','Agriculture','IT sector','BRICS','Coffee','Green revolution']),
  ('geography', 9, 'Paryatan Vahtuk Aani Sandeshvahan', 'Ready', 'Core',           false, 5, ARRAY['Transport India','Transport Brazil','Golden Quadrilateral','Railways','Amazon waterway','Tourism'])
ON CONFLICT (subject_id, chapter_number) DO UPDATE SET name = EXCLUDED.name, topics = EXCLUDED.topics;

-- ============================================================================
-- ENGLISH: 22 chapters — My English Coursebook
-- ============================================================================
INSERT INTO chapters (subject_id, chapter_number, name, status, type, free, marks, topics) VALUES
  ('english',  1, 'A Teenager''s Prayer',                         'Ready', 'Important',      true,  5, ARRAY['Poetry','Values','Anaphora','Prayer format','Central idea']),
  ('english',  2, 'An Encounter of a Special Kind',               'Ready', 'High Weightage', true,  5, ARRAY['Prose','Disability','Empathy','Character sketch','Comprehension']),
  ('english',  3, 'Basketful of Moonlight',                       'Ready', 'Important',      false, 5, ARRAY['Poetry','Nature','Moonlight imagery','Metaphor','Appreciation']),
  ('english',  4, 'Be SMART...!',                                 'Ready', 'Core',           false, 4, ARRAY['SMART goals','Life skills','Goal setting','Specific Measurable Achievable Relevant Time-bound']),
  ('english',  5, 'His First Flight',                             'Ready', 'High Weightage', false, 5, ARRAY['Short story','Seagull','Overcoming fear','Character','Liam O''Flaherty']),
  ('english',  6, 'You Start Dying Slowly...',                    'Ready', 'Important',      false, 5, ARRAY['Poetry','Motivation','Anaphora','Paradox','Living fully']),
  ('english',  7, 'The Boy who Broke the Bank',                   'Ready', 'High Weightage', false, 5, ARRAY['Short story','Rumour','Ruskin Bond','Nathu','Consequences']),
  ('english',  8, 'The Twins',                                    'Ready', 'Important',      false, 4, ARRAY['Poetry','Humour','Irony','AABB rhyme','Comic tone']),
  ('english',  9, 'An Epitome of Courage',                        'Ready', 'High Weightage', false, 5, ARRAY['Prose','Courage','Resilience','Character sketch','Values']),
  ('english', 10, 'Book Review - Swami and Friends',              'Ready', 'Core',           false, 4, ARRAY['Book review','R K Narayan','Malgudi','Writing format','Childhood']),
  ('english', 11, 'World Heritage',                               'Ready', 'Important',      false, 4, ARRAY['UNESCO','Heritage sites','Conservation','Cultural natural heritage','India sites']),
  ('english', 12, 'If...',                                        'Ready', 'High Weightage', false, 5, ARRAY['Poetry','Rudyard Kipling','Anaphora','ABAB rhyme','Qualities','Nobel Prize']),
  ('english', 13, 'A Lesson in Life from a Beggar',               'Ready', 'Important',      false, 5, ARRAY['Prose','Contentment','Character contrast','Life lesson','Moral']),
  ('english', 14, 'Stopping by Woods on a Snowy Evening',         'Ready', 'High Weightage', false, 5, ARRAY['Poetry','Robert Frost','Duty vs desire','Symbolism','AABA rhyme','Repetition']),
  ('english', 15, 'Let''s March!',                                'Ready', 'Core',           false, 4, ARRAY['Poetry','Patriotism','Unity','Anaphora','Marching rhythm']),
  ('english', 16, 'The Alchemy of Nature',                        'Ready', 'Important',      false, 4, ARRAY['Essay','Alchemy metaphor','Nature','Transformation','Lyrical style']),
  ('english', 17, 'The World is Mine',                            'Ready', 'Important',      false, 5, ARRAY['Poetry','Gratitude','Contrast','Listing','Appreciation']),
  ('english', 18, 'Bholi',                                        'Ready', 'High Weightage', false, 5, ARRAY['Short story','Women empowerment','Education','K A Abbas','Transformation']),
  ('english', 19, 'O Captain! My Captain!',                      'Ready', 'High Weightage', false, 5, ARRAY['Poetry','Walt Whitman','Lincoln','Elegy','Extended metaphor','Apostrophe']),
  ('english', 20, 'Unbeatable Super Mom - Mary Kom',              'Ready', 'Important',      false, 5, ARRAY['Biography','Boxing','Manipur','Women empowerment','Perseverance']),
  ('english', 21, 'Joan of Arc',                                  'Ready', 'Important',      false, 4, ARRAY['Historical','France','Hundred Years War','Courage','Martyrdom']),
  ('english', 22, 'A Brave Heart Dedicated to Science and Humanity','Ready','Important',     false, 4, ARRAY['Science biography','Humanitarian values','Intellectual courage','Comprehension'])
ON CONFLICT (subject_id, chapter_number) DO UPDATE SET name = EXCLUDED.name, topics = EXCLUDED.topics;

-- ============================================================================
-- ALGEBRA: Add missing Statistics chapter (chapter 6)
-- ============================================================================
INSERT INTO chapters (subject_id, chapter_number, name, status, type, free, marks, topics) VALUES
  ('algebra', 6, 'Statistics', 'Ready', 'Important', false, 8,
   ARRAY['Mean','Median','Mode','Grouped data','Cumulative frequency','Ogive','Empirical relation'])
ON CONFLICT (subject_id, chapter_number) DO UPDATE SET name = EXCLUDED.name, topics = EXCLUDED.topics;

-- ============================================================================
-- STEP 3: chapter_content for History (14 chapters)
-- ============================================================================

-- 1. Itihaslekhan: Pashchatya Parampara
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Historiography","definition":"Study of how history is written — methods, sources, perspectives historians use."},{"term":"Herodotus","definition":"Ancient Greek historian (484-425 BCE). Father of History. Wrote Histories about Greco-Persian wars. First systematic historian."},{"term":"Thucydides","definition":"Greek historian (460-395 BCE). History of the Peloponnesian War. Introduced critical analysis and cause-effect reasoning."},{"term":"Primary sources","definition":"First-hand materials from the period studied: inscriptions, coins, documents, oral testimonies."},{"term":"Secondary sources","definition":"Works based on primary sources, created later: history books, biographies."},{"term":"Leopold von Ranke","definition":"German historian who said history must use verified primary sources without bias. Scientific method in history."}]'::jsonb,
  '[]'::jsonb,
  'Questions: (1) Herodotus/Thucydides name and contribution — most frequent 1-2 mark. (2) Primary vs secondary sources with examples — 2 marks. (3) Features of Western historiography — 3 marks. Always give specific examples for primary sources.',
  ARRAY['Herodotus: Father of History. Wrote Histories. First systematic historian.','Thucydides: critical analysis, cause-effect in history writing.','Primary sources: inscriptions, coins, documents, oral testimonies — from the period.','Secondary sources: history books, biographies — written after events.','Western historiography: evidence-based, chronological, critical, secular.','Leopold von Ranke: verified primary sources without bias.'],
  'Father of History 1-2 mark. Primary vs secondary sources 2 marks. Features of Western historiography 3 marks.',
  '1 mark: Herodotus or define historiography. 2 marks: primary vs secondary with examples. 3 marks: features of Western tradition.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Pashchatya%' AND s.id = 'history'
ON CONFLICT (chapter_id) DO NOTHING;

-- 2. Itihaslekhan: Bharatiya Parampara
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Indian historiography","definition":"Writing and recording history in India through Vedas, Puranas, inscriptions, copper plates, and chronicles."},{"term":"Kalhana","definition":"12th century Kashmiri historian. Wrote Rajatarangini (River of Kings). First systematic regional history in India."},{"term":"Al-Biruni","definition":"11th century Persian scholar. Wrote Kitab-ul-Hind about Indian society, sciences, and culture."},{"term":"Harshacharita","definition":"Biography of King Harsha by Banabhatta (7th century) — example of Charita literature."},{"term":"ASI","definition":"Archaeological Survey of India. Founded 1861 by Alexander Cunningham. Protects monuments and conducts research."},{"term":"Inscriptions","definition":"Texts carved on stone or metal — most reliable primary sources. Ashoka''s edicts are the most famous."}]'::jsonb,
  '[]'::jsonb,
  'Key pairs: Kalhana-Rajatarangini, Banabhatta-Harshacharita, Al-Biruni-Kitab-ul-Hind. Indian vs Western historiography distinction is a very common 2-mark question. Western: secular, scientific; Indian: diverse sources, mixed with mythology.',
  ARRAY['Rajatarangini by Kalhana (12th c.): first systematic regional history in India.','Harshacharita by Banabhatta: biography of King Harsha.','Al-Biruni: Kitab-ul-Hind — Persian scholar''s account of India.','ASI: founded 1861, Alexander Cunningham. Protects 3,693 monuments.','Inscriptions: most reliable primary sources.','Puranas: king genealogies mixed with myths — use carefully.'],
  'Author of Rajatarangini 2 marks. Indian vs Western historiography 2-3 marks. Role of ASI 1-2 marks.',
  '1 mark: Kalhana or ASI founder. 2 marks: Indian vs Western. 3 marks: sources of Indian history.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Bharatiya Parampara%' AND s.id = 'history'
ON CONFLICT (chapter_id) DO NOTHING;

-- 3. Upayojit Itihas
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Applied History","definition":"Practical use of historical knowledge to understand present situations and solve contemporary problems."},{"term":"Oral history","definition":"History recorded through spoken testimonies of eyewitnesses. Collected through interviews. Vital for marginalised communities not in written records."},{"term":"Museum","definition":"Preserves, researches, and displays historical and cultural objects. Key role in public history and education."},{"term":"Public history","definition":"History practiced in museums, heritage sites, films, memorials — accessible to general public, not just academia."},{"term":"Historical consciousness","definition":"Awareness of how the past shapes the present. Helps citizens understand identity, rights, and responsibilities."}]'::jsonb,
  '[]'::jsonb,
  'Answer format: give use of history + example. Museum: preservation + education. Oral history: what it is + importance for marginalised groups. This chapter is about HOW history is used — not about historical events.',
  ARRAY['Applied history = using historical knowledge for present problems.','Uses: national identity, policy guidance, tourism, education, legal claims.','Oral history: eyewitness testimonies — valuable for marginalised communities.','Museum: preserves objects, makes history accessible to public.','Historical consciousness: awareness of how past shapes present.'],
  'Uses of history 2-3 marks. Role of museums 2 marks. Oral history 2 marks.',
  '1 mark: define applied history. 2 marks: museum role OR oral history. 3 marks: uses of history with examples.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Upayojit Itihas%' AND s.id = 'history'
ON CONFLICT (chapter_id) DO NOTHING;

-- 4. Bharatiya Kalancha Itihas
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Classical dances","definition":"Eight forms: Bharatanatyam (Tamil Nadu), Kathak (North India), Odissi (Odisha), Kuchipudi (Andhra Pradesh), Manipuri (Manipur), Kathakali (Kerala), Mohiniyattam (Kerala), Sattriya (Assam)."},{"term":"Classical music","definition":"Hindustani (North, raga-based, Persian influence) and Carnatic (South, composition-based, more structured)."},{"term":"Cave paintings","definition":"Ajanta (Maharashtra): Buddhist paintings 2nd BCE-6th CE. Bhimbetka (MP): oldest cave art in India."},{"term":"Temple architecture","definition":"Nagara (North, curvilinear shikhara), Dravida (South, pyramidal gopuram), Vesara (mixed, Deccan)."},{"term":"Maharashtra folk arts","definition":"Warli (tribal geometric painting), Lavani (dance-song), Tamasha (folk theatre), Kirtan (devotional), Powada (ballad about Shivaji)."}]'::jsonb,
  '[]'::jsonb,
  'Know art forms with states. Maharashtra folk arts specifically asked in Maharashtra SSC. Temple architecture: Nagara vs Dravida with examples. Eight classical dances with their states must be memorised.',
  ARRAY['8 classical dances: Bharatanatyam(TN), Kathak(N.India), Odissi(Odisha), Kuchipudi(AP), Manipuri(Manipur), Kathakali(Kerala), Mohiniyattam(Kerala), Sattriya(Assam).','Hindustani: North, raga-based. Carnatic: South, composition-based.','Ajanta: Buddhist paintings, Maharashtra. Bhimbetka: oldest cave art, MP.','Nagara: curvilinear shikhara (North). Dravida: gopuram (South).','Warli, Lavani, Tamasha, Kirtan, Powada — Maharashtra folk arts.'],
  'Classical dance forms with states appears every year 2-3 marks. Hindustani vs Carnatic 2 marks. Maharashtra folk arts 2 marks.',
  '1 mark: name a classical dance or its state. 2 marks: Hindustani vs Carnatic OR Maharashtra folk arts. 3 marks: any 4 classical dances with states.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Kalancha%' AND s.id = 'history'
ON CONFLICT (chapter_id) DO NOTHING;

-- 5. Prasar Madhyame Aani Itihas
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Mass media","definition":"Channels reaching large audiences: print (newspapers), electronic (radio, TV), digital (internet, social media)."},{"term":"Bengal Gazette","definition":"First Indian newspaper (1780) by James Augustus Hicky. Newspapers documented freedom movement and spread nationalist ideas."},{"term":"All India Radio","definition":"AIR established 1936. Key role in independence movement and public information."},{"term":"Doordarshan","definition":"India''s first TV channel, established 1959. Historical serials shaped mass historical consciousness."},{"term":"Cinema as historical source","definition":"Films reflect society of their time. Primary source for social attitudes and culture of the period."}]'::jsonb,
  '[]'::jsonb,
  'Know founding dates: Bengal Gazette (1780), AIR (1936), Doordarshan (1959). Role of each medium in history is the main question type.',
  ARRAY['Bengal Gazette: first Indian newspaper 1780. James Augustus Hicky.','AIR: 1936. Used during independence movement.','Doordarshan: 1959. First TV channel India.','Cinema: primary source for social history of its era.','Social media: instant historical record of current events.'],
  'Role of one medium in history 2 marks. First Indian newspaper 1 mark. Cinema and history 2 marks.',
  '1 mark: first Indian newspaper. 2 marks: role of newspapers or cinema. 3 marks: mass media and historical consciousness.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Prasar Madhyame%' AND s.id = 'history'
ON CONFLICT (chapter_id) DO NOTHING;

-- 6. Manoranjanachi Madhyame Aani Itihas
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Entertainment media","definition":"Films, theatre, music, TV serials primarily for recreation but also carriers of cultural history."},{"term":"Historical films","definition":"Films based on historical periods (e.g. Mughal-e-Azam). Portray history for mass audiences but may take creative liberties."},{"term":"Documentaries","definition":"Non-fiction films using archival footage and interviews. More reliable as historical sources than fictional films."},{"term":"Powada","definition":"Marathi ballad form documenting history of Shivaji Maharaj and Maratha empire. Important oral historical record."},{"term":"Tamasha and Kirtan","definition":"Traditional Maharashtra performance arts that transmitted historical narratives and cultural values."}]'::jsonb,
  '[]'::jsonb,
  'Powada as historical source is commonly asked. Distinguish historical films (creative liberties) from documentaries (factual). Maharashtra folk theatre forms important for local syllabus.',
  ARRAY['Historical films portray past but may not be fully accurate.','Documentaries: factual, archival — more reliable historical source.','Powada: Marathi ballad documenting Shivaji Maharaj and Maratha history.','Tamasha and Kirtan transmitted historical stories through performance.','Folk songs preserve oral history of communities not in written texts.'],
  'What is Powada and significance 2 marks. Historical film vs documentary 2 marks.',
  '1 mark: define Powada. 2 marks: Powada as source OR film vs documentary. 3 marks: entertainment media and history.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Manoranjanachi%' AND s.id = 'history'
ON CONFLICT (chapter_id) DO NOTHING;

-- 7. Khel Aani Itihas
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Ancient Olympics","definition":"776 BCE, Olympia, Greece. Held every 4 years in honour of Zeus. First recorded sporting competition in history."},{"term":"Modern Olympics","definition":"1896, Athens. Revived by Baron Pierre de Coubertin. India first participated 1900 Paris — Norman Pritchard won 2 silver medals."},{"term":"Indian hockey","definition":"India won 6 consecutive Olympic gold medals (1928-1956). Dhyan Chand: Wizard of Hockey. Major Dhyan Chand Khel Ratna Award named after him."},{"term":"Indigenous sports","definition":"Kabaddi, Kho-Kho, Mallakhamb, Kushti (wrestling), Lagori. Reflect Indian cultural heritage. Being revived through Khelo India."},{"term":"Modern achievements","definition":"Abhinav Bindra: first individual Olympic gold (2008, shooting). Mary Kom: 8-time World Boxing Champion. Neeraj Chopra: gold at 2020 Tokyo Olympics (javelin)."}]'::jsonb,
  '[]'::jsonb,
  'Know specific years: Ancient Olympics (776 BCE), Modern Olympics (1896). India hockey: 6 Olympic golds, Dhyan Chand. Indigenous sports with examples. Abhinav Bindra: first individual Olympic gold.',
  ARRAY['Ancient Olympics: 776 BCE, Olympia, Greece.','Modern Olympics: 1896, Athens. Pierre de Coubertin.','India hockey: 6 Olympic golds (1928-1956). Dhyan Chand: Wizard of Hockey.','India first Olympics: 1900 Paris. Norman Pritchard: 2 silver medals.','Indigenous sports: Kabaddi, Kho-Kho, Mallakhamb, Kushti.','Abhinav Bindra: first individual Olympic gold for India (2008, shooting).'],
  'Year of modern Olympics 1 mark. India hockey achievement 2 marks. Indigenous sports 2 marks.',
  '1 mark: 1896 Athens or Dhyan Chand. 2 marks: India Olympics OR indigenous sports. 3 marks: sports and national identity.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Khel%' AND s.id = 'history'
ON CONFLICT (chapter_id) DO NOTHING;

-- 8. Paryatan Aani Itihas
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Heritage tourism","definition":"Tourism focused on historical sites, monuments, and culturally significant places. Funds conservation and spreads historical awareness."},{"term":"UNESCO World Heritage Sites","definition":"Sites of outstanding universal value. India has 42 sites (2024): Taj Mahal, Ajanta-Ellora, Hampi, Red Fort, Qutb Minar, Sunderbans, Western Ghats."},{"term":"ASI","definition":"Archaeological Survey of India. Manages 3,693 monuments of national importance. Undertakes conservation and research."},{"term":"Incredible India","definition":"Government of India tourism promotion campaign. Launched 2002. Showcases cultural, historical, and natural diversity."},{"term":"Impact of tourism","definition":"Positive: funds conservation, creates employment, spreads awareness. Negative: overcrowding causes damage, pollution, commercialisation affects authenticity."}]'::jsonb,
  '[]'::jsonb,
  'UNESCO sites in India: Taj Mahal, Ajanta-Ellora, Hampi, Red Fort most commonly asked. Both positive AND negative effects of tourism on heritage — give balanced answer.',
  ARRAY['UNESCO World Heritage Sites India: 42 (2024). Taj Mahal, Ajanta-Ellora, Hampi most famous.','Heritage tourism funds conservation and creates employment.','Negative: overcrowding and pollution damage heritage sites.','ASI: manages 3,693 national monuments.','Incredible India: tourism campaign launched 2002.'],
  'Name 3 UNESCO sites in India appears almost every year 2 marks. Importance of heritage tourism 2 marks. Negative effects 2 marks.',
  '1 mark: UNESCO site or Incredible India. 2 marks: importance OR negative effects of tourism. 3 marks: role of tourism in historical awareness.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Paryatan Aani Itihas%' AND s.id = 'history'
ON CONFLICT (chapter_id) DO NOTHING;

-- 9. Aitihasik Thevyanache Jatan
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Heritage conservation","definition":"Preserving, protecting, and maintaining historical sites, artefacts, and intangible practices for future generations."},{"term":"Tangible heritage","definition":"Physical heritage: monuments, artefacts, manuscripts, sculptures, archaeological sites."},{"term":"Intangible heritage","definition":"Non-physical cultural heritage: oral traditions, performing arts, rituals, festivals, craftsmanship. UNESCO maintains an intangible heritage list."},{"term":"Threats to heritage","definition":"Natural: weather, earthquakes, floods. Human: pollution, vandalism, encroachment, over-tourism, wars, illicit trafficking."},{"term":"Preservation vs Restoration","definition":"Preservation: maintaining in existing condition. Restoration: returning to a known earlier state."}]'::jsonb,
  '[]'::jsonb,
  'Tangible vs intangible with examples — very common. Threats to heritage (natural + human) — give both types. End 3-mark answers with community role in conservation.',
  ARRAY['Tangible: monuments, artefacts. Intangible: oral traditions, festivals, crafts.','ASI: 1861, Alexander Cunningham. Protects 3,693 monuments.','Threats: natural (weather, earthquakes) AND human (pollution, vandalism, development).','Preservation = existing condition. Restoration = returning to earlier state.','India: 42 UNESCO World Heritage Sites (2024).'],
  'Tangible vs intangible 2 marks. Threats to heritage 2-3 marks. ASI role 2 marks.',
  '1 mark: define or distinguish preservation/restoration. 2 marks: tangible vs intangible OR ASI role. 3 marks: threats with protective measures.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Thevyanache%' AND s.id = 'history'
ON CONFLICT (chapter_id) DO NOTHING;

-- 10. Savidhanachi Vatchal
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Constituent Assembly","definition":"Formed 1946 to draft India''s Constitution. Dr B R Ambedkar: chairman of Drafting Committee. 299 members. Took 2 years 11 months 18 days."},{"term":"Constitution","definition":"Supreme law of India. In force 26 January 1950 (Republic Day). Longest written constitution in the world."},{"term":"Preamble","definition":"India is Sovereign, Socialist, Secular, Democratic Republic. Promises Justice, Liberty, Equality, Fraternity to all citizens."},{"term":"Fundamental Rights","definition":"Six rights under Part III (Articles 12-35): Equality, Freedom, Against Exploitation, Religion, Cultural/Educational, Constitutional Remedies."},{"term":"DPSPs","definition":"Directive Principles of State Policy. Part IV. Non-justiciable (not enforceable in court) guidelines for welfare state."},{"term":"42nd Amendment","definition":"1976. Added Socialist and Secular to Preamble. Also called Mini Constitution."}]'::jsonb,
  '[]'::jsonb,
  'Dr Ambedkar as Drafting Committee chairman — asked every year as 1 mark. Preamble: all 5 words (Sovereign, Socialist, Secular, Democratic, Republic) must be stated. Six Fundamental Rights list. Fundamental Rights (justiciable) vs DPSPs (non-justiciable) — appears every year.',
  ARRAY['Constituent Assembly: 1946. Dr B R Ambedkar: Drafting Committee chairman.','Constitution: 26 January 1950 (Republic Day).','Preamble: Sovereign, Socialist, Secular, Democratic, Republic.','Six Fundamental Rights: Equality, Freedom, Against Exploitation, Religion, Cultural/Educational, Constitutional Remedies.','DPSPs: non-justiciable guidelines for state policy (Part IV).','42nd Amendment 1976: added Socialist and Secular to Preamble.'],
  'Chairman Drafting Committee 1 mark every year. Six Fundamental Rights 3 marks. Fundamental Rights vs DPSPs 2 marks.',
  '1 mark: Dr Ambedkar or 26 January 1950. 2 marks: Fundamental Rights vs DPSPs. 3 marks: list and explain any 3 Fundamental Rights.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Savidhanachi%' AND s.id = 'history'
ON CONFLICT (chapter_id) DO NOTHING;

-- 11. Nivadnuk Prakriya
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Election Commission","definition":"Article 324 constitutional body. Independent. Chief Election Commissioner heads it. Supervises free and fair elections."},{"term":"Universal adult franchise","definition":"All citizens 18+ can vote regardless of religion, caste, gender, or wealth. Adopted by India from the start."},{"term":"Lok Sabha","definition":"543 seats. Directly elected every 5 years. FPTP system. Lower house."},{"term":"Rajya Sabha","definition":"245 seats. Elected by state legislative assemblies (indirect). Upper house. Permanent body."},{"term":"EVM","definition":"Electronic Voting Machine. Used since 1998, all-India from 2004. VVPAT added for transparency."},{"term":"Model Code of Conduct","definition":"ECI guidelines during elections: no new policy announcements, no misuse of government machinery for campaigning."},{"term":"NOTA","definition":"None of the Above. Introduced 2013. Voters can reject all candidates."}]'::jsonb,
  '[]'::jsonb,
  'ECI role and composition 2 marks. Universal franchise with voting age (18) 1 mark. Lok Sabha vs Rajya Sabha election methods commonly asked. EVM: 1998 introduction, 2004 all-India.',
  ARRAY['ECI: Article 324. Independent constitutional body. Chief Election Commissioner.','Universal franchise: all 18+ citizens can vote — no discrimination.','Lok Sabha: 543 seats, directly elected, 5-year term, FPTP.','Rajya Sabha: 245 seats, elected by state assemblies (indirect).','EVM: 1998. All-India 2004. VVPAT added later.','Model Code of Conduct: restricts ruling party during elections.','NOTA: introduced 2013.'],
  'Role of ECI 2 marks. Model Code of Conduct 2 marks. Lok Sabha vs Rajya Sabha 2 marks.',
  '1 mark: voting age or EVM/NOTA. 2 marks: ECI role OR Model Code of Conduct. 3 marks: electoral process in India.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Nivadnuk%' AND s.id = 'history'
ON CONFLICT (chapter_id) DO NOTHING;

-- 12. Rajkiya Paksh
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Political party","definition":"Organised group with shared beliefs contesting elections to gain power and implement policies."},{"term":"National parties","definition":"ECI criteria: 6% votes in 4+ states OR win 4 Lok Sabha seats. Examples: BJP, INC, BSP, CPI(M), AAP."},{"term":"State parties","definition":"6% votes in the state. Examples: Shiv Sena, NCP (Maharashtra), TMC (West Bengal), YSRCP (AP)."},{"term":"Opposition","definition":"Parties not in power. Official Opposition: 10% Lok Sabha seats minimum. Holds government accountable."},{"term":"Coalition government","definition":"Alliance of two or more parties. Common in India since 1989. Requires compromise among partners."}]'::jsonb,
  '[]'::jsonb,
  'National party criteria (6% in 4 states) must be stated precisely. Name 3 national + 2 Maharashtra state parties. Role of opposition: holds government accountable through scrutiny and debate.',
  ARRAY['National party: 6% votes in 4+ states OR 4 Lok Sabha seats.','National parties: BJP, INC, BSP, CPI(M), AAP.','State parties: Shiv Sena, NCP in Maharashtra.','Opposition: holds government accountable. Official opposition: 10% seats.','Coalition: alliance of parties. Common since 1989.'],
  'National party criteria 2 marks. Role of opposition 2 marks. National vs state party 2 marks.',
  '1 mark: define political party. 2 marks: national party criteria OR opposition role. 3 marks: multi-party system in India.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Rajkiya Paksh%' AND s.id = 'history'
ON CONFLICT (chapter_id) DO NOTHING;

-- 13. Samajik Va Rajkiya Chalvali
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Chipko Movement","definition":"1973, Uttarakhand. Villagers hugged trees to prevent logging. Led by Sunderlal Bahuguna and Chandi Prasad Bhatt. Grassroots environmental activism."},{"term":"Narmada Bachao Andolan","definition":"Movement against Sardar Sarovar Dam. Led by Medha Patkar. Raised issues of tribal and farming community displacement."},{"term":"RTI Act 2005","definition":"Right to Information. Result of MKSS (Mazdoor Kisan Shakti Sangathan) campaign in Rajasthan. Citizens can access government information."},{"term":"Mahad Satyagraha 1927","definition":"Dr B R Ambedkar led Dalits to use public Chavdar lake at Mahad. Protest against caste discrimination in use of public spaces."},{"term":"Women''s movement","definition":"Sati abolition (1829, Ram Mohan Roy), widow remarriage act (1856). Modern: domestic violence act, equal property rights."}]'::jsonb,
  '[]'::jsonb,
  'For each movement: name, year, location, leader, demand, outcome. Chipko (1973, Uttarakhand, Sunderlal Bahuguna) appears almost every year. Mahad Satyagraha: important for Maharashtra SSC.',
  ARRAY['Chipko: 1973, Uttarakhand. Villagers hugged trees. Sunderlal Bahuguna.','Narmada Bachao: against Sardar Sarovar Dam. Medha Patkar.','RTI Act 2005: from MKSS Rajasthan campaign. Access to government info.','Mahad Satyagraha 1927: Ambedkar led Dalits to public Chavdar lake.','Anna Hazare 2011: anti-corruption movement. Led to Lokpal Act 2013.'],
  'Chipko Movement 2-3 marks almost every year. RTI significance 2 marks. Describe a social movement 3 marks.',
  '1 mark: Chipko leader or RTI year. 2 marks: Chipko details OR RTI significance. 3 marks: any one social movement — cause, method, outcome.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Samajik%' AND s.id = 'history'
ON CONFLICT (chapter_id) DO NOTHING;

-- 14. Bhartiya Lokshahisamoril Aavhane
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Communalism","definition":"Belief that one''s religion/community is superior. Leads to riots and communal violence. Partition (1947) partly due to communalism."},{"term":"Casteism","definition":"Discrimination based on caste. Constitutional prohibition but still prevalent. Affects elections, marriage, education, employment."},{"term":"Regionalism","definition":"Excessive loyalty to state/region over national interest. Linguistic reorganisation of states (1956) partly addressed this."},{"term":"Poverty and illiteracy","definition":"High poverty makes citizens vulnerable to vote-buying. Illiteracy prevents informed democratic participation."},{"term":"Corruption","definition":"Misuse of public office for private gain. RTI Act (2005) and Lokpal Act (2013) as corrective measures."}]'::jsonb,
  '[]'::jsonb,
  'Name the challenge, explain it, give an Indian example, state one solution. Always include solutions — do not write only problems. Communalism, casteism, poverty most frequently asked.',
  ARRAY['Communalism: religion-based division. Partition 1947 most severe example.','Casteism: despite constitutional ban, still affects elections and social mobility.','Regionalism: excessive state loyalty over national interest.','Poverty: poor vulnerable to vote-buying.','Corruption: RTI (2005) and Lokpal (2013) as solutions.'],
  'Any two challenges to democracy appears every year 2-3 marks. Communalism definition 2 marks. Steps to strengthen democracy 3 marks.',
  '1 mark: define communalism or casteism. 2 marks: any 2 challenges. 3 marks: challenges with solutions OR strengthening democracy.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Aavhane%' AND s.id = 'history'
ON CONFLICT (chapter_id) DO NOTHING;

-- ============================================================================
-- GEOGRAPHY chapter_content (9 chapters — India + Brazil)
-- ============================================================================

-- 1. Kshetrabhet
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Field visit","definition":"Direct study through on-site observation. More informative than classroom study."},{"term":"Methods","definition":"Observation, interview, questionnaire, sketch maps, photography, measurement."},{"term":"Contour lines","definition":"Join points of equal elevation. Closely spaced = steep slope. Widely spaced = gentle slope."},{"term":"Steps","definition":"Planning → observation → recording → analysis → report writing."}]'::jsonb,
  '[]'::jsonb,
  'Mostly activity-based. For theory: steps of a field visit. Contour reading: close = steep, wide = gentle. Fewer theory marks — focus on other chapters.',
  ARRAY['Field visit = primary data collection from direct observation.','Steps: planning → observation → recording → analysis → report.','Contour lines: equal elevation. Close = steep. Wide = gentle slope.'],
  'Steps of field visit 2 marks occasionally. Contour reading in map question.',
  '1 mark: define field visit or contour. 2 marks: steps OR contour reading.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Kshetrabhet%' AND s.id = 'geography'
ON CONFLICT (chapter_id) DO NOTHING;

-- 2. Sthan-Vistar
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"India location","definition":"8°4''N to 37°6''N latitude. 68°7''E to 97°25''E longitude. 7th largest country (3.28 million sq km). Standard Meridian: 82°30''E through Allahabad/Prayagraj."},{"term":"India neighbours","definition":"Land: Pakistan (W), China (N), Nepal (N), Bhutan (NE), Bangladesh (E), Myanmar (E). Maritime: Sri Lanka (Palk Strait), Maldives."},{"term":"Brazil location","definition":"5°16''N to 33°44''S latitude. 34°47''W to 73°59''W longitude. 5th largest (8.5 million sq km). Mostly Southern Hemisphere."},{"term":"Brazil neighbours","definition":"Borders all South American countries EXCEPT Chile and Ecuador. Atlantic Ocean on east coast."},{"term":"Comparison","definition":"Both: developing nations, large democracies, BRICS members. Brazil larger (5th) but India more populous. India: Eastern Hemisphere. Brazil: Western Hemisphere."}]'::jsonb,
  '[]'::jsonb,
  'Know latitude/longitude ranges for BOTH India and Brazil. Standard Meridian of India (82°30''E) asked every year as 1 mark. Always compare both countries in every answer.',
  ARRAY['India: 8°4''N-37°6''N. 68°7''E-97°25''E. 7th largest. Standard Meridian 82°30''E.','Brazil: 5°16''N-33°44''S. 5th largest (8.5 million sq km). Mostly S. Hemisphere.','India neighbours: Pakistan, China, Nepal, Bhutan, Bangladesh, Myanmar.','Brazil: borders all S. American countries except Chile and Ecuador.','Both BRICS members. Both large democracies.'],
  'Standard Meridian India 1 mark every year. Latitudinal extent India or Brazil 1-2 marks. Compare location 2-3 marks.',
  '1 mark: Standard Meridian or Brazil area rank. 2 marks: extent of India AND Brazil. 3 marks: compare location and extent.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Sthan-Vistar%' AND s.id = 'geography'
ON CONFLICT (chapter_id) DO NOTHING;

-- 3. Prakrutik Rachna Va Jalpranali
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"6 physiographic divisions of India","definition":"(1) Himalayan Mountains, (2) Northern Plains, (3) Peninsular Plateau, (4) Coastal Plains, (5) Indian Desert (Thar), (6) Islands (Andaman-Nicobar + Lakshadweep)."},{"term":"Three Himalayan ranges","definition":"Himadri (Great Himalayas — highest, perennial snow ~6000m), Himachal (Lesser Himalayas — hill stations), Shivalik (Outer Himalayas — foothills)."},{"term":"Northern Plains","definition":"Formed by alluvium from Indus, Ganga, Brahmaputra. Most fertile. 2,400 km long. Punjab, Haryana, UP, Bihar, WB."},{"term":"Indian rivers","definition":"Himalayan (perennial, glacier+rain): Ganga, Indus, Brahmaputra. Peninsular (seasonal, rain only): Godavari (longest), Krishna, Kaveri."},{"term":"Brazil","definition":"Two main divisions: Brazilian Highlands (Planalto, 60% area) and Amazon basin lowlands (world''s largest river basin)."},{"term":"Amazon","definition":"World''s largest river by discharge. 6,400 km. Basin: 7 million sq km. Carries 20% of world''s freshwater."}]'::jsonb,
  '[]'::jsonb,
  'Always compare India and Brazil. 6 divisions must be memorised in order. Amazon vs Ganga comparison is standard 2-mark question. Brazil content missed by many students — always include.',
  ARRAY['India 6 divisions: Himalayas, Northern Plains, Peninsular Plateau, Coastal Plains, Desert, Islands.','Three Himalayan ranges: Himadri → Himachal → Shivalik.','Northern Plains: most fertile. Alluvial soil. Ganga-Indus-Brahmaputra system.','Peninsular rivers: Godavari (longest), Krishna, Kaveri — seasonal, rain-fed.','Brazil: Brazilian Highlands + Amazon lowlands. Amazon = largest by discharge.','Himalayan rivers: perennial. Peninsular rivers: seasonal.'],
  '6 divisions India 2-3 marks. Three Himalayan ranges 2 marks. Amazon vs Ganga 2 marks. Map: label features.',
  '1 mark: name a Himalayan range or Amazon fact. 2 marks: Himalayan ranges OR Amazon vs Ganga. 3 marks: physiographic divisions India. Map: label features.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Prakrutik Rachna%' AND s.id = 'geography'
ON CONFLICT (chapter_id) DO NOTHING;

-- 4. Hawamaan
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"SW Monsoon","definition":"June-September. Brings most of India''s rainfall. Two branches: Arabian Sea (Western Ghats) and Bay of Bengal (NE India, UP, WB)."},{"term":"NE Monsoon","definition":"October-December. Retreating monsoon. Brings rain to Coromandel coast (Tamil Nadu). North India gets dry northeast winds."},{"term":"Four seasons India","definition":"Winter (Dec-Feb), Summer (Mar-May), SW Monsoon/Rainy (Jun-Sep), Retreating Monsoon (Oct-Nov)."},{"term":"Brazil climate","definition":"Equatorial (Amazon: hot, wet, 2000-3000mm), Tropical (most of Brazil), Semi-arid (NE sertao), Subtropical (south — mild winters)."},{"term":"El Nino","definition":"Periodic Pacific Ocean warming. Weakens India''s monsoon. Causes drought in NE Brazil and floods in S Brazil."},{"term":"Rainfall India","definition":"Mawsynram (Meghalaya): highest in India (>11,000mm/yr). Rajasthan: lowest (<25cm). Western Ghats get more than Deccan rain shadow."}]'::jsonb,
  '[]'::jsonb,
  'Know both India and Brazil. SW monsoon onset (June) and retreat asked every year. Four seasons India must be listed in order. El Nino connection between both countries is a link question.',
  ARRAY['SW Monsoon: June-September. NE Monsoon: October-December (Tamil Nadu).','Four seasons: Winter, Summer, SW Monsoon, Retreating Monsoon.','Brazil: Equatorial (Amazon), Tropical (most), Semi-arid (NE), Subtropical (south).','El Nino: weak India monsoon + drought NE Brazil + floods S Brazil.','Mawsynram: highest rainfall India. Rajasthan: lowest.'],
  'SW monsoon details every year 2-3 marks. Compare India-Brazil climate 2-3 marks. El Nino 2 marks.',
  '1 mark: June onset or El Nino definition. 2 marks: climate factors India OR Brazil zones. 3 marks: seasons India OR compare India-Brazil climate.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Hawamaan%' AND s.id = 'geography'
ON CONFLICT (chapter_id) DO NOTHING;

-- 5. Naisargik Vanaspati Va Prani
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"5 vegetation types India","definition":"(1) Tropical Evergreen (NE, W Ghats — no dry season), (2) Tropical Deciduous/Monsoon (most common — teak, sal), (3) Tropical Dry Deciduous, (4) Mangrove (Sunderbans, coastal), (5) Alpine/Tundra (Himalayas)."},{"term":"Tropical Deciduous forests","definition":"Most widespread in India. Shed leaves in dry season. Key trees: teak (sagwan) and sal. Cover MP, Maharashtra, Odisha."},{"term":"Sunderbans","definition":"India''s largest mangrove. UNESCO World Heritage Site. Royal Bengal Tiger habitat. West Bengal/Bangladesh border."},{"term":"Amazon Rainforest","definition":"5.5 million sq km. Covers 60% of Brazil. ''Lungs of Earth'' — 20% of world''s oxygen. Most biodiverse terrestrial ecosystem. Threatened by deforestation."},{"term":"Project Tiger","definition":"Launched 1973. India''s flagship wildlife conservation programme. 53 tiger reserves (2024). Dramatically increased tiger population."}]'::jsonb,
  '[]'::jsonb,
  'Always compare India and Brazil. Amazon is centrepiece of Brazil — ''Lungs of Earth'' is key phrase. Five vegetation types India with location examples. Sunderbans and Project Tiger regularly asked.',
  ARRAY['5 vegetation types: Evergreen, Deciduous (most common), Dry Deciduous, Mangrove, Alpine.','Tropical deciduous: teak and sal. Most widespread.','Sunderbans: largest mangrove, UNESCO site, Royal Bengal Tiger.','Amazon: 5.5 million sq km. Lungs of Earth. Most biodiverse on land.','Project Tiger: 1973. 53 tiger reserves (2024).','Deforestation threat in both India (agriculture) and Brazil (cattle, soy).'],
  'Amazon importance/threats every year 2-3 marks. Vegetation types India 3 marks. Project Tiger 2 marks.',
  '1 mark: Lungs of Earth or Project Tiger year. 2 marks: Amazon OR Sunderbans. 3 marks: vegetation types India OR compare India-Brazil vegetation.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Naisargik Vanaspati%' AND s.id = 'geography'
ON CONFLICT (chapter_id) DO NOTHING;

-- 6. Loksankhya
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"India population","definition":"1.4 billion (2023). World''s most populous — surpassed China in 2023. 17.5% of world population in 3.3% of world area."},{"term":"Brazil population","definition":"~215 million (2023). 6th most populous. 80% within 300 km of Atlantic coast. Largest cities: São Paulo, Rio de Janeiro."},{"term":"Population density","definition":"India: ~382/sq km. Brazil: ~25/sq km. India ~15x denser. Both uneven: Bihar dense; Amazon sparse."},{"term":"Sex ratio India","definition":"Females per 1000 males. India: 940 (2011). Kerala highest (1084). Declining due to female foeticide — social problem."},{"term":"Literacy","definition":"India: 74.04% (2011). Male 82.14%, Female 65.46%. Gender gap. Brazil ~93% — higher than India. Brazil 87% urban vs India 35%."}]'::jsonb,
  '[]'::jsonb,
  'India most populous in 2023 — important current fact. Sex ratio: definition + India problem + Kerala. Compare India and Brazil in every answer. Census data: 2011 figures used in textbook.',
  ARRAY['India: 1.4 billion — most populous (surpassed China 2023).','Brazil: 215 million. 6th most populous. 80% near Atlantic coast.','India density: 382/sq km. Brazil: 25/sq km.','Sex ratio India: 940 (2011). Kerala highest. Female foeticide problem.','India literacy: 74% (2011). Brazil: 93%. Brazil more urbanised (87% vs 35%).'],
  'Density comparison India-Brazil 2 marks. Sex ratio definition and problem 2 marks. Population distribution factors 3 marks.',
  '1 mark: sex ratio or India population rank. 2 marks: density OR sex ratio. 3 marks: factors affecting distribution in India and Brazil.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Loksankhya%' AND s.id = 'geography'
ON CONFLICT (chapter_id) DO NOTHING;

-- 7. Manavi Vasti
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Settlement types","definition":"Rural: villages (dispersed, nucleated, linear). Urban: towns, cities, mega cities (10 million+). Mumbai, Delhi, São Paulo are mega cities."},{"term":"Urbanisation India","definition":"35% urban (2011). Rapid growth from rural-urban migration. Mega cities: Mumbai (financial capital), Delhi, Kolkata, Chennai."},{"term":"Slums India","definition":"65 million in slums (2011). Dharavi (Mumbai): Asia''s largest informal settlement. Poor sanitation, housing, overcrowding."},{"term":"Favelas Brazil","definition":"Informal hillside settlements especially in Rio de Janeiro and São Paulo. 13 million Brazilians. Similar causes to Indian slums."},{"term":"Rural-urban migration","definition":"Movement for employment, education, services. Push: poverty, unemployment. Pull: jobs, amenities, better services."}]'::jsonb,
  '[]'::jsonb,
  'Slums vs favelas comparison is the most important topic. Urbanisation rates: India 35%, Brazil 87%. Push-pull factors of migration for 2-3 mark answers.',
  ARRAY['Rural: dispersed, nucleated, linear. Urban: towns, cities, mega cities.','India urbanisation: 35% (2011). Brazil: 87% — much more urbanised.','Slums India: 65 million. Dharavi (Mumbai): Asia''s largest.','Favelas Brazil: hillside informal settlements. 13 million people.','Migration: push (poverty, unemployment) pull (jobs, services).'],
  'Slums vs favelas 2-3 marks. Rural-urban migration causes 2 marks. Urbanisation problems 2-3 marks.',
  '1 mark: define favela or Smart Cities Mission. 2 marks: slums vs favelas OR migration causes. 3 marks: urbanisation problems India and Brazil.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Manavi Vasti%' AND s.id = 'geography'
ON CONFLICT (chapter_id) DO NOTHING;

-- 8. Arthvyavastha Aani Vyavsay
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"India economy","definition":"5th largest GDP. Service sector: 56% of GDP. Agriculture: 14% GDP but 50% workforce. IT exports: $245 billion. Bengaluru = Silicon Valley of India."},{"term":"Brazil economy","definition":"9th largest GDP. World''s largest coffee producer, 2nd largest soybean exporter. Embraer (aircraft). Growing service sector."},{"term":"BRICS","definition":"Brazil, Russia, India, China, South Africa. Major emerging economies. Both India and Brazil are founding members."},{"term":"Agriculture comparison","definition":"India: rice, wheat, cotton, sugarcane, tea, spices. Brazil: coffee (world''s largest), soybeans, sugarcane (ethanol), beef. Both agri-export powerhouses."},{"term":"Green revolution","definition":"1960s India. Dramatically increased wheat and rice production. Led by M S Swaminathan (India) and Norman Borlaug (international). Ended food shortage."}]'::jsonb,
  '[]'::jsonb,
  'Brazil = largest coffee producer — 1 mark question. India IT hub, Bengaluru important. BRICS membership both countries. Three economic sectors with India/Brazil examples = standard 3-mark answer.',
  ARRAY['India: 5th largest GDP. Service 56%. Agriculture 50% workforce. IT exports $245bn.','Brazil: 9th largest. World''s largest coffee producer, 2nd soybean exporter.','BRICS: Brazil, Russia, India, China, South Africa. Both founding members.','India IT: Bengaluru = Silicon Valley. TCS, Infosys, Wipro.','India crops: rice, wheat, cotton, sugarcane. Brazil: coffee, soybeans, sugarcane ethanol.'],
  'Brazil as coffee producer 1-2 marks. Compare agriculture India-Brazil 3 marks. What is BRICS 2 marks.',
  '1 mark: largest coffee producer or BRICS full form. 2 marks: BRICS OR India IT. 3 marks: compare economy or agriculture India and Brazil.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Arthvyavastha%' AND s.id = 'geography'
ON CONFLICT (chapter_id) DO NOTHING;

-- 9. Paryatan Vahtuk Aani Sandeshvahan
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Transport India","definition":"Roads: 63 lakh km (2nd largest globally). Railways: 67,956 km (4th largest). Inland waterways: Ganga, Brahmaputra, Kerala backwaters. 12 major ports. 486 airports."},{"term":"Golden Quadrilateral","definition":"Expressway linking Delhi, Mumbai, Chennai, Kolkata. Total length: 5,846 km. Most important highway network in India."},{"term":"NH44","definition":"Longest national highway: Srinagar to Kanyakumari. 3,745 km."},{"term":"Transport Brazil","definition":"75% of goods by road (unlike India where rail is significant). Amazon river: major inland waterway. Santos port: largest in South America."},{"term":"Tourism","definition":"India: Taj Mahal, Kerala backwaters, Rajasthan, Goa, Varanasi. Brazil: Rio Carnival, Amazon ecotourism, Iguazu Falls, Christ the Redeemer."}]'::jsonb,
  '[]'::jsonb,
  'Golden Quadrilateral: know all 4 cities (Delhi, Mumbai, Chennai, Kolkata). Brazil: 75% road transport is a key contrast with India. Tourism: Taj Mahal and Christ the Redeemer as iconic symbols.',
  ARRAY['India roads: 63 lakh km. Railways: 67,956 km — 4th largest in world.','Golden Quadrilateral: Delhi-Mumbai-Chennai-Kolkata expressway, 5,846 km.','NH44: longest (Srinagar to Kanyakumari, 3,745 km).','Brazil: 75% road transport. Amazon river: key waterway.','Santos port: largest in South America.','India tourism: Taj Mahal, Kerala, Rajasthan. Brazil: Carnival, Amazon, Iguazu Falls.'],
  'Golden Quadrilateral with map 2-3 marks. Compare India-Brazil transport 2-3 marks. Brazil tourist attractions 2 marks.',
  '1 mark: Golden Quadrilateral cities or NH44 length. 2 marks: India-Brazil transport OR Brazil tourism. 3 marks: transport network India.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Paryatan Vahtuk%' AND s.id = 'geography'
ON CONFLICT (chapter_id) DO NOTHING;

-- ============================================================================
-- ENGLISH chapter_content (22 chapters)
-- ============================================================================

-- 1. A Teenager's Prayer
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Central idea","definition":"Teenager prays for inner strength, integrity, and courage — not wealth or fame. Values over material success."},{"term":"Devices","definition":"Anaphora: repetition of prayer-like phrases. Prayer format: direct address to God. Optimistic tone."},{"term":"Theme","definition":"Character and values are more important than worldly success."}]'::jsonb,
  '[]'::jsonb,
  'Write central idea in 2-3 sentences. Identify anaphora as main poetic device. Appreciation: state form (prayer/lyric), theme (values), devices, personal response.',
  ARRAY['Poet prays for strength, integrity, courage — not wealth or fame.','Anaphora: prayer-like phrases repeated.','Theme: values over material success. Tone: humble, sincere, earnest.'],
  'Central idea 2 marks. Appreciation 4-5 marks.',
  '2 marks: central idea. 4-5 marks: appreciation (theme, devices, personal response).'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Teenager%Prayer%' AND s.id = 'english'
ON CONFLICT (chapter_id) DO NOTHING;

-- 2. An Encounter of a Special Kind
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Theme","definition":"Disability, compassion, and human connection. Both characters grow from the encounter."},{"term":"Message","definition":"People with disabilities deserve equal respect — not pity. Compassion means recognising full humanity."},{"term":"Characters","definition":"Protagonist shows empathy. Person with disability shows dignity and resilience."}]'::jsonb,
  '[]'::jsonb,
  'Character sketch: focus on qualities shown through actions. Theme: disability and dignity. Message/moral important for 2-3 marks.',
  ARRAY['Theme: disability awareness, compassion, human dignity.','Message: respect not pity. Equal humanity.','Tone: warm, reflective, emotionally engaging.'],
  'Character sketch 3-4 marks. Theme 2 marks. Message 2 marks.',
  '2 marks: theme or message. 3-4 marks: character sketch.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Encounter of a Special%' AND s.id = 'english'
ON CONFLICT (chapter_id) DO NOTHING;

-- 3. Basketful of Moonlight
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Central idea","definition":"Celebrates beauty of moonlight. Greatest gifts freely available in nature. Peace found in natural phenomena."},{"term":"Imagery","definition":"Moonlight as collectible — silver imagery of stars and night sky. Sensory images create peaceful atmosphere."},{"term":"Devices","definition":"Metaphor: basket of moonlight. Personification. Visual imagery throughout."},{"term":"Theme","definition":"Appreciation of nature. Peace in simple natural experiences, not material things."}]'::jsonb,
  '[]'::jsonb,
  'Dominant imagery (silver/moonlight) and effect. Title metaphor must be explained. Mood: peaceful, joyful, contemplative.',
  ARRAY['Central idea: beauty of moonlight, joy in nature.','Metaphor: basket of moonlight — nature''s abundance.','Mood: peaceful, joyful, contemplative.'],
  'Central idea 2 marks. Device 1 mark. Appreciation 4-5 marks.',
  '1 mark: poetic device. 2 marks: central idea. 4-5 marks: appreciation.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Basketful%' AND s.id = 'english'
ON CONFLICT (chapter_id) DO NOTHING;

-- 4. Be SMART...!
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"SMART","definition":"Specific, Measurable, Achievable, Relevant, Time-bound. Framework for effective goal-setting."},{"term":"Specific","definition":"Clear WHAT and WHY. Example: Score 80%+ in Maths in March board exam."},{"term":"Measurable","definition":"Trackable progress. Concrete criteria: marks, time, quantity."},{"term":"Achievable","definition":"Challenging but realistic given available resources."},{"term":"Time-bound","definition":"Clear deadline. ''By March 1'' is time-bound; ''someday'' is not."}]'::jsonb,
  '[]'::jsonb,
  'Expand SMART acronym (1 mark). Write a SMART goal: include all 5 components explicitly. Explain any one component with example (2 marks).',
  ARRAY['SMART = Specific, Measurable, Achievable, Relevant, Time-bound.','All 5 components must be present in a proper SMART goal.'],
  'Expand SMART 1 mark. Write SMART goal 2-3 marks.',
  '1 mark: expand SMART. 2 marks: explain two components. 3 marks: write a SMART goal.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Be SMART%' AND s.id = 'english'
ON CONFLICT (chapter_id) DO NOTHING;

-- 5. His First Flight
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Summary","definition":"Young seagull afraid to fly while siblings flew. Parents coax him. Hunger drives him to leap for food his mother holds — discovers he can fly."},{"term":"Theme","definition":"Fear overcome by necessity/hunger. Courage found through inner motivation."},{"term":"Character","definition":"Fearful and hesitant initially. Hunger gives him courage. Transformation from coward to flier."},{"term":"Author","definition":"Liam O''Flaherty — Irish short story writer."}]'::jsonb,
  '[]'::jsonb,
  'Character sketch: fear, hesitation, transformation. Theme: courage through necessity. Key questions: why did seagull not fly? What made him fly?',
  ARRAY['Seagull afraid while siblings flew. Left alone on ledge.','Mother held out fish — seagull dived, discovered he could fly.','Theme: hunger/necessity overcomes fear.','Author: Liam O''Flaherty.'],
  'Character sketch 3-4 marks. Why seagull feared 2 marks. Theme 2 marks.',
  '2 marks: why feared OR role of hunger. 3-4 marks: character sketch.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%His First Flight%' AND s.id = 'english'
ON CONFLICT (chapter_id) DO NOTHING;

-- 6. You Start Dying Slowly...
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Central idea","definition":"Person dies spiritually when they stop taking risks, dreaming, and changing. Call to live actively and passionately."},{"term":"Theme","definition":"Living fully. Complacency and fear of change are forms of living death."},{"term":"Devices","definition":"Anaphora: ''You start dying slowly'' repeated. Paradox: dying while still alive."}]'::jsonb,
  '[]'::jsonb,
  'Central idea (spiritual death through inaction) must be stated clearly. Anaphora must be named with the line. Paradox of dying while alive is important.',
  ARRAY['Central idea: spiritual death from inaction — stop risking, dreaming, changing.','Anaphora: ''You start dying slowly'' repeated.','Paradox: dying while physically alive. Message: live passionately.'],
  'Central idea 2 marks. Device 1 mark. Appreciation 4-5 marks.',
  '1 mark: anaphora. 2 marks: central idea. 4-5 marks: appreciation.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Dying Slowly%' AND s.id = 'english'
ON CONFLICT (chapter_id) DO NOTHING;

-- 7. The Boy who Broke the Bank
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Summary","definition":"Nathu (sweeper) complains about unpaid salary. Rumour spreads bank is bankrupt. People panic, withdraw savings. Bank collapses from rumour — not real financial trouble."},{"term":"Theme","definition":"Destructive power of rumours. A small complaint snowballs into catastrophe."},{"term":"Nathu","definition":"Innocent sweeper — hardworking, not responsible for consequences of his complaint."},{"term":"Author","definition":"Ruskin Bond — famous Indian English fiction writer, Uttarakhand hills."}]'::jsonb,
  '[]'::jsonb,
  'Trace how the rumour spread (chain of events) — most asked question. Character sketch of Nathu: innocent, hardworking. Author: Ruskin Bond.',
  ARRAY['Nathu: sweeper complained about unpaid salary — accidentally started rumour chain.','Rumour chain spread through town → bank run → collapse.','Theme: destructive power of rumour.','Author: Ruskin Bond.'],
  'Trace rumour spread 3 marks. Character sketch Nathu 3 marks. Theme 2 marks.',
  '2 marks: theme OR Nathu. 3 marks: trace the rumour spread step by step.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Boy who Broke%' AND s.id = 'english'
ON CONFLICT (chapter_id) DO NOTHING;

-- 8. The Twins
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Central idea","definition":"Humorous poem about twins so identical even their mother confuses them — and the twins cannot tell themselves apart."},{"term":"Tone","definition":"Comic, humorous, playful. Light and bouncy."},{"term":"Devices","definition":"Irony: twins don''t know which is which. Repetition for comic effect. AABB rhyme scheme."}]'::jsonb,
  '[]'::jsonb,
  'Always mention humorous tone in appreciation — distinguishes this poem. AABB rhyme scheme. Irony as key device.',
  ARRAY['Twins so identical even mother cannot tell them apart.','Tone: comic, humorous, playful.','AABB rhyme scheme. Irony: twins unsure of own identity.'],
  'Central idea 2 marks. Tone/device 1 mark. Appreciation 4-5 marks.',
  '1 mark: tone (humorous) or AABB. 2 marks: central idea. 4-5 marks: appreciation.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%The Twins%' AND s.id = 'english'
ON CONFLICT (chapter_id) DO NOTHING;

-- 9. An Epitome of Courage
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Theme","definition":"Courage and resilience. Acting despite fear, not absence of fear."},{"term":"Character qualities","definition":"Brave, determined, resilient, positive attitude. Actions from text show these qualities."}]'::jsonb,
  '[]'::jsonb,
  'Character sketch: identify qualities with specific textual evidence. Theme = courage in adversity. Comprehension: answer precisely from the text.',
  ARRAY['Theme: courage and perseverance in adversity.','Character: brave, determined, resilient, positive.','Tone: admiring, inspirational.'],
  'Character sketch 3-4 marks. Theme 2 marks. Vocabulary 1 mark.',
  '2 marks: theme. 3-4 marks: character sketch with evidence.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Epitome of Courage%' AND s.id = 'english'
ON CONFLICT (chapter_id) DO NOTHING;

-- 10. Book Review - Swami and Friends
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Book","definition":"Swami and Friends (1935) — R K Narayan''s first novel. Fictional Malgudi. Swaminathan and school friends'' adventures. Charming childhood portrait."},{"term":"Review format","definition":"Title/Author → Genre → Plot summary → Characters → Themes → Opinion → Recommendation."},{"term":"R K Narayan","definition":"Indian English fiction writer (1906-2001). Created fictional Malgudi. Other works: The Guide, Malgudi Days."},{"term":"Theme","definition":"Friendship, childhood, growing up, tradition vs modernity."}]'::jsonb,
  '[]'::jsonb,
  'Know the 6-7 elements of book review format. R K Narayan and Malgudi. Do not retell entire story — brief summary + focus on theme and opinion.',
  ARRAY['Swami and Friends: R K Narayan, 1935. Malgudi. First novel.','Review format: Title/Author → Genre → Summary → Characters → Theme → Opinion → Recommendation.','Theme: childhood, friendship, growing up.'],
  'Write book review 4-5 marks. Review format elements 2 marks.',
  '2 marks: elements of a book review. 4-5 marks: write a review of Swami and Friends.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Swami and Friends%' AND s.id = 'english'
ON CONFLICT (chapter_id) DO NOTHING;

-- 11. World Heritage
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"UNESCO World Heritage","definition":"Convention 1972. Protects sites of outstanding universal value. 1,157 sites globally. India: 42 (2023)."},{"term":"Types","definition":"Cultural (monuments, buildings), Natural (landscapes, ecosystems), Mixed (both). India has all three."},{"term":"Indian sites","definition":"Taj Mahal, Ajanta Caves (Maharashtra), Ellora Caves (Maharashtra), Hampi, Qutb Minar, Sunderbans, Western Ghats."}]'::jsonb,
  '[]'::jsonb,
  'Factual questions — read carefully. Ajanta and Ellora are specifically important for Maharashtra students. Cultural vs natural with examples is standard question.',
  ARRAY['UNESCO World Heritage Convention: 1972. India: 42 sites (2023).','Cultural: Taj Mahal, Ajanta-Ellora, Hampi. Natural: Sunderbans, Western Ghats.','Heritage status gives: international recognition, tourism, conservation funding.'],
  'Name 3 UNESCO sites India 2 marks. Cultural vs natural 2 marks.',
  '2 marks: 3 UNESCO sites OR cultural vs natural. 3 marks: importance of World Heritage.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%World Heritage%' AND s.id = 'english'
ON CONFLICT (chapter_id) DO NOTHING;

-- 12. If...
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Central idea","definition":"Father advises son: develop patience, honesty, resilience, humility and you will inherit the Earth and be a complete person."},{"term":"Structure","definition":"4 stanzas. Conditional ''If you can'' throughout. Concludes: ''you''ll be a Man, my son!'' ABAB rhyme scheme."},{"term":"Qualities","definition":"Patience, self-belief without arrogance, handling triumph and disaster equally, perseverance, honesty, humility."},{"term":"Devices","definition":"Anaphora: ''If you can'' repeated. Contrast: triumph/disaster. Personification: Triumph and Disaster capitalised."},{"term":"Author","definition":"Rudyard Kipling (1865-1936). Nobel Prize Literature 1907. British author born in India. Wrote The Jungle Book."}]'::jsonb,
  '[]'::jsonb,
  'Most important poem — appears every year. Rudyard Kipling, Nobel Prize 1907. Anaphora (''If you can''). ABAB rhyme. List 4 qualities: patience, resilience, honesty, humility.',
  ARRAY['Author: Rudyard Kipling. Nobel Prize 1907. Born India, British.','4 stanzas. ''If you can'' anaphora. ABAB rhyme. Father to son.','Qualities: patience, resilience, honesty, humility, equal treatment of triumph and disaster.','Devices: anaphora, contrast (Triumph/Disaster), personification.'],
  'Name author 1 mark every year. Qualities praised 2-3 marks. Appreciation 4-5 marks.',
  '1 mark: Kipling or Nobel 1907. 2-3 marks: qualities praised. 4-5 marks: appreciation.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name = 'If...' AND s.id = 'english'
ON CONFLICT (chapter_id) DO NOTHING;

-- 13. A Lesson in Life from a Beggar
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Central idea","definition":"Narrator receives unexpected life lesson from a beggar. Beggar''s contentment teaches about true wealth."},{"term":"Theme","definition":"Contentment is true wealth. Wisdom comes from unexpected sources."},{"term":"Characters","definition":"Narrator: relatively wealthy, perhaps discontented. Beggar: poor but content and dignified."}]'::jsonb,
  '[]'::jsonb,
  'Character contrast is key. Theme: contentment as true wealth. Moral must be stated clearly.',
  ARRAY['Theme: contentment = true wealth. Not material possessions.','Beggar: materially poor but dignified, content, wise.','Moral: wisdom from unexpected sources. Gratitude transforms life.'],
  'Lesson learned 2-3 marks. Beggar character sketch 3 marks. Moral 2 marks.',
  '2 marks: moral OR lesson. 3 marks: character sketch of beggar.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Lesson in Life%' AND s.id = 'english'
ON CONFLICT (chapter_id) DO NOTHING;

-- 14. Stopping by Woods on a Snowy Evening
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Central idea","definition":"Speaker pauses to admire snowy woods but must continue — has promises to keep. Conflict: desire (beauty) vs duty (responsibilities)."},{"term":"Famous lines","definition":"The woods are lovely, dark and deep, / But I have promises to keep, / And miles to go before I sleep, / And miles to go before I sleep."},{"term":"Devices","definition":"Repetition: last two lines emphasise duty. Symbolism: woods=temptation, miles=responsibilities, horse=practicality. AABA rhyme scheme."},{"term":"Author","definition":"Robert Frost (1874-1963). American poet. Nature poetry with philosophical depth. Other poems: The Road Not Taken, Fire and Ice."}]'::jsonb,
  '[]'::jsonb,
  'Last stanza (repeated line) is the most asked — explain repetition (emphasis on duty). Theme: duty vs desire. Robert Frost (American). AABA rhyme.',
  ARRAY['Author: Robert Frost. American. 1874-1963.','Conflict: desire (linger in beauty) vs duty (promises, responsibilities).','Repetition of last line: weight of duty cannot be ignored.','Symbolism: woods=temptation, miles=responsibilities, horse=practicality.','AABA rhyme scheme.'],
  'Explain last stanza 3 marks every year. Author 1 mark. Appreciation 4-5 marks.',
  '1 mark: Robert Frost. 2-3 marks: last stanza OR duty vs desire. 4-5 marks: appreciation.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Stopping by Woods%' AND s.id = 'english'
ON CONFLICT (chapter_id) DO NOTHING;

-- 15. Let's March!
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Central idea","definition":"Stirring patriotic poem calling people to march forward together. Collective energy and purpose."},{"term":"Theme","definition":"Unity, patriotism, collective action despite challenges."},{"term":"Devices","definition":"Anaphora: ''Let''s march'' repeated. Strong marching rhythm reinforces subject."}]'::jsonb,
  '[]'::jsonb,
  'Theme: unity and collective action. Tone: energetic, inspiring. Anaphora. Note how rhythm reflects marching.',
  ARRAY['Theme: unity, patriotism, collective action.','Tone: energetic, inspiring, patriotic.','Anaphora: ''Let''s March'' creates energy and rhythm.'],
  'Central idea 2 marks. Appreciation 4-5 marks.',
  '2 marks: central idea or tone. 4-5 marks: appreciation.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Let%March%' AND s.id = 'english'
ON CONFLICT (chapter_id) DO NOTHING;

-- 16. The Alchemy of Nature
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Title metaphor","definition":"Alchemy: transforming base metals into gold. Here, nature transforms ordinary experience into something extraordinary."},{"term":"Theme","definition":"Nature''s transformative and healing power. Close observation of nature enriches human life."},{"term":"Style","definition":"Lyrical, descriptive prose. Scientific accuracy with poetic wonder."}]'::jsonb,
  '[]'::jsonb,
  'Title metaphor (alchemy = transformation) is the most asked question. Style: lyrical and scientific combined. Vocabulary questions frequent.',
  ARRAY['Alchemy: nature transforms ordinary into extraordinary.','Theme: nature heals and transforms.','Style: lyrical descriptive prose, scientific yet poetic.'],
  'Explain title 2 marks. Central idea 2 marks. Vocabulary 1 mark.',
  '2 marks: title OR central idea. 1 mark: vocabulary. 4 marks: appreciation.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Alchemy of Nature%' AND s.id = 'english'
ON CONFLICT (chapter_id) DO NOTHING;

-- 17. The World is Mine
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Central idea","definition":"Speaker counts blessings and realises wealth in health, family, friendship. Gratitude transforms perspective."},{"term":"Theme","definition":"Gratitude and appreciation. You have everything if you choose to notice it."},{"term":"Devices","definition":"Contrast: speaker vs less fortunate. Listing/accumulation of blessings. Tone: joyful, grateful."}]'::jsonb,
  '[]'::jsonb,
  'Gratitude is central theme. Contrast technique is main device. Appreciation: state theme, contrast device, add genuine personal response.',
  ARRAY['Theme: gratitude — count your blessings.','Device: contrast (speaker vs less fortunate), listing of blessings.','Tone: joyful, grateful, appreciative.'],
  'Central idea 2 marks. Appreciation with personal response 4-5 marks.',
  '2 marks: central idea. 4-5 marks: appreciation with theme, devices, personal response.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%World is Mine%' AND s.id = 'english'
ON CONFLICT (chapter_id) DO NOTHING;

-- 18. Bholi
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Summary","definition":"Bholi (Sulekha) stammers, has pockmarks, considered the village idiot. Teacher encourages and educates her. Bholi refuses degrading arranged marriage — empowered by education."},{"term":"Theme","definition":"Education empowers women. Education transforms Bholi from timid and neglected to strong and self-respecting."},{"term":"Bholi''s character","definition":"Before: timid, neglected, considered useless. After education: confident, self-respecting, courageous."},{"term":"Teacher''s role","definition":"Treats Bholi with respect, encourages learning, plants self-worth. Turning point of her life."},{"term":"Author","definition":"K A Abbas (Khwaja Ahmad Abbas) — Indian writer and filmmaker."}]'::jsonb,
  '[]'::jsonb,
  'Appears in board exams regularly. Character sketch before AND after transformation = most asked. Teacher role: critical turning point. Final refusal of marriage = symbol of empowerment.',
  ARRAY['Bholi: stammers, pockmarks, considered useless. Transformed by education.','Teacher: respect + encouragement = life-changing.','Theme: education = women''s empowerment and self-respect.','Bholi refuses greedy old man''s marriage — educated woman asserting dignity.','Author: K A Abbas.'],
  'Bholi character sketch every year 3-4 marks. Teacher role 2-3 marks. Theme 2 marks.',
  '2 marks: theme OR teacher role. 3-4 marks: character sketch before and after transformation.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Bholi%' AND s.id = 'english'
ON CONFLICT (chapter_id) DO NOTHING;

-- 19. O Captain! My Captain!
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Central idea","definition":"Elegy for Abraham Lincoln. Lincoln guided the USA through the Civil War but was assassinated just as victory was achieved."},{"term":"Extended metaphor","definition":"Ship = USA, Captain = Abraham Lincoln, Port = end of Civil War (victory), Fallen captain = Lincoln''s assassination, Fearful trip = Civil War."},{"term":"Elegy","definition":"Poem mourning death. Tone: grief, admiration, shock, sorrow."},{"term":"Devices","definition":"Extended metaphor. Repetition: ''O Captain! My Captain!''. Apostrophe: addressing dead Lincoln. Exclamation, imperative (''Rise up!'')."},{"term":"Author","definition":"Walt Whitman (1819-1892). American poet. Father of free verse. Wrote Leaves of Grass."}]'::jsonb,
  '[]'::jsonb,
  'Extended metaphor (Captain = Lincoln, Ship = USA) is a sure 3-mark question every year. Walt Whitman as author. Elegy definition. Historical context (Lincoln assassination, Civil War end) is important.',
  ARRAY['Author: Walt Whitman (1819-1892). Father of free verse.','Elegy for Abraham Lincoln — assassinated 1865, end of US Civil War.','Extended metaphor: Captain=Lincoln, Ship=USA, Port=Civil War victory.','Repetition: ''O Captain! My Captain!'' = grief and disbelief.','Apostrophe: addressing dead Lincoln directly.'],
  'Extended metaphor every year 3 marks. Author 1 mark. Appreciation 4-5 marks.',
  '1 mark: Walt Whitman. 2-3 marks: extended metaphor. 4-5 marks: appreciation with elegy, devices, context.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%O Captain%' AND s.id = 'english'
ON CONFLICT (chapter_id) DO NOTHING;

-- 20. Unbeatable Super Mom - Mary Kom
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Mary Kom","definition":"Chungneijang Mary Kom Hmangte. Born 1983, Manipur. 8-time World Amateur Boxing Champion. Olympic bronze 2012 London."},{"term":"Challenges","definition":"Poverty, gender bias (female in male-dominated sport), mother of 3 children (twins + son), limited facilities in Manipur."},{"term":"Theme","definition":"Women can excel in any field. Determination overcomes all obstacles. Symbol of women''s empowerment and national pride."},{"term":"Nicknames","definition":"Magnificent Mary, Superwoman."}]'::jsonb,
  '[]'::jsonb,
  'Factual questions: 8 World titles, Olympic bronze 2012, Manipur. Character sketch: challenges + how she overcame them.',
  ARRAY['Mary Kom: 1983, Manipur. 8-time World Amateur Boxing Champion. Olympic bronze 2012.','Challenges: poverty, gender bias, mother of 3.','Theme: women''s empowerment. Determination conquers all.','Nicknames: Magnificent Mary, Superwoman.'],
  'Character sketch 3-4 marks. Obstacles overcome 2-3 marks. Achievements 1-2 marks.',
  '1-2 marks: achievements. 3-4 marks: character sketch — challenges overcome.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Mary Kom%' AND s.id = 'english'
ON CONFLICT (chapter_id) DO NOTHING;

-- 21. Joan of Arc
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Joan of Arc","definition":"French national heroine and saint (1412-1431). Led French armies against English in Hundred Years'' War. Captured, tried for heresy, burned at stake aged 19."},{"term":"Significance","definition":"Victory at Orleans 1429 — turning point of Hundred Years'' War. Canonised 1920. Courage, patriotism, faith, sacrifice."},{"term":"Character","definition":"Brave, patriotic, devoutly religious, determined, selfless. Young peasant woman who led armies."}]'::jsonb,
  '[]'::jsonb,
  'Factual: French, led armies against English, died 19, burned at stake. Character: courage, patriotism, faith. Being a young woman leading armies = remarkable contrast for full marks.',
  ARRAY['French national heroine (1412-1431). Led armies at 17-18.','Victory at Orleans 1429: turned tide of Hundred Years'' War.','Burned at stake aged 19. Canonised 1920.','Character: brave, patriotic, devout, selfless.'],
  'Character sketch 3-4 marks. Significance 2 marks.',
  '2 marks: significance. 3-4 marks: character sketch.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Joan of Arc%' AND s.id = 'english'
ON CONFLICT (chapter_id) DO NOTHING;

-- 22. A Brave Heart Dedicated to Science and Humanity
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Theme","definition":"Science and humanity are inseparable. True scientists work for betterment of human life. Bravery marks the greatest scientists."},{"term":"Values","definition":"Intellectual courage, humanitarian concern, lifelong dedication, selflessness."}]'::jsonb,
  '[]'::jsonb,
  'Character sketch: intellectual courage, humanitarianism, dedication. Theme: science in service of humanity. Comprehension: answer precisely from text. Vocabulary questions common.',
  ARRAY['Theme: science dedicated to humanity — the two are inseparable.','Character: intellectual courage, humanitarianism, dedication.','Tone: admiring, inspirational.'],
  'Character sketch 3-4 marks. Theme 2 marks. Vocabulary 1 mark.',
  '2 marks: theme. 3-4 marks: character sketch. 1 mark: vocabulary.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%Brave Heart%' AND s.id = 'english'
ON CONFLICT (chapter_id) DO NOTHING;

-- ============================================================================
-- ALGEBRA: Statistics chapter_content (chapter 6)
-- ============================================================================
INSERT INTO chapter_content (chapter_id, key_concepts, formulas, board_tips, important_points, pyq_patterns, marks_breakdown)
SELECT c.id,
  '[{"term":"Mean (grouped data)","definition":"x̄ = Σ(f×x) / Σf where f = frequency, x = class mark (midpoint of class). Set up table: Class | Class mark (x) | f | f×x. Sum the f×x column and divide by Σf."},{"term":"Median (grouped data)","definition":"M = L + [(N/2 - cf) / f] × h. L = lower boundary of median class. N = Σf (total). cf = cumulative frequency before median class. f = frequency of median class. h = class width. First find N/2, then locate median class where N/2 falls in cumulative frequency."},{"term":"Mode (grouped data)","definition":"Mo = L + [(f1 - f0) / (2f1 - f0 - f2)] × h. f1 = modal class frequency. f0 = frequency just before modal class. f2 = frequency just after modal class. Modal class = class with highest frequency."},{"term":"Class mark","definition":"Midpoint of a class interval = (Upper limit + Lower limit) / 2. Always calculate before finding mean."},{"term":"Cumulative frequency","definition":"Running total of frequencies. Used to draw ogive and find median. Less-than type: add frequencies from top down."},{"term":"Ogive","definition":"Cumulative frequency curve. Less-than ogive: plot (upper class boundary, cumulative frequency) for each class. Connect with smooth curve. Greater-than ogive: plot (lower boundary, greater-than cf). Intersection of both ogives gives median."},{"term":"Empirical relation","definition":"Mode = 3 × Median - 2 × Mean. Use when two measures are known and need to find the third."}]'::jsonb,
  '[{"name":"Mean (direct method)","formula":"x̄ = Σ(f×x) / Σf","when_to_use":"Set up table: class mark x = (UL+LL)/2, compute f×x for each class, sum both columns"},{"name":"Mean (assumed mean method)","formula":"x̄ = A + Σ(f×d) / Σf, where d = x - A","when_to_use":"When class marks are large numbers. Choose A = midpoint of central class to reduce arithmetic"},{"name":"Median (grouped)","formula":"M = L + [(N/2 - cf) / f] × h","when_to_use":"Build cumulative frequency table. Find N/2. Locate median class. Substitute L, cf, f, h."},{"name":"Mode (grouped)","formula":"Mo = L + [(f1 - f0) / (2f1 - f0 - f2)] × h","when_to_use":"Identify modal class (highest frequency). Note f0 (class before) and f2 (class after). Substitute."},{"name":"Class mark","formula":"x = (Upper limit + Lower limit) / 2","when_to_use":"Always before calculating mean of grouped data"},{"name":"Empirical relation","formula":"Mode = 3 × Median - 2 × Mean","when_to_use":"When two of the three measures are given and you need to find the third"}]'::jsonb,
  'Most common mistake: confusing median and mode formulas. ALWAYS write the full formula with all variables defined BEFORE substituting. For mean: set up a neat table — Class | Class mark (x) | f | f×x — show Σf and Σ(f×x) clearly. For median: write cumulative frequency table showing cf for each class, identify N/2, state the median class explicitly, then substitute. For ogive: plot upper class boundaries on x-axis, cumulative frequency on y-axis. Mark the median correctly from the ogive. Untidy tables or missing formula lose marks even if the final answer is correct.',
  ARRAY['Three measures: Mean, Median, Mode. All have different formulas for grouped data.','Mean: x̄ = Σ(f×x)/Σf. Set up table with class mark and f×x. Sum both columns.','Median: M = L + [(N/2-cf)/f] × h. Find N/2 in cumulative frequency to locate median class.','Mode: Mo = L + [(f1-f0)/(2f1-f0-f2)] × h. Modal class = highest frequency class.','Ogive: less-than type at upper boundaries. Both ogives intersect at median.','Empirical: Mode = 3 Median - 2 Mean. Use when one measure is unknown.','Class mark = (Upper + Lower) / 2. Calculate this before starting mean calculation.'],
  '2019-2024 pattern: Mean of grouped data (direct method) appears almost every year (4 marks). Median of grouped data (4 marks). Draw less-than ogive and find median from graph (4 marks). Mode of grouped data (2-3 marks). Empirical relationship (1-2 marks).',
  '1 mark: empirical relation formula or define median/mode. 2 marks: find mode OR class mark calculation. 4 marks: find mean from grouped frequency table. 4 marks: find median with cumulative frequency. 4 marks: draw less-than ogive and find median graphically.'
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%statistic%' AND s.id = 'algebra'
ON CONFLICT (chapter_id) DO NOTHING;

-- ============================================================================
-- END OF SYLLABUS CORRECTION PATCH
-- Safe to re-run: DELETEs are targeted by subject_id, INSERTs use ON CONFLICT
-- All chapter names, counts, and content now match official Balbharati 2024-25
-- History: 14 chapters (1-9 Itihas + 10-14 Rajyashastra)
-- Geography: 9 chapters (India AND Brazil comparative)
-- English: 22 chapters (My English Coursebook actual chapter titles)
-- Algebra: 6 chapters (Statistics chapter 6 added)
-- Geometry: 7 chapters (non-existent chapter 8 removed)
-- ============================================================================

-- ============================================================================
-- TABLE: pyqs (DAY 14)
-- Past Year Questions for Maharashtra SSC Class 10.
-- Seeded with real questions from 2019-2024 board papers.
-- Each question is linked to a chapter_id.
-- answer_hint: key points the board model answer includes (not full answer)
-- appeared_count: how many times this question type has appeared
-- ============================================================================

CREATE TABLE IF NOT EXISTS pyqs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id     UUID        NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  subject_id     TEXT        NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  year           INT         NOT NULL CHECK (year BETWEEN 2015 AND 2030),
  marks          INT         NOT NULL CHECK (marks IN (1, 2, 3, 4, 5, 6)),
  question       TEXT        NOT NULL,
  answer_hint    TEXT        NOT NULL DEFAULT '',
  appeared_count INT         NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pyqs_chapter  ON pyqs(chapter_id);
CREATE INDEX IF NOT EXISTS idx_pyqs_subject  ON pyqs(subject_id);
CREATE INDEX IF NOT EXISTS idx_pyqs_year     ON pyqs(year DESC);
CREATE INDEX IF NOT EXISTS idx_pyqs_marks    ON pyqs(marks);

ALTER TABLE pyqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pyqs_authenticated_read"
  ON pyqs FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "pyqs_deny_write"
  ON pyqs FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- SEED: Real Maharashtra SSC PYQs 2019-2024
-- ============================================================================

-- ── ALGEBRA: Quadratic Equations ─────────────────────────────────────────────
INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'algebra', 2023, 2,
  'Find the value of discriminant for the quadratic equation 2x² + 5x - 3 = 0 and state the nature of its roots.',
  'D = b² - 4ac = 25 + 24 = 49. Since D > 0, roots are real and distinct.',
  3
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%quadratic%' AND s.id = 'algebra'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'algebra', 2023, 4,
  'The product of two consecutive even numbers is 288. Find the numbers.',
  'Let numbers be x and x+2. x(x+2) = 288. x²+2x-288=0. Factorize: (x+18)(x-16)=0. x=16. Numbers are 16 and 18.',
  2
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%quadratic%' AND s.id = 'algebra'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'algebra', 2022, 2,
  'For the quadratic equation x² - 4x + k = 0, find the value of k if one root is 1.',
  'Substitute x=1: 1 - 4 + k = 0. k = 3.',
  2
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%quadratic%' AND s.id = 'algebra'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'algebra', 2022, 4,
  'A train travels a distance of 480 km at a uniform speed. If the speed had been 8 km/h less, it would have taken 3 hours more to cover the same distance. Find the speed of the train.',
  'Let speed = x. 480/x - 480/(x-8) = 3. Solve: 480(x-8) - 480x = 3x(x-8). x²-8x-1280=0. x=40. Speed = 40 km/h.',
  3
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%quadratic%' AND s.id = 'algebra'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'algebra', 2021, 2,
  'Find the roots of the quadratic equation 3x² - 5x + 2 = 0 by factorisation.',
  '3x² - 3x - 2x + 2 = 0. 3x(x-1) - 2(x-1) = 0. (3x-2)(x-1) = 0. x = 2/3 or x = 1.',
  2
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%quadratic%' AND s.id = 'algebra'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'algebra', 2020, 2,
  'Write the nature of roots of the quadratic equation 4x² - 12x + 9 = 0.',
  'D = 144 - 144 = 0. Since D = 0, roots are real and equal.',
  3
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%quadratic%' AND s.id = 'algebra'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'algebra', 2019, 4,
  'Sum of the squares of two consecutive natural numbers is 313. Find the numbers.',
  'Let numbers be x and x+1. x² + (x+1)² = 313. 2x²+2x-312=0. x²+x-156=0. (x+13)(x-12)=0. x=12. Numbers: 12, 13.',
  2
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%quadratic%' AND s.id = 'algebra'
ON CONFLICT DO NOTHING;

-- ── ALGEBRA: Arithmetic Progression ──────────────────────────────────────────
INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'algebra', 2023, 2,
  'Find the sum of first 20 terms of the AP: 5, 8, 11, 14, ...',
  'a=5, d=3, n=20. S20 = 20/2 × [2×5 + 19×3] = 10 × [10+57] = 10 × 67 = 670.',
  2
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%arithmetic%' AND s.id = 'algebra'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'algebra', 2022, 2,
  'Which term of the AP 3, 8, 13, 18, ... is 78?',
  'a=3, d=5, tn=78. tn = a+(n-1)d. 78 = 3+(n-1)5. 75=(n-1)5. n-1=15. n=16. The 16th term is 78.',
  2
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%arithmetic%' AND s.id = 'algebra'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'algebra', 2021, 4,
  'If the 3rd and 9th terms of an AP are 4 and -8 respectively, which term of the AP is zero?',
  't3=4: a+2d=4. t9=-8: a+8d=-8. Subtract: 6d=-12, d=-2. a=8. tn=0: 8+(n-1)(-2)=0. n-1=4. n=5. 5th term is 0.',
  2
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%arithmetic%' AND s.id = 'algebra'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'algebra', 2020, 2,
  'The first term of an AP is 5, common difference is 3, and last term is 50. Find the number of terms.',
  'n = (l-a)/d + 1 = (50-5)/3 + 1 = 45/3 + 1 = 15 + 1 = 16 terms.',
  2
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%arithmetic%' AND s.id = 'algebra'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'algebra', 2019, 2,
  'Find the 25th term of the AP: 12, 16, 20, 24, ...',
  'a=12, d=4. t25 = 12 + 24×4 = 12 + 96 = 108.',
  2
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%arithmetic%' AND s.id = 'algebra'
ON CONFLICT DO NOTHING;

-- ── GEOMETRY: Trigonometry ────────────────────────────────────────────────────
INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'geometry', 2023, 4,
  'A ladder 10 m long reaches a window 8 m above the ground. Find the distance of the foot of the ladder from the base of the wall. Also find the angle made by the ladder with the ground.',
  'By Pythagoras: base = √(100-64) = √36 = 6 m. tan θ = 8/6 = 4/3. θ = tan⁻¹(4/3) ≈ 53°.',
  2
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%trigonometry%' AND s.id = 'geometry'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'geometry', 2023, 3,
  'Prove that: (sin θ + cos θ)² + (sin θ - cos θ)² = 2',
  'LHS = sin²θ + 2sinθcosθ + cos²θ + sin²θ - 2sinθcosθ + cos²θ = 2sin²θ + 2cos²θ = 2(sin²θ+cos²θ) = 2×1 = 2 = RHS.',
  3
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%trigonometry%' AND s.id = 'geometry'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'geometry', 2022, 2,
  'If tan θ = 12/5, find the value of sin θ + cos θ.',
  'Opposite=12, Adjacent=5, Hypotenuse=13 (Pythagoras). sin θ = 12/13, cos θ = 5/13. sin θ + cos θ = 17/13.',
  2
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%trigonometry%' AND s.id = 'geometry'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'geometry', 2022, 4,
  'The angle of elevation of the top of a tower from a point on the ground 30 m away from its foot is 60°. Find the height of the tower.',
  'tan 60° = h/30. √3 = h/30. h = 30√3 m ≈ 51.96 m.',
  3
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%trigonometry%' AND s.id = 'geometry'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'geometry', 2021, 3,
  'Prove: (1 + tan²θ) cos²θ = 1',
  'LHS = sec²θ × cos²θ = (1/cos²θ) × cos²θ = 1 = RHS. (Using identity 1+tan²θ = sec²θ).',
  2
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%trigonometry%' AND s.id = 'geometry'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'geometry', 2020, 2,
  'Find the value of: sin²30° + cos²60° + tan²45°',
  'sin²30° = (1/2)² = 1/4. cos²60° = (1/2)² = 1/4. tan²45° = 1² = 1. Total = 1/4 + 1/4 + 1 = 3/2.',
  2
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%trigonometry%' AND s.id = 'geometry'
ON CONFLICT DO NOTHING;

-- ── GEOMETRY: Circle ─────────────────────────────────────────────────────────
INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'geometry', 2023, 4,
  'Prove that the tangent at any point of a circle is perpendicular to the radius through the point of contact.',
  'Draw circle, tangent at P, radius OP. Assume tangent not perpendicular — a shorter distance OQ exists from O to tangent. But OQ < OP = radius, so Q is inside circle — contradiction. Hence OP ⊥ tangent.',
  4
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%circle%' AND s.id = 'geometry'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'geometry', 2022, 3,
  'Two tangents TP and TQ are drawn to a circle with centre O from an external point T. Prove that ∠PTQ + ∠POQ = 180°.',
  'In quadrilateral OPTQ: ∠OPT = ∠OQT = 90° (radius⊥tangent). Sum of angles = 360°. So ∠PTQ + ∠POQ = 360° - 180° = 180°.',
  3
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%circle%' AND s.id = 'geometry'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'geometry', 2021, 2,
  'A tangent PQ at a point P of a circle of radius 5 cm meets a line through the centre O at Q so that OQ = 13 cm. Find the length of PQ.',
  'OQ² = OP² + PQ² (tangent⊥radius). 169 = 25 + PQ². PQ² = 144. PQ = 12 cm.',
  3
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%circle%' AND s.id = 'geometry'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'geometry', 2020, 2,
  'In a circle with centre O, chord AB subtends an angle of 60° at the centre. If OA = 7 cm, find the length of chord AB.',
  'Triangle OAB is equilateral (OA=OB=radius, ∠AOB=60°). Therefore AB = OA = 7 cm.',
  2
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%circle%' AND s.id = 'geometry'
ON CONFLICT DO NOTHING;

-- ── SCIENCE PART 1: Gravitation ───────────────────────────────────────────────
INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'science1', 2023, 2,
  'State the Universal Law of Gravitation and write its formula.',
  'Every object attracts every other object with a force directly proportional to product of masses and inversely proportional to square of distance between them. F = GMm/r².',
  5
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%gravitation%' AND s.id = 'science1'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'science1', 2023, 3,
  'Calculate the gravitational force of attraction between two objects of masses 50 kg and 80 kg separated by a distance of 2 m. (G = 6.67 × 10⁻¹¹ N m² kg⁻²)',
  'F = GMm/r² = (6.67×10⁻¹¹ × 50 × 80) / 4 = (6.67×10⁻¹¹ × 4000) / 4 = 6.67×10⁻⁸ N.',
  2
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%gravitation%' AND s.id = 'science1'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'science1', 2022, 2,
  'Distinguish between G and g.',
  'G: universal gravitational constant, G = 6.67×10⁻¹¹ Nm²kg⁻², same everywhere. g: acceleration due to gravity, g = 9.8 m/s² on Earth surface, varies with location.',
  4
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%gravitation%' AND s.id = 'science1'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'science1', 2021, 3,
  'A stone is dropped from the top of a building 78.4 m high. How long will it take to reach the ground? (g = 9.8 m/s²)',
  's = ut + ½gt². 78.4 = 0 + ½×9.8×t². t² = 78.4/4.9 = 16. t = 4 seconds.',
  2
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%gravitation%' AND s.id = 'science1'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'science1', 2020, 2,
  'What is escape velocity? State its value for the Earth.',
  'Escape velocity is the minimum velocity needed for an object to escape Earth''s gravitational field. For Earth: ve = √(2gR) = 11.2 km/s.',
  3
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%gravitation%' AND s.id = 'science1'
ON CONFLICT DO NOTHING;

-- ── SCIENCE PART 1: Effects of Electric Current ───────────────────────────────
INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'science1', 2023, 4,
  'Three resistors of 3Ω, 6Ω, and 9Ω are connected in parallel. Find the equivalent resistance. If this combination is connected to a 9V battery, find the current through each resistor.',
  '1/Rp = 1/3+1/6+1/9 = 6/18+3/18+2/18 = 11/18. Rp = 18/11 Ω. I₁=9/3=3A, I₂=9/6=1.5A, I₃=9/9=1A.',
  3
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%electric current%' AND s.id = 'science1'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'science1', 2022, 2,
  'State Ohm''s Law. Write the formula.',
  'At constant temperature, the current through a conductor is directly proportional to the potential difference across its ends. V = IR.',
  5
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%electric current%' AND s.id = 'science1'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'science1', 2022, 4,
  'An electric iron of resistance 40Ω is operated at 220V for 30 minutes. Calculate the electrical energy consumed in kWh.',
  'I = V/R = 220/40 = 5.5A. P = VI = 220×5.5 = 1210W = 1.21 kW. E = Pt = 1.21×0.5 = 0.605 kWh.',
  2
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%electric current%' AND s.id = 'science1'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'science1', 2021, 2,
  'Two resistors of 4Ω and 6Ω are connected in series to a battery of 10V. Find the current in the circuit.',
  'Rs = 4+6 = 10Ω. I = V/R = 10/10 = 1A.',
  2
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%electric current%' AND s.id = 'science1'
ON CONFLICT DO NOTHING;

-- ── SCIENCE PART 2: Heredity and Evolution ───────────────────────────────────
INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'science2', 2023, 3,
  'In garden pea plants, tall (T) is dominant over dwarf (t). A tall plant (Tt) is crossed with a dwarf plant (tt). Draw the Punnett square and state the phenotype ratio of the offspring.',
  'Punnett square: Tt × tt gives Tt, Tt, tt, tt. Phenotype ratio: 1 Tall : 1 Dwarf (50% tall, 50% dwarf).',
  4
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%heredity%' AND s.id = 'science2'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'science2', 2023, 2,
  'State Mendel''s Law of Segregation.',
  'During gamete formation, the two alleles of a gene pair segregate (separate) from each other so that each gamete receives only one allele.',
  4
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%heredity%' AND s.id = 'science2'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'science2', 2022, 3,
  'In Mendel''s experiment with pea plants, he crossed plants with round seeds (RR) with plants with wrinkled seeds (rr). What would be the phenotype and genotype of F1 and F2 generation?',
  'F1: all Rr (round seeds — dominant). F2 Punnett square RR:Rr:rr = 1:2:1. Phenotype: 3 round : 1 wrinkled.',
  3
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%heredity%' AND s.id = 'science2'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'science2', 2021, 2,
  'Distinguish between inherited and acquired characters with one example each.',
  'Inherited: passed from parent to offspring through genes. Example: eye colour, blood group. Acquired: developed during lifetime, not passed to offspring. Example: muscles built by exercise, scar.',
  3
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%heredity%' AND s.id = 'science2'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'science2', 2020, 2,
  'Compare the theory of evolution of Darwin and Lamarck.',
  'Lamarck: acquired characters are inherited (use and disuse). Darwin: natural selection — variations suited to environment survive and reproduce more. Darwin''s theory is accepted; Lamarck''s is rejected.',
  4
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%heredity%' AND s.id = 'science2'
ON CONFLICT DO NOTHING;

-- ── ENGLISH: Stopping by Woods on a Snowy Evening ────────────────────────────
INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'english', 2023, 2,
  'Explain the line: "And miles to go before I sleep" from the poem "Stopping by Woods on a Snowy Evening".',
  'The speaker has many responsibilities and duties to fulfil before he can rest. Symbolically, there is much work remaining in life before death. The repetition emphasises the weight of these duties.',
  4
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%stopping by woods%' AND s.id = 'english'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'english', 2022, 2,
  'What do the dark woods symbolise in "Stopping by Woods on a Snowy Evening"?',
  'The dark, deep woods symbolise temptation — the desire to escape from duties and rest. They also represent death or the unconscious wish to stop and forget one''s responsibilities.',
  3
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%stopping by woods%' AND s.id = 'english'
ON CONFLICT DO NOTHING;

-- ── ENGLISH: If... ────────────────────────────────────────────────────────────
INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'english', 2023, 2,
  'What does Kipling mean by "If you can meet with Triumph and Disaster / And treat those two impostors just the same"?',
  'Both success (Triumph) and failure (Disaster) are called impostors because they are temporary and not permanent states. One should not be too elated by success or too crushed by failure — maintain equanimity in both.',
  5
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name = 'If...' AND s.id = 'english'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'english', 2022, 3,
  'List any three qualities that Kipling advises his son to develop in the poem "If...".',
  'Keep calm when others lose their heads. Trust yourself when others doubt. Wait without being tired of waiting. Be honest without dealing in lies. Dream but not be enslaved by dreams. (Any 3 correct qualities with brief explanation.)',
  4
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name = 'If...' AND s.id = 'english'
ON CONFLICT DO NOTHING;

-- ── ENGLISH: His First Flight ─────────────────────────────────────────────────
INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'english', 2023, 4,
  'Write a character sketch of the young seagull in the story "His First Flight".',
  'Initially timid and cowardly — afraid to fly while siblings flew easily. Lonely and hungry after family left ledge. Driven by hunger when mother offered food. Discovered flying ability once airborne. Transformed from fearful to confident. Represents anyone who overcomes fear through necessity.',
  4
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%first flight%' AND s.id = 'english'
ON CONFLICT DO NOTHING;

INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'english', 2022, 2,
  'What is the message/moral of the story "His First Flight"?',
  'Fear is the only obstacle between us and our goals. Once we take the first brave step, we discover abilities we never knew we had. Failure to try is the real failure. Necessity and hunger (motivation) can overcome any fear.',
  3
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%first flight%' AND s.id = 'english'
ON CONFLICT DO NOTHING;

-- ── ENGLISH: Bholi ────────────────────────────────────────────────────────────
INSERT INTO pyqs (chapter_id, subject_id, year, marks, question, answer_hint, appeared_count)
SELECT c.id, 'english', 2023, 4,
  'How did education bring about a change in Bholi''s personality? Explain with reference to the story.',
  'Before education: stammered, dull, afraid, ignored by family. Teacher encouraged her, gave books, recognised her potential. Education gave her: confidence to speak, knowledge, self-respect. Climax: refused greedy Bishamber, stood up for herself — complete transformation through education.',
  4
FROM chapters c JOIN subjects s ON c.subject_id = s.id
WHERE c.name ILIKE '%bholi%' AND s.id = 'english'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- END OF DAY 14 PYQ SEED DATA
-- Verification query:
-- SELECT s.name, COUNT(*) as pyqs_seeded
-- FROM pyqs p
-- JOIN chapters c ON c.id = p.chapter_id
-- JOIN subjects s ON s.id = c.subject_id
-- GROUP BY s.name ORDER BY s.name;
-- ============================================================================
