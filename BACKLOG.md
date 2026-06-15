# Oma talous — PWA Backlog

---

## v1.1.0 — Analytiikka & elävät luottokorttisaldot (toteutettu, odottaa deployta)

Toteutettu suoriteperusteinen tilimalli. Ks. `SUUNNITELMA-analytiikka-velat.md`.
- ✅ `accounts`-taulu + `transactions.account` (migraatio `api/migrations/002_accounts.sql`)
- ✅ Lasketut saldot (alkusaldo + tapahtumat), korttinäkymä: velka/limit/käytettävissä/käyttöaste/korkoarvio
- ✅ Runway: €/pv palkkaan, ennuste palkkapäivänä, päiväkulutus-mittari (efektiivinen palkkapäivä 27. → edellinen pankkipäivä)
- ✅ Nettovelkaantuminen-mittari (rehellinen kuva velaksi elämisestä)
- ✅ Double-counting-korjaus: `visa credit suoritus` → neutral
- ✅ Revolut-CSV-parseri + tilikohdistus tuonnissa
- ✅ Kategoriat laajennettu OP:n taksonomian mukaan (Kauneus, Vakuutukset, Terveys, Harrastukset, Polttoaine & auto, Lapset, Lemmikit) + needs/wants-linjaus
- ✅ Tilivalitsin manuaali-/pika-/kuittisyöttöön + tx-muokkaukseen
- ✅ Palkka-asetukset (kk-palkka, palkkapäivä) UI:ssa, "Aja säännöt uudelleen" -napit

**Deploy-toimet (sinä):**
1. `cd api && wrangler d1 execute oma-talous-db --remote --file=migrations/002_accounts.sql`
2. `cd api && wrangler deploy`
3. Pushaa repo → CF Pages deployaa appin
4. Avaa Säännöt-välilehti → "Kategorisoi puuttuvat" (ja tarvittaessa "Aja säännöt uudelleen") → toukokuun täsmäytys OP:ta vastaan

---

## v1.2.0 — UX-korjaukset (toteutettu)
- ✅ Hakukentän fokusbugi korjattu (kursori ei enää hyppää)
- ✅ Välilehtien järjestys: Yhteenveto · Saldot · Kategoriat · Vertailu · Tapahtumat · Säännöt
- ✅ Säännöt: hakusana/kategoria/luokitus + napit nostettu ylös
- ✅ Saldot: "Varat yhteensä" -rivi näkyviin
- ✅ Kategoriat: NWS%-label selvennetty ("X% needs-budjetista (€)") — vertaa oman luokan budjettiin (needs 50% / wants 30% / savings 20% tuloista)
- ✅ Lounas-duplikaatti: emoji-etuliite riisutaan kategorianimistä (kertasiivous D1:een)

---

## Iso kuva — koontiraportti & OT/IT/Tuottokartta-synergia (SUUNNITTELUSSA)

Tavoite: yksi koontinäkymä joka summaa koko nettovarallisuuden yli kolmen järjestelmän.

| Lohko | Lähde |
|-------|-------|
| Tilivarat (käyttö-, säästötilit, lipas) | OT |
| Sijoitusvarallisuus (rahastot, osakkeet, kryptot) | IT (Investment Tracker) |
| Kiinteistöt — oma koti | OT |
| Kiinteistöt — sijoituskohteet | IT / Tuottokartta |
| Lainat — oma asuntolaina | OT |
| Lainat — kulutusluotot & luottokortit | OT |
| Lainat — sijoituslainat | IT |

Avoimet suunnitteluasiat:
- **Oma asunto + asuntolaina OT:hen** — mallinna Tuottokartan/IT:n D1:stä miten lainan lyhennys (lyhennys/korko/NV-vaikutus) käsitellään.
- **OT↔IT-synergia:** säännöllinen rahastosäästö (SÄÄN.SÄÄST) kirjautuu molempiin — OT:ssa "Sijoittaminen", IT:ssä toistuvana per rahasto. Voisiko OT:n sijoitusmerkinnät uida IT:hen automaattisesti?
- **Nordnet 300 € = sijoituslainan lyhennys** (velkavipu) — kuuluu IT:hen, ei OT:n kulutukseen/säästöön samalla tavalla.
- **FIRE-kuukausisäästö osaksi budjettia:** näytä tavoite ja "nipistä kulutuksesta kohti säästöä" -mittari.
- IT pysyy desktop-only sijoitustyökaluna; OT mobile+desktop. Koontiraportti voisi olla erillinen sivu joka lukee molempien D1:t (read-only).

## v1.4.0 — Kulutusluotot + Saldot-parannukset (toteutettu)
- ✅ Kk-valitsin piiloon Säännöt-välilehdellä (hideMonth-logiikka switchTab:issa)
- ✅ Saldot: kk-valitsin hakee valitun kuukauden lopun tilisaldon (computeBalances(asOf) — lastDayOfMonth)
- ✅ Kulutusluotot-osio Saldot-välilehdessä: nimi, jäljellä €, kk-erä, päättyy kk/vuosi, korko%, edistymispalkki
- ✅ "Mahtuuko budjettiin?" -laskuri: syötä uusi erä + kesto → näyttää % needs-budjetista + kokonaiskustannus + vapautumispvm
- ✅ AI-datapisteet: lainasnapshot tallennetaan automaattisesti muutoksilla (max 24 kk, `ot_loan_snapshots`)
- ✅ Lainat mukana JSON-viennissä/tuonnissa

**Deploy-toimet (sinä):**
1. Pushaa repo → CF Pages deployaa

## Pienempiä parannuksia (jonossa)
- Kategoriat: Harkinnanvaraiset-blokin swaippaus muihin kategorioihin / donitsikaavio kulutuksesta
- Yhteenveto: yläkulman "käytetty"-summan integrointi selkeämmin

---

## Kehitysjonossa (prioriteettijärjestyksessä)

### Luottokortti-kirjanpito: double-counting bugi (KRIITTINEN)

**Ongelma:** Jos seuraat sekä luottokorttiostoksia (Finnair/OP Visa CSV) että luottolaskun maksua käyttötililtä, sama meno kirjataan kahdesti — kerran ostoksena ja kerran laskun maksuna.

**Kirjanpidon oikea logiikka (suoriteperuste):**
- Ostos korttimaksulla → kirjataan heti oikeaan kategoriaan (meno kohdistuu oikealle kuukaudelle)
- Luottolaskun maksu käyttötililtä → **tilisiirto** (neutral), ei meno. Velka kuittautuu, raha siirtyy tililtä korttiyhtiölle.

**Nykyinen bugi:** `visa credit suoritus` ja korttiyhtiöiden maksut on kategorisoitu `Luotot — lyhennys` tyypillä `needs`. Tämä on väärin — ne lasketaan kaksoismeno. Niiden pitäisi olla `neutral`/tilisiirto.

**Korjaustoimenpiteet:**
1. Muuta säännöt: `visa credit suoritus` → tyyppi `neutral`, kategoria `MobilePay & siirrot` (tai uusi "Tilisiirto")
2. Tuo Finnair Visa ja OP Visa Credit CSV:t — niiden ostodata kuvaa oikean menon
3. Varmista ettei laskun maksu + ostos molemmat laske samaan kuukauteen menoina

**Vaihtoehto jos et tuo luottokortti-CSV:tä (kassaperuste):**
- Seuraa vain käyttötiliä
- Luottolaskun maksu ON meno — kategorisoi se silloin manuaalisesti (se pitää jakaa ostoksiin)
- Yksinkertaisempi mutta kategorisointi jälkikäteistä

### Rahoitustapahtumat — lainan nosto ja muut tasemuutokset

**Ongelma:** Lainan nosto (+50 000 €) näkyy tulona ja vääristää koko kuukauden budjetti-%-laskentaa (needs/wants/savings %-osuudet menevät pieleen kun pohja on 50k eikä palkka).

**Ratkaisu:** Uusi transaktiotyyppi `financing`:
- Kirjataan ja näkyy transaktiolistassa (läpinäkyvyys)
- **Ei laske mukaan income-pohjaan** budjettilaskennassa
- Ei vaikuta 50/30/20-prosentteihin
- Kategoriat: "Lainan nosto", "Arvopaperimyynti", "Vakuutuskorvaus" jne.

**Toteutus:**
- Lisää `financing` CATS-listaan + DEF_RULES-säännöt (esim. `asuntolainaerä`, `lainan nosto`)
- `budgetIncomeForMonth`-funktio: suodattaa pois `financing`-tyyppiset tapahtumat income-laskennasta
- `monthSummary`-funktio: `financing` ei laske needs/wants/savings/income-summiin

**Esimerkkisääntöjä:**
- "lainan nosto" → financing
- "asuntolaina" → financing (jos kyse nostosta, ei lyhennyksestä)

### Toistuvat kiinteät menot
Tällä hetkellä esim. 635,90€ asumistransaktio sisältää: hoitovastike + yhtiölainan lyhennys + korko + vesimaksu — kaikki yhdessä rivissä. Tavoite: split-toiminto jolla yhden tapahtuman voi jakaa useampaan kategoriaan manuaalisesti. Esim. 635,90€ → Asuminen 250€ + Luotot—lyhennys 300€ + Luotot—korko 85,90€.

### Palkkatiming — budjettikuukausi salary_day:stä
Nykyinen fallback (edellinen kk jos ei tuloja) toimii ok, mutta oikea ratkaisu: budjettikuukausi alkaa palkkapäivästä (esim. 27.). Kesäkuun budjetti = touko 27. — kesä 26. Vaatii settings-sivulle salary_day-kentän ja koko kuukausilogiikan uusimisen.

### Kategorian tarkempi drill-down
"Harkinnanvaraiset"-blokin kategoriat voi jo klikata → tapahtumat suodatettuna. Seuraava askel: sivutettava/swipeable kategorianäkymä jossa vasemmalla/oikealla nuolella selaa eri kategorioita ja näkee niiden tapahtumat suoraan ilman välilehteä.

### Finnair Visa + OP Visa Credit — puuttuva data

Koodissa on Finnair Visa CSV-parseri ja OP Visa Credit -tunnistus, mutta data puuttuu jos näitä CSV:tä ei ole tuotu. Toimenpiteet:
1. Lataa Finnair Visa -tapahtumat Amex/S-Pankin verkkopalvelusta → CSV → tuo appiin
2. Lataa OP Visa Credit -tapahtumat OP:n verkkopalvelusta → CSV → tuo appiin
3. Tarkista double-counting (ks. yllä) ennen importtia — päätä käytetäänkö suoriteperustetta vai kassaperustetta

Huom: OP Visa Credit CSV-formaatti eroaa OP Debit-formaatista — varmista että parseri tunnistaa oikein.

### Sijoittaminen — mitä hankittu
Sijoittaminen-kategorian tapahtumat näyttävät vain summat. Lisäys: klikattaessa näkee mitä rahastoa/osaketta on ostettu (payee-kentästä).

### Toistuvat menot — tunnistus ja visualisointi
Merkitse säännöllisesti toistuvat tapahtumat (vuokra, lainat, tilaukset) ja näytä ne erikseen "kiinteät menot" -osiona. Helpottaa kulutusjouston arviointia — kuinka paljon menosta on oikeasti vaikutettavissa.

---

**Visio:** Yksi mobile-first PWA joka korvaa budjetti-2.html — mobiilissa kuittisyöttö ja kulutuksen seuranta, desktopissa CSV-import ja analytiikka. Kaikki data Cloudflare D1:ssä.

**Stack:** Cloudflare Pages (frontend) + Workers (API) + D1 (SQLite) + R2 (kuittikuvat)

**Periaate:** budjetti-2.html pysyy käytössä koko migraation ajan. Uusi app rakennetaan rinnalle.

---

## VAIHE 0 — Cloudflare-ympäristö ja GitHub ✅

### 👤 SINÄ TEET

- [x] **CF-tili ja projekti**
- [x] **D1-tietokanta** — `oma-talous-db`, ID: `5f4a86cb-8d6d-42db-a541-07f25e6873cd`
- [x] **R2-bucket** — `oma-talous-receipts`
- [x] **API Token** — uusi luotu (vanha vuotanut token peruutettu)
  Oikeudet: Workers Scripts, D1, Pages, Workers R2 Storage, Workers KV Storage, Cloudflare Pages — kaikki Edit
- [x] **GitHub-repo** — https://github.com/henrikkikellberg-lgtm/oma-talous (private)
  Repossa: `app/index.html` (mobiiliproto), `CLAUDE.md`, `BACKLOG.md`, `Makefile`, `.gitignore`
- [x] **CF Pages** — ylhäällä, yhdistetty GitHub-repoon
- [ ] **Wrangler** — asenna ja kirjaudu ennen Vaihetta 2
  ```bash
  npm install -g wrangler
  wrangler login
  ```

---

## VAIHE 1 — D1 Schema ja migraatio

> budjetti-2.html jatkaa toimintaansa normaalisti tämän vaiheen aikana.

### 🤖 CLAUDE CODE TEKEE

- [ ] **D1 schema** (`api/schema.sql`)
  Taulut:
  - `transactions` — id, date, amount, description, category, type (needs/wants/savings/income), source (csv/manual/receipt/bank), account_id, month, merchant_normalized, exclude (0/1), recurring (0/1), created_at
  - `categories` — id, name, type, budget_monthly, color, icon
  - `rules` — id, keyword, category_id, priority
  - `budgets` — id, category_id, month, amount
  - `accounts` — id, name, type (checking/credit/savings), balance, updated_at
  - `receipts` — id, transaction_id, r2_key, raw_text, parsed_json, created_at
  - `settings` — key, value (mm. `salary_day` 1–31 joka määrittää budjettikuukauden alun)
  - `bank_sessions` — id, provider, session_id, account_ids_json, valid_until, created_at (Enable Banking -integraatiota varten)

- [ ] **Migraatioskripti** (`scripts/migrate-from-json.js`)
  Lukee budjetti-2.html:n viedyn JSON:n → kirjoittaa D1:een Workers API:n kautta.
  Duplikaattisuojaus: hash(date + amount + description).

- [ ] **Kategorioiden ja asetusten alustus** (`scripts/seed.js`)
  Oletuskategoriat: Ruoka, Ravintolat, Liikenne, Koti, Vaatteet, Viihde, Terveys, Alkoholi, Muut + Tulot.
  Oletusasetus: `salary_day = 25`.

### 👤 SINÄ TEET

- [ ] **Vie JSON budjetti-2.html:stä**
  Avaa selaimessa → "Vie JSON" → tallenna `scripts/export.json` (gitignoressa, ei mene repoon)

- [ ] **Aja migraatio** (kun Claude Code on kirjoittanut skriptin)
  ```bash
  node scripts/migrate-from-json.js scripts/export.json
  ```

---

## VAIHE 2 — Workers API

> REST API jota sekä PWA että Open Banking käyttää.

### 🤖 CLAUDE CODE TEKEE

- [ ] **Workers-projekti** (`api/`)
  ```
  api/
    src/
      index.js
      routes/
        transactions.js
        categories.js
        rules.js
        accounts.js
        receipts.js
        settings.js
        connect.js      ← Enable Banking OAuth-flow
    wrangler.toml       ← D1 + R2 bindings tänne
  ```

- [ ] **Endpointit**
  - `GET/POST /transactions` — listaa (month-filter), luo
  - `PUT/DELETE /transactions/:id`
  - `GET /summary?month=YYYY-MM` — tulot/needs/wants/savings, säästöaste
  - `GET/POST /categories`
  - `GET/POST /rules`
  - `GET/PUT /settings` — mm. salary_day
  - `POST /receipts/parse` — base64-kuva → Claude Haiku 4.5 → JSON
  - `POST /import/csv` — tunnistaa pankin (OP Debit, OP Credit, S-Pankki), ajaa säännöt
  - `GET /connect/bank?bank=OP` — käynnistää Enable Banking consent-flow'n
  - `GET /connect/callback?code=xxx` — vaihdetaan koodi session_id:ksi, tallennetaan D1:een

- [ ] **Auth** — Bearer token (`APP_SECRET`) kaikissa pyynnöissä

- [ ] **Kuittikuvien resize** ennen Claude API -kutsua
  Canvas API client-puolella → max 1024px, ~300 KB JPEG ennen lähetystä

### 👤 SINÄ TEET

- [ ] **Aseta Workers secrets** (`wrangler secret put`):
  - `ANTHROPIC_API_KEY`
  - `APP_SECRET` (keksi pitkä random string)
  - `ENABLE_BANKING_APP_ID` (saadaan Vaiheessa 5)
  - `ENABLE_BANKING_PRIVATE_KEY` (`.pem`-tiedoston sisältö, saadaan Vaiheessa 5)

- [ ] **Deploy Workers**
  ```bash
  cd api && wrangler deploy
  ```
  Noteeraa deployattu URL: `https://oma-talous-api.<sinun-account>.workers.dev`

---

## VAIHE 3 — Mobile-first PWA

> Korvaa budjetti.html ja budjetti-2.html. Rakennetaan `app/`-kansioon.

### Nykyinen proto: `app/index.html`
- Mobiili-UI toimii ✅
- Kamera-ikkunan avaus toimii ✅
- **Bugi:** `capture="environment"` estää gallerian valinnan → korjataan kaksi erillistä nappia

### Design
- Vaalea teema, ei tumma
- Värit: metsänvihreä `#1B6B3A`, kulta `#B5883E`, luottamussininen `#1A5BAB`
- Taustaväri `#F2F6FA` (erittäin vaalea siniharmaa)
- Typografia: Inter (jo käytössä protossa)

### 🤖 CLAUDE CODE TEKEE

- [ ] **Kuittisyöttö — kameran korjaus**
  Kaksi erillistä nappia: "📷 Kamera" (`capture="environment"`) ja "🖼️ Galleria" (ilman capture).

- [ ] **Kuittisyöttö — resize ennen API-kutsua**
  Canvas API: skaalaa alle 1024px leveäksi, laatu 0.85 JPEG → suojaa R2-rajoja ja API-kuluja.

- [ ] **Workers-integraatio** — korvaa suorat `api.anthropic.com`-kutsut Workers-proxyllä
  `POST /receipts/parse` Workers-endpointtiin (API-avain pysyy serverillä).

- [ ] **Dashboard** — needs/wants/savings palkit, kuukauden total, pikalisäys-FAB

- [ ] **Tapahtumat** — lista, haku, swipe-kategoriointi

- [ ] **Kategoriat** — kulutus per kategoria, budjetti vs. toteuma

- [ ] **Desktop — CSV-import** (sama app, leveämpi näkymä)

- [ ] **Desktop — Analytiikka** — kuukausivertailu, trendit, säästöaste

- [ ] **Asetukset** — `salary_day`, budjettiraja per kategoria

- [ ] **PWA manifest + service worker** — asentuu iPhonen kotinäytölle

### 👤 SINÄ TEET

- [ ] **Testaa iPhonessa** CF Pages URL:sta → Safari → "Lisää kotinäyttöön"
- [ ] **Testaa kamera + galleria** molemmat toimivat

---

## VAIHE 4 — Historiadata D1:een

> Tuo vanhat CSV:t suoraan D1:een.

### 🤖 CLAUDE CODE TEKEE

- [ ] **Batch CSV import** (`scripts/import-csv-batch.js`)
  Lukee hakemiston kaikki CSV:t, tunnistaa pankin automaattisesti, ajaa säännöt, tuo D1:een.
  Raportti: X tuotu, Y duplikaattia ohitettu.

### 👤 SINÄ TEET

- [ ] **Kerää historialliset CSV:t** — OP-nettipalvelu → Tapahtumat → Lataa CSV
  Tallenna kansioon `scripts/csv-historia/` (gitignoressa)

- [ ] **Aja import**
  ```bash
  node scripts/import-csv-batch.js scripts/csv-historia/
  ```

---

## VAIHE 5 — Open Banking (Enable Banking API)

> Automaattinen tapahtumahaku suoraan OP:sta ja S-Pankista. Rakennetaan kun Workers API on valmis.

### Status

- [x] **Production-sovellus rekisteröity** Enable Bankingiin
- [x] **RSA-avain (.pem) ladattu** — tallenna turvallisesti, tarvitaan Workers secretiksi
- [ ] **Päivitä redirect URL** Enable Banking -sovellukseen kun Workers on deployattu (Vaihe 2):
  `https://oma-talous-api.<account>.workers.dev/connect/callback`

### Miten flow toimii (JS-esimerkin perusteella)

```
1. Worker luo JWT omalla RSA-avaimella
2. POST /auth → valitset pankin (name: "OP", country: "FI") + redirect_url → saat auth URL:n
3. Käyttäjä kirjautuu OP:n verkkopankkiin, hyväksyy luvan
4. OP ohjaa takaisin → Worker napaa ?code-parametrin
5. POST /sessions → vaihdetaan code → session_id tallennetaan D1:een (bank_sessions-taulu)
6. GET /accounts/{id}/transactions → tapahtumat suoraan tililtä
```

Consent voimassa `valid_until`-päivään (max ~90 päivää). Kun vanhenee → uusi kirjautuminen.
Tuetut pankit: OP, Nordea, S-Pankki, Säästöpankki, Aktia, Handelsbanken.
OP:n ja S-Pankin omat PSD2-rajapinnat vaativat TPP-lisenssin — Enable Banking hoitaa tämän.

### 👤 SINÄ TEET (kun Workers on valmis)

- [ ] Päivitä redirect URL Enable Banking -hallintapaneeliin
- [ ] Aseta secrets:
  ```bash
  wrangler secret put ENABLE_BANKING_APP_ID
  wrangler secret put ENABLE_BANKING_PRIVATE_KEY
  ```

### 🤖 CLAUDE CODE TEKEE

- [ ] **JWT-allekirjoitus Workers-koodissa** (Web Crypto API, ei ulkoisia kirjastoja)
- [ ] **`GET /connect/bank?bank=OP`** — käynnistää consent-flow'n
- [ ] **`GET /connect/callback`** — vaihdetaan koodi, tallennetaan session D1:een
- [ ] **Workers cron job** — hakee uudet tapahtumat päivittäin, ajaa kategorisointisäännöt

---

## Tekniset päätökset

| Asia | Päätös | Perustelu |
|------|--------|-----------|
| Frontend | Vanilla JS, ei frameworkia | Kevyt, nopea, ei build step |
| Design | Vaalea teema, vihreä+kulta+sininen | Oma brändi, finanssimaailman luottamus |
| Auth | Bearer token (APP_SECRET) | Henkilökohtainen app, ei user managementia |
| Kuittikuvat | R2 + resize alle 1024px ennen uploadia | R2 free tier (10 GB) + Claude API -kulut minimissä |
| CSV-parsinta | Workers-serverissä | Logiikka yhdessä paikassa, ei client-puolella |
| AI-malli kuitit | Claude Haiku 4.5 | Riittää parsintaan, ~$0.003/kuitti |
| Budjettikuukausi | Alkaa `salary_day`-asetuksesta (oletus 25.) | Vastaa todellisuutta paremmin kuin kalenterikuukausi |
| Open Banking | Enable Banking (ei suoraan OP/S-Pankki) | Hoitaa TPP-lisenssin, tukee kaikkia suom. pankkeja |
| budjetti-2.html | Säilytetään koskemattomana | Keskeytymätön käyttö koko migraation ajan |
| Secrets | Kaikki `wrangler secret put` — ei koodiin eikä gitiin | Turvallisuus |

---

## Järjestys

```
Vaihe 0 ✅
  → Vaihe 1: D1 schema + migraatio  (Claude Code + sinä vie JSON)
  → Vaihe 2: Workers API             (Claude Code + sinä deployaa + asettaa secrets)
  → Vaihe 3: PWA                     (Claude Code + sinä testaa iPhonella)
  → Vaihe 4: Historiadata CSV        (valinnainen)
  → Vaihe 5: Open Banking            (sinä päivittää redirect URL + Claude Code)
```

**Seuraava konkreettinen askel:** `wrangler login` terminaalissa → Vaihe 1 alkaa.
