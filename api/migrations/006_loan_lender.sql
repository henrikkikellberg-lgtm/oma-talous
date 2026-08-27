-- 006_loan_lender.sql — erämaksujen ryhmittely rahoittajan mukaan
-- Aja: wrangler d1 execute oma-talous-db --remote --file=migrations/006_loan_lender.sql
--
-- Elisan lasku on yksi lasku ja yksi eräpäivä, mutta neljä erillistä
-- luottokauppasopimusta. Ilman ryhmittelyä ne näkyvät neljänä irrallisena
-- rivinä eikä yhteissummaa (3 735,56 € / 180,33 €/kk) näe mistään — vaikka
-- juuri se on se luku joka lähtee tililtä kerran kuussa.

ALTER TABLE loans ADD COLUMN lender TEXT;

-- note-kenttä oli käyttöliittymässä (loanNote) mutta puuttui taulusta kokonaan:
-- muistiinpano ei ole koskaan tallentunut mihinkään. Lisätään nyt.
ALTER TABLE loans ADD COLUMN note TEXT;

UPDATE loans SET lender = 'Elisa' WHERE name IN
  ('iPhone-erämaksu','Huawei mesh-reititin','Roborock Qvero Edge 2 Pro robotti-imuri','MacBook Pro M5 Pro');
