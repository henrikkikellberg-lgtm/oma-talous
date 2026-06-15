-- Migraatio 003 — Kulutusluotot ja osamaksut
-- Aja: cd api && wrangler d1 execute oma-talous-db --remote --file=migrations/003_loans.sql

CREATE TABLE IF NOT EXISTS loans (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  balance         REAL NOT NULL DEFAULT 0,
  monthly_payment REAL NOT NULL DEFAULT 0,
  end_month       TEXT,                       -- 'YYYY-MM', NULL jos avointa
  apr             REAL,                       -- vuosikorko-% (valinnainen)
  included_in_tx  INTEGER NOT NULL DEFAULT 0, -- 1 = sisältyy jo kuluihin (piilo-osamaksu)
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- monthly_target luottokortille (tavoitelyhennys) — lisätään accounts-tauluun
ALTER TABLE accounts ADD COLUMN monthly_target REAL;
