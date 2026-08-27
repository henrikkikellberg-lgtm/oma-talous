-- 005_budgets.sql — kategoriabudjetit palkkajaksoittain
-- Aja: wrangler d1 execute oma-talous-db --remote --file=migrations/005_budgets.sql
--
-- Suunnitteluperuste: raja on harvoin yhtä kategoriaa kohti. Ulkona syöminen
-- hajautuu viiteen kategoriaan (Ravintolat, Baarit, Kahvilat, Lounas, Alkoholi),
-- ja jos jokaisella on oma raja, ne kiertää vaihtamalla kategoriaa. Siksi
-- budjetti kohdistuu kategoriaJOUKKOON, ei yhteen kategoriaan.
--
-- Toteuma lasketaan aina tapahtumista lennossa — ei erillistä toteumataulua,
-- jota pitäisi pitää synkassa. Rollover (ylityksen siirto) johdetaan samalla
-- tavalla edellisen jakson tapahtumista.

CREATE TABLE IF NOT EXISTS budgets (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  cats       TEXT NOT NULL,                    -- JSON-taulukko kategorianimiä
  limit_eur  REAL NOT NULL,
  period     TEXT NOT NULL DEFAULT 'salary',   -- salary | month
  rollover   INTEGER NOT NULL DEFAULT 0,       -- 1 = ylitys vähennetään seuraavan jakson rajasta
  sort       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

-- Aloitusbudjetti analyysistä 27.8.2026 (jakso 27.7.–26.8.: toteuma 907,06 €).
-- 550 € on jakson 27.6.–26.7. toteuma — raja jonka on jo kerran alittanut.
INSERT OR IGNORE INTO budgets (id,label,cats,limit_eur,period,rollover,sort) VALUES
  ('ulkona','Ulkona syöminen ja juominen',
   '["Ravintolat","Baarit","Kahvilat","Lounas","Alkoholi"]',
   550.0,'salary',1,1);
