-- Vuokratilin tapahtumien kohdistus asuntoon (v1.15.0).
--
-- property_id viittaa Tuottokartan kayttaja_asunnot.id:hen (a1/a2/a3), joka on
-- asuntojen master-data kaikille kolmelle sovellukselle (Tuottokartta, Oma-talous,
-- Fund-tracker). Oma-talous ei kopioi asuntojen tietoja, se vain kohdistaa
-- tiliotteen toteuman oikeaan asuntoon.
--   a1 = Riistakatu 15 B 17, Iisalmi   (vastikeviite 15012193 / vanha 31016...)
--   a2 = Riistakatu 15 B 10, Iisalmi   (vastikeviite 15012122 / vanha 91016..., laina FI58…7751 31)
--   a3 = Niiralankatu 19 B 37, Kuopio  (As Oy Kuopion Turontähti, laina FI89…9007 70 ← FI11 ← FI03)
-- NULL = yleinen / kohdistamaton (esim. asunnon osto ennen kohdistusta, yleiset kulut).
-- HUOM: Tuottokartan osoitekentät (Riistakatu 15 A 17/A 10, Niiralankatu 17 A 28) ovat
-- virheelliset, mutta Fund-trackerin rental_snapshots on avainnettu osoitteella —
-- osoitteen korjaus katkaisisi sen sarjan, joten sitä ei muutettu tässä.

ALTER TABLE transactions ADD COLUMN property_id TEXT;
CREATE INDEX IF NOT EXISTS idx_tx_account_property ON transactions(account, property_id);
