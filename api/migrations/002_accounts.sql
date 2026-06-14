-- Migraatio 002 — Tilit, lasketut saldot, palkka-asetukset, double-counting-korjaus
-- Aja olemassa olevaan kantaan:
--   cd api && wrangler d1 execute oma-talous-db --remote --file=migrations/002_accounts.sql
--
-- HUOM: rivi "ALTER TABLE ... ADD COLUMN account" antaa virheen jos sarake on jo
-- olemassa. Jos näin käy, kommentoi se rivi pois ja aja loput uudelleen.

-- 1. Tili-sarake tapahtumiin
ALTER TABLE transactions ADD COLUMN account TEXT;
CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account);

-- 2. Tilit + alkusaldot (14.6.2026, Revolut 26.4.2026)
CREATE TABLE IF NOT EXISTS accounts (
  key             TEXT PRIMARY KEY,
  label           TEXT NOT NULL,
  kind            TEXT NOT NULL,
  opening_balance REAL NOT NULL DEFAULT 0,
  opening_date    TEXT NOT NULL,
  credit_limit    REAL,
  apr             REAL,
  sort            INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO accounts (key,label,kind,opening_balance,opening_date,credit_limit,apr,sort) VALUES
  ('Perus',   'OP Perustili',   'checking',   826.20, '2026-06-14', NULL,   NULL,   1),
  ('Saasto',  'OP Säästötili',  'savings',  13601.21, '2026-06-14', NULL,   NULL,   2),
  ('Lipas',   'OP Säästölipas', 'savings',   6009.04, '2026-06-14', NULL,   NULL,   3),
  ('OPCredit','OP Visa Credit', 'credit',   -2482.23, '2026-06-14', 8000.0, 11.054, 4),
  ('Finnair', 'Finnair Visa',   'credit',   -4921.92, '2026-06-14', 8000.0, 15.51,  5),
  ('Revolut', 'Revolut',        'checking',     0.00, '2026-04-26', NULL,   NULL,   6);

-- 3. Backfill: kohdista olemassa olevat tapahtumat tilille source-kentästä
UPDATE transactions SET account = 'Finnair'
  WHERE account IS NULL AND (lower(source) LIKE '%finnair%');
UPDATE transactions SET account = 'Revolut'
  WHERE account IS NULL AND (lower(source) LIKE '%revolut%');
UPDATE transactions SET account = 'Perus'
  WHERE account IS NULL;

-- 4. Palkka-asetukset
UPDATE settings SET value = '27' WHERE key = 'salary_day';
INSERT OR IGNORE INTO settings (key,value) VALUES ('salary_day', '27');
INSERT OR IGNORE INTO settings (key,value) VALUES ('monthly_salary', '3267');

-- 5. Double-counting-korjaus: luottokortin laskun maksu = tilisiirto (neutral), ei meno
UPDATE transactions
  SET type = 'neutral', cat = 'MobilePay & siirrot'
  WHERE lower(payee || ' ' || selitys || ' ' || viesti) LIKE '%visa credit suoritus%';
