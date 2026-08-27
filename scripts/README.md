# scripts/

| Tiedosto | Mitä tekee |
|---|---|
| `test-budgets.js` | Budjetti-, palkkajakso- ja viikkologiikan testit (39 kpl). Ajaa `app/index.html`:n skriptin Node-sandboxissa kiinnitetyllä päivämäärällä. `node scripts/test-budgets.js` |
| `test-csv-parsers.mjs` | Tarkistaa että jokainen tiliote jäsentyy oikein ja **summautuu pankin omaan lukuun**. Vaatii että `api/src/index.js` on kopioitu `api/src/index.mjs`:ksi export-rivillä (ks. alla). |
| `simuloi-tuonti.mjs` | Näyttää ENNEN tuontia mitä tuonti tuottaisi: rivit tyypeittäin per tili + kriittiset väitteet (ei valetuloja, ei tuplasäästöjä). |
| `import-from-json.js` | Vanha kertaluonteinen migraatioskripti |

## Parsereiden testaaminen

`api/src/index.js` on Workers-moduuli ilman exportteja, joten testi tarvitsee kopion:

```bash
cp api/src/index.js api/src/index.mjs
echo 'export { parseCSV, accountFromFilename, categorize };' >> api/src/index.mjs
node scripts/test-csv-parsers.mjs ~/Downloads/tilit/
node scripts/simuloi-tuonti.mjs   ~/Downloads/tilit/
rm api/src/index.mjs
```

**Aja simulaatio aina ennen uuden tiliotemuodon tuontia.** Väärin jäsennetty tiliote
on hiljainen virhe: rivit menevät väärälle tilille tai väärään tyyppiin, ja virhe
huomataan vasta kun saldo ei täsmää pankkiin — jolloin syytä on vaikea löytää.
