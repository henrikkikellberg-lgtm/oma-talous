# oma-talous-mail

Email Worker: tiliotteet sähköpostilla → `oma-talous-db` (D1). Ei Macia, ei Gmailia välissä.

## Käyttö
iPhone: OP-sovellus → tiliote PDF → Jaa → Mail → `tiliote@fuseapt.com`.
Revolut: tiliote CSV (koko vuoden "consolidated statement" käy) → sama osoite.
Vastauksena tulee kuittaus: lisätyt rivit / tuplat / saldotäsmäytys.

## Toiminta
1. Cloudflare Email Routing: `tiliote@fuseapt.com` → Worker `oma-talous-mail`.
2. Hyväksytään vain `ALLOWED_SENDERS` (wrangler.toml) ja hylätään DMARC-failit.
3. Liitteet:
   - **OP PDF** (`src/op-pdf.js`): unpdf lukee tekstin koordinaatteineen, sarakkeet
     erotellaan otsikkorivin x-paikoista, sivunvaihdot yhdistetään. Arkistointitunnus
     `202611165SIJ00051934` → `20261116/5SIJ00/051934` (= OP CSV:n muoto ja kannan id).
     Alkusaldo + tapahtumat **täytyy** täsmätä loppusaldoon, muuten ei tuoda.
     Tuloksena OP:n CSV-muotoinen teksti.
   - **Revolut / Finnair CSV**: välitetään sellaisenaan.
4. Tuonti `oma-talous-api`:n `POST /import/csv` kautta (service binding `API`, Bearer
   `APP_SECRET`) → sama tuplien karsinta (id, pvm+summa, manuaaliset rivit), OSTOPVM ja
   rules-luokittelu kuin sovelluksen CSV-tuonnissa. API:a ei muutettu.

## Tilikartta
IBAN → accounts.key: oletukset `src/index.js` (Perus, Lipas, Saasto). Lisää muut ilman
deployta: settings-avain `import_ibans`, esim. `{"FI..": "Vuokra"}`.

## Huomiot
- `/import/csv` tunnistaa Revolut-tiedoston merkkijonosta "Revolut"; OP-CSV:ssä se
  neutraloidaan (`REVOLUT`), ettei OP-rivi mene Revolut-parseriin.
- Manuaalisesti kirjattu rivi (sama tili+pvm+summa) estää pankkirivin – kuten CSV:ssä.
- Ei tekoälyä: PDF on tekstipohjainen (StreamServe). Jos OP muuttaa pohjaa, saldotarkistus
  pysäyttää tuonnin ja kuittaus kertoo sen.
- Lokit: `npm run tail`. Parserin testi: `npm test -- "/polku/tiliote.pdf"`.

## Palkkajaksoraportti (v1.27.0) — `src/report.js`
- Jokaisen onnistuneen tuonnin (✓) jälkeen tarkistetaan tuoreus: aktiiviset tilit (ei `closed`,
  ei `rental`, ei `on_hold`) ja `last_import_through` ≤ 5 pv (`FRESH_DAYS`). Kaikki tuoreita →
  kuittaukseen liitetään raportti, muuten lista puuttuvista otteista.
- Aihe **"raportti"** (ilman liitteitä) → raportti aina, tuoreusvaroituksin.
- Laskenta peilaa frontendiä: jakso = `effectivePayday` (salary_day, viikonloppu/kiinteä pyhä →
  edellinen pankkipäivä), splitit puretaan (`expandTx`), saman tyypin plusrivit netotetaan,
  sijoitukset = kategoria `Sijoittaminen` tyypistä riippumatta (tuloista = vain `checking`-tileiltä),
  luottovelan muutos saldoista, vuokratili pois. Käteistalletuksista vain neutraali osa.
- Poikkeamat: kulutus säästötileiltä, ostot holdissa olevalla kortilla (korko/tilinhoito ei),
  harkinnanvarainen laskutililtä (split-malli), `flag`-rivit.
- Ennuste: muuttuvien menojen (ei `FIXED_CATS`, ei `Asuminen*`) päivätahti × jäljellä olevat
  päivät + `settings.recurring.manual`-erät jäljellä olevilla päivillä. Karkea.
- Vain luku D1:stä. Testi: `npm run test:report` (synteettinen kanta, node:sqlite, Node 22+).
