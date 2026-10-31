-- Migraatio 010 — Tilin hold-tila (v1.24.0)
--
-- Hold = tili/kortti ei ole aktiivikäytössä → ei tuoreusvaroitusta eikä
-- tuontimuistutusta. Saldo ja velka näkyvät edelleen normaalisti.
-- Ero kind='closed':iin: lopetettu tili ei enää ole olemassa, holdissa oleva on
-- (esim. luottokortti jota lyhennetään mutta jolla ei osteta).
--
-- Aja kerran:
--   cd api && wrangler d1 execute oma-talous-db --remote --file=migrations/010_account_hold.sql
-- ALTER kaatuu duplicate columniin jos ajetaan uudelleen.

ALTER TABLE accounts ADD COLUMN on_hold       INTEGER NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN on_hold_since TEXT;

-- 31.10.2026: OP Visa Creditillä ei ostoja elokuun jälkeen (vain korko + suoritukset),
-- Finnair Visa nollattu.
UPDATE accounts SET on_hold = 1, on_hold_since = '2026-10-31' WHERE key IN ('OPCredit','Finnair');
