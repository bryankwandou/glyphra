-- Glyphra: accounts, quiz policy, and results.
--
-- What is deliberately NOT in here: the quizzes themselves. A join code still
-- carries its own quiz in forty bits, so a code with no row in this database is
-- a perfectly valid open quiz. That keeps every link already handed out working
-- unchanged, and it means losing this database costs the results and the access
-- rules but never a single question.
--
-- The database governs access to quizzes. It does not store them.

CREATE TABLE IF NOT EXISTS accounts (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL,
  -- Lower-cased at write time. Two people signing up as Ana@x and ana@X are one
  -- person, and finding that out after they have both made quizzes is worse.
  email_key     TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Access rules and ownership for a quiz code. Created only when someone signs
-- in and claims a code; anonymous codes stay open and unrecorded.
CREATE TABLE IF NOT EXISTS quizzes (
  code        TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title       TEXT,
  -- 'open'          anyone with the code, unlimited attempts
  -- 'first_correct' closes the moment somebody scores full marks
  -- 'host_only'     only the signed-in owner may attempt it
  mode        TEXT NOT NULL DEFAULT 'open'
                CHECK (mode IN ('open', 'first_correct', 'host_only')),
  closed_at   TIMESTAMPTZ,
  -- Who closed it, so the owner can tell "somebody solved it" from "I closed it".
  closed_by   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quizzes_owner_idx ON quizzes (owner_id, created_at DESC);

-- One row per submitted attempt. This is the gradebook the assessment papers
-- could never produce, and the reason results stop being invisible.
CREATE TABLE IF NOT EXISTS attempts (
  id           BIGSERIAL PRIMARY KEY,
  quiz_code    TEXT NOT NULL,
  participant  TEXT NOT NULL,
  score        INTEGER NOT NULL,
  correct      INTEGER NOT NULL,
  total        INTEGER NOT NULL,
  -- Stored rather than derived. The closing rule depends on it, and a rule that
  -- recomputes itself from two other columns is a rule that can disagree with
  -- the row it closed on.
  perfect      BOOLEAN NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attempts_quiz_idx ON attempts (quiz_code, submitted_at DESC);

-- One code, one problem, one named technique.
--
-- Separate from `quizzes` because the questions are different objects: a quiz
-- code carries a set, a problem code carries exactly one and the method it must
-- use. Sharing a table would have meant a `kind` column and a mode that means
-- something different depending on it, which is how a schema starts lying.
--
-- The technique is recorded here as well as inside the code. That is deliberate
-- duplication: the code is the authority, and this column exists so the owner's
-- history can be listed and filtered without decoding ninety codes to do it.
-- verify:problems checks the two never disagree.
CREATE TABLE IF NOT EXISTS problems (
  code         TEXT PRIMARY KEY,
  owner_id     TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  technique_id TEXT NOT NULL,
  label        TEXT,
  -- Whether the key is shown. Mechanism practice or cryptanalysis; the same
  -- distinction beginner mode draws.
  disclose     BOOLEAN NOT NULL DEFAULT false,
  -- Set by whoever answers correctly first. Null means still open, which is the
  -- state the owner's list shows as running.
  solved_at    TIMESTAMPTZ,
  solved_by    TEXT,
  attempts     INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS problems_owner_idx ON problems (owner_id, created_at DESC);

-- A manually composed quiz: the method for each question, in order.
--
-- This is the one thing here that genuinely cannot be stateless, and the trade
-- is worth stating rather than hiding. A band quiz packs its whole
-- configuration into forty bits, so its code works forever with nothing stored.
-- An arrangement of, say, ten named methods needs seventy bits for the methods
-- alone; it will not fit in a code somebody can read off a projector. So a
-- composed quiz keeps its arrangement here and its code points at this row.
--
-- What that costs: a composed quiz stops working if this table is lost, where a
-- band quiz would not. Anyone who needs a code that outlives the database
-- should use a band quiz, and the interface says so at the point of choosing.
CREATE TABLE IF NOT EXISTS quiz_plans (
  code        TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  -- Ordered. Position in the array is question number minus one.
  techniques  TEXT[] NOT NULL,
  seed        INTEGER NOT NULL,
  -- Shuffle the order for each participant, the way a paper-based exam varies
  -- its question order to make copying from a neighbour useless.
  shuffle     BOOLEAN NOT NULL DEFAULT false,
  disclose    BOOLEAN NOT NULL DEFAULT false,
  minutes     INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quiz_plans_owner_idx ON quiz_plans (owner_id, created_at DESC);
