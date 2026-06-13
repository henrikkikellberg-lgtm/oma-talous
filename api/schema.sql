-- Oma talous — D1 schema
-- Aja: wrangler d1 execute oma-talous-db --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS transactions (
  id          TEXT PRIMARY KEY,
  date        TEXT NOT NULL,
  payee       TEXT NOT NULL DEFAULT '',
  selitys     TEXT NOT NULL DEFAULT '',
  viesti      TEXT NOT NULL DEFAULT '',
  amount      REAL NOT NULL,
  cat         TEXT,
  type        TEXT,
  source      TEXT NOT NULL DEFAULT 'manual',
  month       TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tx_month  ON transactions(month);
CREATE INDEX IF NOT EXISTS idx_tx_date   ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_tx_type   ON transactions(type);

CREATE TABLE IF NOT EXISTS rules (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kw          TEXT NOT NULL,
  cat         TEXT NOT NULL,
  type        TEXT NOT NULL,
  priority    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('salary_day', '25');

CREATE TABLE IF NOT EXISTS receipts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT REFERENCES transactions(id),
  r2_key         TEXT,
  parsed_json    TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
