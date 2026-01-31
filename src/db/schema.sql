PRAGMA foreign_keys = ON;

-- Words
CREATE TABLE IF NOT EXISTS word_entries (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  meaning_tr TEXT NOT NULL,
  meaning_en TEXT,
  example_en TEXT,
  part_of_speech TEXT,
  level INTEGER,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- SRS state (1 row per word)
CREATE TABLE IF NOT EXISTS srs_state (
  word_entry_id TEXT PRIMARY KEY,
  ease REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  due_at INTEGER NOT NULL,
  lapses INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at INTEGER,
  FOREIGN KEY(word_entry_id) REFERENCES word_entries(id) ON DELETE CASCADE
);

-- Review log (history)
CREATE TABLE IF NOT EXISTS review_log (
  id TEXT PRIMARY KEY,
  word_entry_id TEXT NOT NULL,
  direction TEXT NOT NULL,
  grade INTEGER NOT NULL,
  reviewed_at INTEGER NOT NULL,
  FOREIGN KEY(word_entry_id) REFERENCES word_entries(id) ON DELETE CASCADE
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_word_entries_updated_at ON word_entries(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_word_entries_term ON word_entries(term);
CREATE INDEX IF NOT EXISTS idx_word_entries_meaning_tr ON word_entries(meaning_tr);
CREATE INDEX IF NOT EXISTS idx_srs_due_at ON srs_state(due_at);
CREATE INDEX IF NOT EXISTS idx_review_log_word ON review_log(word_entry_id);
CREATE INDEX IF NOT EXISTS idx_review_log_time ON review_log(reviewed_at DESC);

-- 🚫 prevent duplicate terms
CREATE UNIQUE INDEX IF NOT EXISTS uniq_word_term
ON word_entries(term);