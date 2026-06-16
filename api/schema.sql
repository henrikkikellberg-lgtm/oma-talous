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
  account     TEXT,                          -- tili jolla maksettu: Perus|Saasto|Lipas|OPCredit|Finnair|Revolut
  month       TEXT NOT NULL,
  splits      TEXT,                          -- JSON [{label,cat,type,amount}] jos tapahtuma jaettu useaan kategoriaan
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tx_month   ON transactions(month);
CREATE INDEX IF NOT EXISTS idx_tx_date    ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_tx_type    ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account);

-- ── TILIT (lasketut saldot) ─────────────────────────────────────────────────
-- balance = opening_balance + Σ(tilin tapahtumat joiden date > opening_date)
CREATE TABLE IF NOT EXISTS accounts (
  key             TEXT PRIMARY KEY,          -- Perus, Saasto, Lipas, OPCredit, Finnair, Revolut
  label           TEXT NOT NULL,
  kind            TEXT NOT NULL,             -- checking | savings | credit
  opening_balance REAL NOT NULL DEFAULT 0,
  opening_date    TEXT NOT NULL,
  credit_limit    REAL,                      -- vain credit
  apr             REAL,                      -- vuosikorko-% (vain credit), korkoennustetta varten
  sort            INTEGER NOT NULL DEFAULT 0
);

-- Alkusaldot tilanteena 14.6.2026 (Revolut 26.4.2026)
INSERT OR IGNORE INTO accounts (key,label,kind,opening_balance,opening_date,credit_limit,apr,sort) VALUES
  ('Perus',   'OP Perustili',       'checking',   826.20, '2026-06-14', NULL,   NULL,   1),
  ('Saasto',  'OP Säästötili',      'savings',  13601.21, '2026-06-14', NULL,   NULL,   2),
  ('Lipas',   'OP Säästölipas',     'savings',   6009.04, '2026-06-14', NULL,   NULL,   3),
  ('OPCredit','OP Visa Credit',     'credit',   -2482.23, '2026-06-14', 8000.0, 11.054, 4),
  ('Finnair', 'Finnair Visa',       'credit',   -4921.92, '2026-06-14', 8000.0, 15.51,  5),
  ('Revolut', 'Revolut',            'checking',     0.00, '2026-04-26', NULL,   NULL,   6);

CREATE TABLE IF NOT EXISTS rules (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kw          TEXT NOT NULL,
  cat         TEXT NOT NULL,
  type        TEXT NOT NULL,
  priority    INTEGER NOT NULL DEFAULT 0,
  splits      TEXT,                          -- JSON [{label,cat,type,pct}] jos toistuva jako tallennettu
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('salary_day', '27');
INSERT OR IGNORE INTO settings (key, value) VALUES ('monthly_salary', '3267');

CREATE TABLE IF NOT EXISTS receipts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT REFERENCES transactions(id),
  r2_key         TEXT,
  parsed_json    TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
