-- Tuonnin tuoreusseuranta tilikohtaisesti.
--
-- Ongelma: tilin "tuoreutta" ei voi päätellä MAX(transactions.date):sta. Tili jolla
-- ei yksinkertaisesti ole ollut tapahtumia (Revolut, säästötili) näyttää täsmälleen
-- samalta kuin tili jonka tiliotetta ei ole tuotu kuukauteen. Ensimmäinen on kunnossa,
-- toinen tarkoittaa että kaikki analyysi on hiljaa väärin.
--
-- last_import_at      = milloin tämän tilin tiliote viimeksi tuotiin (ISO timestamp).
--                       Päivittyy VAIKKA tiedostossa ei olisi yhtään uutta riviä —
--                       juuri se on tapaus jonka takia tämä sarake on olemassa.
-- last_import_through = tuodun aineiston viimeisin tapahtumapäivä. Ei koskaan taaksepäin.

ALTER TABLE accounts ADD COLUMN last_import_at      TEXT;
ALTER TABLE accounts ADD COLUMN last_import_through TEXT;
