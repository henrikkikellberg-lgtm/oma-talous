# Suunnitelma — Analytiikka, kassatilanne & elävät luottokorttisaldot

> Tämä on katselmoitava suunnitelma. Ei koodimuutoksia ennen kuin hyväksyt.
> Pohjautuu valintoihin: laskettu saldo tapahtumista · kiinteä kk-palkka pohjana · päiväkulutus-mittari · suoriteperusteinen rehellinen kuva velaksi elämisestä.

---

## 1. Tavoite

Kolme asiaa, jotka appin pitää osata kertoa yhdellä silmäyksellä:

1. **Onko varaa kuluttaa juuri nyt?** — paljonko rahaa per päivä on jäljellä seuraavaan palkkaan, ja meneekö kulutus jo yli.
2. **Riittävätkö varat seuraavaan palkkaan?** — ennuste käyttötilin saldosta palkkapäivänä, kiinteä kk-palkka pohjana.
3. **Rehellinen kuva velaksi elämisestä** — luottokorttisaldot elävät ostojen mukana, ja näkyy kuukauden nettovelkaantuminen (kasvaako velka, vaikka budjetti näyttäisi tasapainoiselta).

---

## 2. Perusperiaate: suoriteperuste (accrual)

Tämä on koko rehellisen kuvan ydin ja ratkaisee BACKLOGin double-counting-bugin.

| Tapahtuma | Kirjaus | Vaikutus |
|-----------|---------|----------|
| Ostos luottokortilla | Meno oikeaan kategoriaan (needs/wants) ostokuukaudelle | Kuluu budjetista **heti** + kortin velka kasvaa |
| Korot ja kulut kortilla | Meno → `Luotot — korko` | Kuluu budjetista + velka kasvaa |
| Luottolaskun maksu käyttötililtä | **`neutral` / tilisiirto** — EI meno | Velka pienenee, raha siirtyy tililtä. Ei lasketa budjettiin (muuten kaksoismeno) |

**Seuraus:** voit pysyä kuukauden budjetissa mutta silti velkaantua, jos ostat kortilla enemmän kuin maksat laskua. App tekee tämän näkyväksi mittarilla **"Nettovelkaantuminen tässä kuussa"**.

> ⚠️ **Korjattava nyt:** sääntö `visa credit suoritus → Luotot — lyhennys / needs` (rivi 549) on väärä — se laskee laskun maksun menoksi. Muutetaan tyypiksi `neutral`, kategoria `MobilePay & siirrot` (tai uusi "Tilisiirto"). Sama koskee kortille tehtyjä suorituksia OP/Aktia-säännöissä.

---

## 3. Nykytila (lyhyt)

- **Saldot** ovat käsin syötettyjä numeroita vain localStoragessa (`saldot`-objekti: Perus, Saasto, Lipas, OPCredit, Finnair, Muu). Eivät elä ostoista.
- **Tapahtumat** menevät D1:n `transactions`-tauluun (id, date, payee, amount, cat, type, source, month). `source` on tällä hetkellä CSV:n tiedostonimi, ei varsinainen tili.
- **Yhteenveto** näyttää needs/wants/savings vs. tulot (50/30/20) + ylijäämän. Ei päiväbudjettia, ei runwayta, ei velkanäkymää.
- **settings**: vain `salary_day` (oletus 25).

---

## 4. Avainpäätökset

### 4.1 Tili kytketään tapahtumaan (uusi `account`-kenttä)
Lisätään `transactions`-tauluun sarake `account TEXT`. CSV-importissa tili päätellään pankkiformaatista:
- Finnair-formaatti (`Maksupäivä`-otsikko) → `Finnair`
- OP Debit -CSV → `Perus` (käyttötili)
- OP Visa Credit -CSV → `OPCredit` *(parseri ei vielä erota tätä OP Debitistä — ks. avoin kohta §10)*
- Kuitti / manuaali → käyttäjä valitsee tilin (oletus `Perus`)

### 4.2 Tilit määritellään kerran (alkusaldo + limiitti + korko)
Uusi pieni **`accounts`**-taulu D1:hen. Jokaiselle tilille:
- `key`, `label`, `kind` (checking / savings / credit)
- `opening_balance` + `opening_date` (lähtöpiste, josta laskenta alkaa)
- `credit_limit` (vain kortit)
- `apr` tai `monthly_fee_est` (korkoarvio, vain kortit)

**Saldo lasketaan:** `opening_balance + Σ(tilin tapahtumat opening_date → tänään)`.
Kortille: velka on negatiivinen, **käytettävissä oleva luotto = limit − |velka|**, **käyttöaste = |velka| / limit**.

### 4.3 Kiinteä kk-palkka asetukseksi
Uusi setting `monthly_salary` (kiinteä). Budjettikuukausi = `salary_day` → seuraava `salary_day`. Tämä antaa runway- ja päiväbudjettilaskennalle vakaan pohjan, vaikka palkka ei vielä näkyisi tapahtumissa.

---

## 5. Schema-muutokset (`api/schema.sql` + migraatio)

```sql
-- 1. Tili tapahtumalle
ALTER TABLE transactions ADD COLUMN account TEXT;

-- 2. Tilimäärittelyt
CREATE TABLE IF NOT EXISTS accounts (
  key             TEXT PRIMARY KEY,
  label           TEXT NOT NULL,
  kind            TEXT NOT NULL,          -- checking | savings | credit
  opening_balance REAL NOT NULL DEFAULT 0,
  opening_date    TEXT NOT NULL,
  credit_limit    REAL,                   -- vain credit
  apr             REAL,                   -- vuosikorko-% (valinnainen)
  sort            INTEGER DEFAULT 0
);

-- 3. Asetukset
INSERT OR IGNORE INTO settings (key,value) VALUES ('monthly_salary','0');
```

Migraatio nykyisille tapahtumille: `account` täytetään `source`-kentän perusteella (Finnair → Finnair, muut → Perus) kertaluonteisella UPDATE-skriptillä.

---

## 6. Saldojen laskenta (backend + frontend)

Uusi endpoint **`GET /balances`** (tai laajennetaan `/summary`):
palauttaa per tili: `kind`, `balance`, ja korteille `limit`, `available`, `utilization`, `est_monthly_interest`.

Frontendissä `renderSaldot()` kirjoitetaan uusiksi:
- Käsisyöttökentät → **lasketut saldot** (alkusaldo + tapahtumat). Alkusaldon ja limiitin voi yhä muokata (tilin asetukset).
- Korttikortti näyttää: velka **−2 482 € / 8 000 €**, käytettävissä **5 518 €**, käyttöaste-palkki **31 %**, arvioitu kk-korko **~25 €**.
- Nettovarallisuus = Σ varat − Σ velat (kuten nyt, mutta lasketuista saldoista).

---

## 7. Kassatilanne & runway ("riittääkö palkkaan")

Uusi osio **Yhteenvedon** yläosaan. Laskenta:

```
palkkapäivä           = settings.salary_day
päiviä_palkkaan       = pv tästä päivästä seuraavaan palkkapäivään
käyttötilin_saldo     = laskettu Perus-tilin saldo (tuoreus = viim. import)
kulutettu_jaksolla    = Σ |needs+wants| tämän budjettijakson tapahtumista
päiväbudjetti         = käyttötilin_saldo / päiviä_palkkaan
keskikulutus_per_pv   = kulutettu_jaksolla / kuluneet_päivät
ennuste_palkkapäivänä = käyttötilin_saldo − keskikulutus_per_pv × päiviä_palkkaan
```

**Näyttö:**
- "**Käytettävissä X €/pv** seuraaville Y päivälle" (iso luku).
- Liikennevalo: 🟢 ennuste > puskuri · 🟡 lähellä nollaa · 🔴 ennuste menee miinukselle ennen palkkaa.
- Jos `keskikulutus_per_pv > päiväbudjetti` → varoitus: "Kulutus yli tahdin — näin jatkuen tili −Z € palkkapäivänä."

> Tuoreushuomio: käyttötilin saldo on yhtä tuore kuin viimeisin CSV-import. Lisätään "saldo päivätty: pp.kk." -merkintä ja mahdollisuus syöttää käsin ajantasainen tilisaldo nopeaa arviota varten.

---

## 8. Päiväkulutus-mittari (ylikulutus näkyväksi)

Yhteenvetoon **pace-mittari**: kumulatiivinen kulutus vs. lineaarinen tahtiviiva (budjetti jaettuna tasan jakson päiville).
- Tahtiviiva = `(kk-palkka × 0.8 − kiinteät menot) / jakson_päivät` (needs+wants -osuus).
- Jos kumulatiivinen kulutus on tahtiviivan yläpuolella → palkki punaisena + "X € yli tahdin".
- Pieni sparkline/palkki riittää (ei raskasta kaaviota, design-linjan mukaisesti).

---

## 9. Velkaantuminen näkyväksi (rehellinen kuva)

Uusi mittari Yhteenvetoon ja Saldot-välilehdelle:

```
nettovelkaantuminen_kk = Σ(korttiostot + korot) − Σ(maksut korteille)
```
- Positiivinen = velka kasvoi tässä kuussa (elät velaksi) → punainen.
- Negatiivinen = lyhensit velkaa → vihreä.
- Teksti: "Velka kasvoi 320 € tässä kuussa, vaikka budjetti näytti tasapainoiselta."

Tämä on se mittari, joka paljastaa kortilla eräännytetyn elämisen, jota pelkkä needs/wants/savings ei näytä.

---

## 10. Vinkit ensi kuulle (kevyt sääntöpohjainen)

Yhteenvedon alaosaan automaattiset huomiot tämän jakson datasta, esim.:
- Kategoria yli tavoitteen: "Ravintolat 180 € (viime kk 90 €) — −90 €."
- Korttikorot: "Maksoit korkoja 26 € — kannattaisi lyhentää OP Visaa nopeammin."
- Toistuvat kiinteät menot tunnistettuna → "Kiinteät menot Y €, joustovara Z €."
- Säästöaste vs. tavoite 20 %.

Sääntöpohjainen ja deterministinen (ei AI-kutsua), jotta nopea ja ilmainen. AI-vinkit voi lisätä myöhemmin erikseen.

---

## 11. UI-muutokset välilehdittäin

| Välilehti | Muutos |
|-----------|--------|
| **Yhteenveto** | Yläosaan: runway-kortti (€/pv + liikennevalo + ennuste), pace-mittari, nettovelkaantuminen. Alaosaan: vinkit ensi kuulle. |
| **Saldot** | Käsisyöttö → lasketut saldot. Korttikortit: velka/limit, käytettävissä, käyttöaste, kk-korko. Tilin asetukset (alkusaldo, limiitti, korko) muokattavissa. |
| **Tapahtumat** | `account`-sarake/merkki näkyviin. Mahdollisuus vaihtaa tapahtuman tili. Suodatus tilin mukaan. |
| **Asetukset** (osa Lisää-näkymää) | `monthly_salary`, `salary_day`, tilien hallinta. |

---

## 12. Toteutusvaiheet (ehdotettu järjestys)

1. **Schema + migraatio** — `account`-sarake, `accounts`-taulu, `monthly_salary`. Täytä olemassa olevien tapahtumien `account`.
2. **Sääntökorjaus** — luottolaskun maksut → `neutral` (poistaa double-countingin).
3. **Backend** — `/accounts` CRUD, `/balances`-laskenta, OP Visa Credit -CSV-parserin erottelu.
4. **Saldot-välilehti** — lasketut saldot + korttinäkymä.
5. **Yhteenveto** — runway-kortti, pace-mittari, nettovelkaantuminen.
6. **Vinkit ensi kuulle** — sääntöpohjaiset huomiot.
7. **Verifiointi** — testidata: tarkista että korttiostos kasvattaa velkaa, laskun maksu ei tuplaa menoa, runway-luvut täsmäävät käsin laskettuna.

---

## 13. Mitä tarvitsen sinulta ennen koodausta

→ Suurin osa selvisi vastauksissasi, ks. **Revisio 2** alla. Avoimeksi jää:
1. **Säästötilin (...0366) alkusaldo 14.6.2026** (ei vielä annettu).
2. **Korttien korkoprosentit (APR)** projektiota varten — todelliset korot kirjataan tapahtumina, mutta APR antaa "ensi kuun korkoarvion".
3. Vahvistus kategoriataksonomian laajuudesta (Revisio 2 §R5).

---

# Revisio 2 — tarkennukset (vastauksesi + tiedostojen analyysi)

## R1. Palkka & palkkapäivä
- **Käyttäjä syöttää** kiinteän kk-palkan asetuksissa. Nyt **3 267 €**.
- Palkkapäivä **27.**, mutta jos osuu viikonlopulle/pyhälle → maksetaan **edellinen pankkipäivä** (esim. 27.6.2026 = lauantai → maksu pe 26.6.).
- **Toteutus:** `salary_day = 27` + funktio `effectivePayday(year, month)` joka siirtää päivän taaksepäin lähimpään pankkipäivään (la/su + Suomen pyhät). Budjettijakso ja runway laskevat tästä efektiivisestä päivästä.

## R2. Koronlaskenta — tarkka vs. arvio (kaksi tasoa)
Pankki laskee koron päiväkohtaisesta saldosta. Emme voi täysin replikoida OP Visa Creditille, koska sen **ostotapahtumia ei saa CSV:nä**. Ratkaisu kahdella tasolla:

1. **Todellinen korko = tapahtuma.** Kirjaat kortin korot ja kulut tapahtumina (näkyvät OP Gold -näkymässä tarkasti: esim. *Korko −23,14*, *Tilinhoitomaksu −3,50*). Nämä ovat **faktoja**, menevät `Luotot — korko`-kategoriaan ja kasvattavat velkaa. → 100 % tarkka jälkikäteen.
2. **Arvio ensi kuulle = APR-pohjainen.** Tilin asetuksiin kortin **vuosikorko (APR)**. App laskee päiväkohtaisesta lasketusta saldosta: `arvioitu_korko ≈ Σ(päiväsaldo × APR/365)`. Näyttää "ennustettu korko tässä kuussa ~25 €". Tämä on **arvio**, koska osa ostoista kirjataan viiveellä käsin.

Eli: **mennyt = tarkka (tapahtumista)**, **tuleva = arvio (APR + laskettu saldo)**.

## R3. Tilit, alkusaldot ja kohdistus (oikeat luvut)
Tilanne **14.6.2026** (= `opening_date`):

| Tili (key) | Tyyppi | Alkusaldo 14.6. | Limiitti | Huom |
|------------|--------|-----------------|----------|------|
| OP Perustili (`Perus`) ...0975 | checking | **826,20** | — | Palkkatili + OP Visa **Debit** kytketty |
| OP Säästötili (`Saasto`) ...0366 | savings | *(puuttuu)* | — | Kierrätystili; rahastomerkintöjä joita ei tuotu CSV:nä → puuttuu OT:sta |
| OP Säästölipas (`Lipas`) ...2582 | savings | **6 009,04** | — | Kassapuskuri |
| OP Visa Credit (`OPCredit`) | credit | **−2 482,23** | 8 000 | Ei CSV:tä → ostot käsin/kuitti |
| Finnair Visa (`Finnair`) | credit | **−4 921,92** | 8 000 | CSV saatavilla |
| Revolut (`Revolut`) | checking | 0,00 (avaus 26.4.) | — | Uusi, CSV saatavilla |

**Kohdistus tapahtumaan:** koska OP Visa Credit ja Revolut tuovat saman menon eri reittiä, jokainen manuaali-/kuittitapahtuma tarvitsee **"millä kortilla maksettiin"** -valinnan (tilivalitsin). CSV-tuonnissa tili päätellään formaatista automaattisesti.

## R4. Tiedostoformaatit — mitä koodi osaa tunnistaa
Parseriin kolme tunnistettavaa formaattia + manuaali:

1. **Finnair Visa** (`Maksupäivä,Paikka,...` -otsikko) → tili `Finnair`. *(Parseri olemassa.)* Sisältää myös korot/kulut (`Within limit interest`, `Rollover fee`) → `Luotot — korko`.
2. **OP Debit** (puolipiste-eroteltu) → tili `Perus`. *(Parseri olemassa.)*
3. **Revolut** (uusi) — monitiliote, osiot erotettu `---------`, taulu `Päivämäärä,Kuvaus,Kategoria,Saapuvat/lähtevät varat,Saldo,...`. Pvm `P.K.VVVV`, summa `-39,24€`. Revolutilla on **oma Kategoria**-sarake jota voi hyödyntää esikategorisoinnissa. → tili `Revolut`. **Uusi parseri tarvitaan.**
4. **OP Visa Credit** — **ei CSV:tä.** Ostot kuitti/manuaali, tili `OPCredit`. Korot/kulut käsin OP Gold -näkymästä.

## R5. Kategoriat — linjaus OP:n kanssa (iso parannus)
**Toukokuun vertailu paljasti ison virheen:** OP needs −1 709 / wants −781, mutta Oma talous needs 867 / wants 1 504 — luokittelu lähes ristiin. Syy: OT:n karkea taksonomia (parturi, vakuutukset → "Ostokset") ja väärä needs/wants-jako.

**OP:n taksonomia (kuvista, käytetään pohjana):**

*Välttämättömyydet (needs):* Ajoneuvot ja liikenne · Asuminen (sis. Vastike, Vuokra, Sähkö, Vesi, Lämmitys, Puhelin ja internet, Jätehuolto, Kiinteistövero, Asuntolaina) · Luoton maksut · Ruoka ja päivittäistavarat · Terveys · Vakuutukset · Lapset · Lemmikit · Muut välttämättömyydet (verot, sakot)

*Huvit ja hyödyt (wants):* Ravintolat ja kahvilat · Harrastukset · Kauneus ja hyvinvointi (parturi, hieronta, kosmetologi) · Kulttuuri ja viihde · Matkailu · Ostokset (vaatteet, elektroniikka) · Muut huvit ja hyödyt

*Säästöt:* Säästöt ja sijoitukset

**Toimenpide:** laajennetaan OT:n `CATS` + `DEF_RULES` kattamaan nämä (mm. uudet: Kauneus ja hyvinvointi, Vakuutukset, Harrastukset, Terveys, Auto/Polttoaine, Lapset, Lemmikit) ja korjataan needs/wants-tyypit OP:n jaon mukaisiksi. Lisätään sääntöjä yleisimmille kauppiaille (parturit, vakuutusyhtiöt, apteekit jne.).

## R6. Toukokuun täsmäytys (verifiointivaihe)
Lisätään toteutuksen loppuun **täsmäytys OP:ta vastaan**: toukokuu 2026 OT pitäisi näyttää lähellä OP:n lukuja (Tulot 3 287,05 · Menot −2 490,10 · needs ~1 709 · wants ~781 · Säästöt 600). Jos heittää, tutkitaan 4 kategorisoimatonta + neutral-luokittelu. Tämä varmistaa että D1-data on eheä ja luokittelu korjattu.

## R7. KV vai D1? → **D1**
Oma talous käyttää **D1:tä** (op-fund-tracker käyttää KV:tä — eri projekti). Kaikki uusi — `accounts`, lasketut saldot, asetukset (palkka, palkkapäivä) — menee **D1:hen**. Ei KV:tä. Saldot siirtyvät localStorage-only → D1, jolloin ne ovat käytettävissä analytiikkaan ja muille näkymille.

## R8. Päivitetty toteutusjärjestys
1. Schema: `accounts`-taulu (oikeat alkusaldot), `transactions.account`, `monthly_salary`, `salary_day=27`.
2. Sääntökorjaus: luottolaskun maksut/suoritukset → `neutral` (double-counting pois).
3. Kategoriataksonomian laajennus + needs/wants-linjaus OP:n mukaan (R5).
4. Revolut-parseri + OP Visa Credit -manuaalituonnin tilivalitsin.
5. Lasketut saldot + korttinäkymä (velka/limit/käytettävissä/korko).
6. Runway-kortti (efektiivinen palkkapäivä R1) + pace-mittari + nettovelkaantuminen.
7. Vinkit ensi kuulle.
8. **Verifiointi:** toukokuun täsmäytys OP:ta vastaan (R6).
