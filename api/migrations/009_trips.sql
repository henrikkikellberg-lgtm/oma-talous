-- Matkat (v1.21.0).
--
-- Matka kokoaa yhteen tapahtumat jotka kuuluvat samaan reissuun, myös ennen
-- matkaa maksetut (lennot helmikuussa, majoitus syyskuussa). Kohdistus on
-- erillinen kenttä eikä kategoria, jotta budjetit ja NWS-jakauma pysyvät
-- ennallaan: sama rivi on budjetissa "Ravintolat" ja matkalla "Ruoka".
--
--   transactions.trip_id     → trips.id (NULL = ei kuulu matkaan)
--   transactions.trip_group  → matkan sisäinen ryhmä (lennot, majoitus, auto,
--                              liikkuminen, ruoka, tekeminen, ostokset, muut).
--                              NULL = arvataan kategoriasta/maksunsaajasta.
--   transactions.share_group → yhteiskulun tunniste matkan sisällä. Samalla
--                              tunnisteella olevat ostot (−) ja takaisinmaksut (+)
--                              netotetaan: Hertz 317,70 − 240 = oma osuus 77,70.
--
-- trip_items = matkan rivit joita ei ole millään tilillä (käteinen). Ne eivät
-- vaikuta saldoihin eivätkä budjetteihin — vain matkasivun summiin.

CREATE TABLE IF NOT EXISTS trips (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  start_date  TEXT NOT NULL,
  end_date    TEXT NOT NULL,
  note        TEXT,
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trip_items (
  id          TEXT PRIMARY KEY,
  trip_id     TEXT NOT NULL,
  date        TEXT NOT NULL,
  label       TEXT NOT NULL,
  amount      REAL NOT NULL,
  trip_group  TEXT,
  share_group TEXT,
  note        TEXT,
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_trip_items_trip ON trip_items(trip_id);

ALTER TABLE transactions ADD COLUMN trip_id TEXT;
ALTER TABLE transactions ADD COLUMN trip_group TEXT;
ALTER TABLE transactions ADD COLUMN share_group TEXT;
CREATE INDEX IF NOT EXISTS idx_tx_trip ON transactions(trip_id);
