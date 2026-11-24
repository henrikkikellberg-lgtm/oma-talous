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
