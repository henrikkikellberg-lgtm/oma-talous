# Oma talous — PWA Backlog

**Visio:** Yksi mobile-first PWA joka korvaa budjetti-2.html — mobiilissa kuittisyöttö ja kulutuksen seuranta, desktopissa CSV-import ja analytiikka. Kaikki data Cloudflare D1:ssä.

**Stack:** Cloudflare Pages (frontend) + Workers (API) + D1 (SQLite) + R2 (kuittikuvat)

**Periaate:** budjetti-2.html pysyy käytössä koko migraation ajan. Uusi app rakennetaan rinnalle.

---

## VAIHE 0 — Cloudflare-ympäristö ja GitHub
> Esivaatimukset ennen kuin mikään muu voi alkaa.

### 👤 SINÄ TEET

- [x] **CF-tili ja projekti** — olemassa
- [x] **D1-tietokanta** — `oma-talous-db` luotu, ID: `5f4a86cb-8d6d-42db-a541-07f25e6873cd`
- [x] **R2-bucket** — `oma-talous-receipts` luotu
- [ ] **API Token** — luo uusi token (edellinen peruutettava välittömästi, se vuoti)
  CF Dashboard → My Profile → API Tokens → Revoke vanha → Create Token
  Oikeudet: Workers Scripts:Edit, D1:Edit, Pages:Edit, Workers R2 Storage:Edit, Workers KV Storage:Edit, Cloudflare Pages:Edit
  ⚠️ Älä jaa tokenia missään — tallenna vain paikallisesti tai suoraan ympäristömuuttujiin

- [ ] **GitHub-repo**
  Luo yksityinen repo: `oma-talous` (private — sisältää henkilökohtaisen talouslogiikan)
  ```bash
  git init
  git remote add origin git@github.com:<sinä>/oma-talous.git
  ```
  Rakenne repossa:
  ```
  oma-talous/
    api/          — Workers-koodi (wrangler.toml tänne)
    app/          — PWA frontend
    scripts/      — migraatio- ja import-skriptit
    .gitignore    — sisältää .env, *.json (export-tiedostot), node_modules
  ```

- [ ] **Asenna Wrangler**
  ```bash
  npm install -g wrangler
  wrangler login
  ```

- [ ] **Yhdistä CF Pages GitHubiin** (kun repo on luotu)
  CF Dashboard → Pages → Create → Connect to GitHub → valitse `oma-talous` → branch: `main`, build dir: `app/`

---

## VAIHE 1 — D1 Schema ja migraatio
> budjetti-2.html jatkaa toimintaansa normaalisti tämän vaiheen aikana.

### 🤖 CLAUDE CODE TEKEE

- [ ] **D1 schema** (`schema.sql`)
  Luo taulut:
  - `transactions` — id, date, amount, description, category, type (needs/wants/savings/income), source (csv/manual/receipt), account, month, created_at
  - `categories` — id, name, type, budget_monthly, color
  - `rules` — id, keyword, category_id, priority (auto-kategorisointisäännöt)
  - `budgets` — id, category_id, month, amount
  - `accounts` — id, name, type (checking/credit/savings), balance, updated_at
  - `receipts` — id, transaction_id, r2_key, raw_text, parsed_json, created_at

- [ ] **Migraatioskripti** (`scripts/migrate-from-json.js`)
  Lukee budjetti-2.html:n viedyn JSON-tiedoston ja kirjoittaa tapahtumat D1:een Workers API:n kautta. Duplikaattisuojaus (hash päivämäärä+summa+kuvaus).

- [ ] **Kategorioiden alustus** (`scripts/seed-categories.js`)
  Lisää oletuskategoriat D1:een: Ruoka, Ravintolat, Liikenne, Koti, Vaatteet, Viihde, Terveys, Alkoholi, Muut + Palkka/Tulot.

### 👤 SINÄ TEET

- [ ] **Vie JSON budjetti-2.html:stä**
  Avaa budjetti-2.html selaimessa → "Vie JSON" → tallenna tiedosto nimellä `export-YYYY-MM.json` kansioon `Oma talous/`.

- [ ] **Aja migraatio** (kun Claude Code on kirjoittanut skriptin)
  ```bash
  node scripts/migrate-from-json.js export-YYYY-MM.json
  ```

---

## VAIHE 2 — Workers API
> REST API jota sekä uusi PWA että mahdollinen open banking käyttää.

### 🤖 CLAUDE CODE TEKEE

- [ ] **Workers-projekti** (`wrangler.toml` + rakenne)
  ```
  oma-talous-api/
    src/
      index.js        — reititys
      routes/
        transactions.js
        categories.js
        rules.js
        accounts.js
        receipts.js
    wrangler.toml
  ```

- [ ] **Endpointit**
  - `GET/POST /transactions` — listaa, luo
  - `PUT/DELETE /transactions/:id` — muokkaa, poista
  - `GET /transactions?month=2025-05` — kuukausisuodatus
  - `GET/POST /categories` — kategoriat
  - `GET/POST /rules` — automaattisäännöt
  - `GET /summary?month=2025-05` — yhteenveto (tulot/needs/wants/savings)
  - `POST /receipts/parse` — ottaa base64-kuvan, kutsuu Claude Vision API:a, palauttaa parsitun kuitin
  - `POST /accounts` — saldopäivitykset

- [ ] **Auth** (yksinkertainen)
  Bearer token ympäristömuuttujasta. Ei tarvita user managementia — henkilökohtainen app.

- [ ] **CSV-import endpoint** (`POST /import/csv`)
  Ottaa CSV-sisällön, tunnistaa pankin (OP Debit, OP Credit, Nordea, S-Pankki), parsii tapahtumat, ajaa säännöt, tallentaa D1:een.

### 👤 SINÄ TEET

- [ ] **Aseta ympäristömuuttujat** CF Dashboardissa tai wranglerilla:
  - `ANTHROPIC_API_KEY` — Claude Vision API:lle
  - `APP_SECRET` — yksinkertainen bearer token jonka keksit itse

- [ ] **Deploy Workers**
  ```bash
  cd oma-talous-api
  wrangler deploy
  ```

---

## VAIHE 3 — Mobile-first PWA
> Uusi app. budjetti-2.html edelleen käytettävissä rinnalla.

### 🤖 CLAUDE CODE TEKEE

- [ ] **PWA-runko** (`oma-talous-app/`)
  Vanilla JS + CSS, ei frameworkia (kevyt, nopea mobiilissa). Service worker + manifest → asentuu iPhoneen "Add to Home Screen".

- [ ] **Mobiili — Etusivu / Dashboard**
  - Tämän kuukauden kulutus isoilla luvuilla (needs/wants/savings)
  - Edistymispalkit vs. budjetti
  - Pikalisaus-painike (kuitti tai manuaalinen)

- [ ] **Mobiili — Kuittisyöttö**
  - Kamera-nappi → ottaa kuvan → lähettää Workers API:lle → Claude Vision parsii → käyttäjä vahvistaa/korjaa summan, kategorian → tallennetaan
  - Pikasyöttö: "sushit, 19€" → AI parsii vapaatekstistä

- [ ] **Mobiili — Tapahtumat**
  - Lista tämän kuukauden tapahtumista
  - Swipe kategorisointia varten
  - Hakutoiminto

- [ ] **Mobiili — Kategoriat**
  - Piirakkakaavio tai palkki per kategoria
  - Porautuminen: kategoria → tapahtumat

- [ ] **Desktop — CSV-import**
  Siirretään budjetti-2.html:n CSV-logiikka Workers API:n kautta D1:een. Sama UI-tyyli.

- [ ] **Desktop — Analytiikka**
  Kuukausivertailu, trendit, säästöaste — sama kuin budjetti-2.html mutta data D1:stä.

- [ ] **Desktop — Säännöt**
  Keyword-säännöt tallennetaan D1:een, toimivat myös CSV-importissa serveripäässä.

### 👤 SINÄ TEET

- [ ] **Luo CF Pages -projekti**
  CF Dashboard → Pages → Create → Connect to Git tai Direct Upload. Tai:
  ```bash
  cd oma-talous-app
  wrangler pages deploy dist/
  ```

- [ ] **Testaa iPhonessa**
  Avaa Pages URL Safarissa → "Lisää kotinäyttöön" → testaa kuittikamera.

---

## VAIHE 4 — Historiadata D1:een
> Tuo vanhemmat CSV-tiedostot suoraan D1:een ilman budjetti-2.html:ää.

### 🤖 CLAUDE CODE TEKEE

- [ ] **Batch CSV import -skripti** (`scripts/import-csv-batch.js`)
  Lukee kansion kaikki CSV-tiedostot, tunnistaa pankin formaatin automaattisesti, ajaa kategorisointisäännöt, tuo D1:een. Yhteenveto: X riviä tuotu, Y duplikaattia ohitettu.

### 👤 SINÄ TEET

- [ ] **Kerää historialliset CSV:t**
  OP nettipalvelu → Tapahtumat → Lataa CSV (voit valita aikavälin). Kerää niin pitkältä kuin haluat.

- [ ] **Aja batch-import**
  ```bash
  node scripts/import-csv-batch.js ./csv-historia/
  ```

---

## VAIHE 5 — Open Banking (Enable Banking API)
> Automaattinen tapahtumahaku suoraan pankista. Toteuttava myöhemmin kun muu on valmis.

### Tutkimustulos

Enable Banking (enablebanking.com) on PSD2-aggregaattori joka tukee suomalaisia pankkeja: OP, Nordea, S-Pankki, Säästöpankki, Aktia, Handelsbanken. Olet tutkinut oikeaa palvelua.

**Miten se toimii henkilökohtaiseen käyttöön:**
Käyttäjä (sinä) kirjautuu pankkiin Enable Bankingin consent-flown kautta → annat luvan tilitietojen lukuun → API palauttaa tapahtumat JSON-muodossa. Et tarvitse TPP-lisenssiä kun kyse on omien tiliesi lukemisesta omaan appiisi.

**Sandbox on ilmainen** — voit testata ilman oikeita pankkitietoja jo nyt.

**Tuotantokäyttö** vaatii rekisteröitymisen Enable Bankingin developeriksi (ilmainen suunnitelma olemassa) + consent-flow käyttäjältä joka kerta (token vanhenee, uusittava).

### 👤 SINÄ TEET (kun valmis kokeilemaan)

- [ ] Rekisteröidy: https://enablebanking.com → Developer signup
- [ ] Testaa Sandbox: https://enablebanking.com/docs/api/sandbox/
- [ ] Katso tuetut pankit Suomessa: https://enablebanking.com/docs/markets/

### 🤖 CLAUDE CODE TEKEE (kun sinä olet rekisteröitynyt)

- [ ] **Open Banking -integraatio Workers API:iin**
  - `GET /connect/bank` — käynnistää consent-flow:n (redirect Enable Bankingiin)
  - `GET /connect/callback` — vastaanottaa tokenin, tallentaa D1:een
  - Workers cron job: hakee uudet tapahtumat automaattisesti päivittäin

---

## Tekniset päätökset ja muistiinpanot

| Asia | Päätös | Perustelu |
|------|--------|-----------|
| Frontend framework | Vanilla JS | Kevyt, nopea, ei build step |
| CSS | Custom properties + flexbox/grid | Sama tyyli kuin nykyinen app |
| Auth | Bearer token env var | Henkilökohtainen app, ei tarvita user managementia |
| Kuittikuvat | R2 + metadata D1:ssä | R2 ei maksa paljon, kuvat eivät täytä D1:stä |
| CSV-parsinta | Workers-serverissä | Logiikka yhdessä paikassa, toimii mobiilista ja desktopista |
| budjetti-2.html | Säilytetään koskemattomana | Keskeytymätön käyttö migraation aikana |
| Kuittikuvat R2:ssa | Resizataan aina alle 1024px / ~300 KB ennen uploadia | Suojaa R2 free tier -rajoja (10 GB) ja pitää Claude API -kulut minimissä |
| GitHub | Yksityinen repo, ei tokeneita tai secreteja koodissa | API-avaimet aina ympäristömuuttujina, ei koskaan .gitiin |

---

## Järjestys käytännössä

```
Vaihe 0 (sinä): CF infra ✅ osittain, GitHub repo + uusi token vielä tekemättä
  → Vaihe 1: schema + migraatio (Claude Code + sinä viemässä JSON:in)
  → Vaihe 2: Workers API (Claude Code + sinä deployaamassa)
  → Vaihe 3: PWA (Claude Code + sinä testaamassa iPhonella)
  → Vaihe 4: Historiadata (valinnainen, Claude Code + sinä CSV:t kokoamassa)
  → Vaihe 5: Open Banking (myöhemmin, sinä rekisteröitymässä + Claude Code)
```
