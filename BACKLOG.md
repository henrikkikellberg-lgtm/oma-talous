# Oma talous — PWA Backlog

---

## v1.4.x — Toteutettu (kesäkuu 2026)

- ✅ `/loans` D1-endpoint Workers API:hin (GET/POST/PUT/DELETE) — data synkkaa laitteiden välillä
- ✅ D1-datafixaukset: asuntokauppa → `financing`, luottokorttien palautuskirjaukset → `neutral`, omat tilisiirrot → `neutral`
- ✅ `categorize()` parannukset: positiiviset luottokorttikirjaukset ja KELLBERG-siirrot Perustilillä → automaattisesti `neutral`
- ✅ Palkkabudjetti: double-counting-bugi korjattu (`>` eikä `>=` startISO)
- ✅ `budgetIncomeForMonth`: kynnys 40% (pienet tulot ohitetaan), ennuste nykyiselle kuukaudelle jos palkkapäivä tulevaisuudessa, viimesijainen fallback monthly_salary-asetukseen
- ✅ Kassavirta-kortti Yhteenveto-välilehdelle: tulot vs kulutus, "pohja vuotaa" -varoitus, netto säästöjen jälkeen
- ✅ Runway-kortti uudelleensuunniteltu: ennuste hero-lukuna (34px), kolme mini-korttia (tili nyt / kulutustahti / budjettitahti), skenaario-rivi
- ✅ Analytiikka-välilehti (Chart.js CDN): kassavirta 12 kk, N/W/S% 6 kk, top 10 kulukategoriat YTD, trendivaroitukset tekstinä
- ✅ Ennuste-tulo näytetään `~`-merkillä ja kultaisena (isEstimate-lippu kautta koko UI)

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
- **OT↔IT-synergia:** säännöllinen rahastosäästö (SÄÄN.SÄÄST) kirjautuu molempiin — OT:ssa "Sijoittaminen", IT:ssä toistuvana per rahasto (esim. kuun 15. päivä). Voisiko OT:n sijoitusmerkinnät uida IT:hen automaattisesti? Huomioi myös kertasijoitukset (ei vain toistuvat) — IT laskee osuuden Yahoo Finance -päiväarvosta.
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

## v1.5.0 — Päätöksiä pakottava analytiikka (SEURAAVA)

**Tausta.** Palkkajakson 27.7.–26.8.2026 analyysi (27.8.2026, korttidata mukana) paljasti, että sovellus raportoi kulutuksen mutta ei muuta sitä.

| | € |
|---|---|
| Tulot | 3 633,04 |
| needs | −1 558,42 |
| wants | −1 172,78 |
| savings | −741,00 |
| financing (remontti 721,90 + 158,02) | −879,92 |
| **Netto** | **−719,08** |

**Jakso on alijäämäinen.** 741 € siirrettiin säästöön, mutta sitä ei ansaittu — kortille jäi 849,03 € ostoja ja 40,19 € korkoa. Ilman kertaluontoista remonttia jakso menee +2,82 €:iin eli tasan nollille. Tämä on juuri se "vuotava pohja" jonka mittari on tässä backlogissa määritelty mutta jota kukaan ei ollut vielä laskenut oikein.

Löydös: **harkinnanvaraisesta 1 173 eurosta 907 € (77 %) on ulkona syömistä ja juomista.** Jaksoittain: 27.4.–26.5. 718,75 € / 26 kertaa → 27.5.–26.6. 192,01 € / 13 → 27.6.–26.7. 574,69 € / 28 → **27.7.–26.8. 907,06 € / 44**. Samaan aikaan päivittäistavarat putosivat 587 → 283 €. Ruokamenot eivät kasvaneet — ne siirtyivät kaupasta ravintolaan (ulkona-osuus ruokamenoista 25 % → 49 % → 76 %).

Rakenne: 44 ostosta 23 päivänä 31:stä, keskihinta 20,62 €, valtaosa haarukassa 10–20 €. **Ei ole yhtä päätöstä jonka voisi peruuttaa — frekvenssi on muuttuja, ei summa.** Kuukauden lopussa näytetty summa tulee liian myöhään ollakseen päätöstieto.

---

### T1 — Datan laatu ✅ TEHTY 27.8.2026

**Juurisyy 1: emoji-haamusäännöt.** `rules`-taulussa oli 28 emoji-etuliitteistä sääntöä (id 132–164) jotka jäivät emoji-siivouksesta. `categorizeTx()` iteroi säännöt järjestyksessä `priority DESC, id ASC` ja **ensimmäinen osuma voittaa** — kaikilla prioriteetti 0, joten vanha emoji-sääntö voitti aina korjatun. Systemaattinen seuraus: päivittäistavarat, liikkuminen ja asuminen luokittuivat `wants`-tyypiksi.

**Juurisyy 2: `finnair`-sääntö osui kaikkeen.** Sääntö id 119 (`kw='finnair'` → Matkailu — harrastus / wants) vertautuu kenttiin `payee + selitys + viesti`, ja **jokaisen Finnair Visa -tapahtuman `selitys` on "Finnair Visa"**. Sääntö osui siis jokaiseen korttitapahtumaan jolla ei ollut osumaa pienemmällä id:llä. Virhe jäi huomaamatta koska korttia käytetään pääosin matkustamiseen — mutta se luokitteli mm. 721,90 € remonttitarvikkeita matkailuksi. Korjattu: `kw='finnair - '` (osuu enää `FINNAIR - INFLI` -tyyppisiin ostoihin, ei selitykseen).

Tehdyt korjaukset D1:een:
- Poistettu 22 emoji-sääntöä joilla oli puhdas vastine; korjattu 6 vastineetonta (id 132/158/162/164 → `Ostokset`, id 134 → `Asuminen`/`needs`, id 159 → `Päivittäistavarat`/`needs`)
- Poistettu sääntö id 29 `verohallinto → Muut/wants` (osui sekä palautuksiin että maksuihin; nyt palautus → `income`, maksu → `— Kategorisoimatta` tarkistettavaksi)
- Korjattu sääntö id 119 `finnair` (ks. yllä), id 111 `alko` → `Alkoholi` (oli `Baarit`), id 231 `ptl*netrauta.fi` → `Asuminen — remontti`/`financing`
- Taloyhtiölasku tallennettu toistuvana splittinä (sääntö id 134, priority 10): **vastike 289,80 (46,3013 %) + vesi 40,00 (6,3908 %) + rahoitusvastike 296,10 (47,3079 %)**. Prosentteina, joten jako pysyy oikeana vaikka kk-summa muuttuisi. Molemmat 625,90 €:n tapahtumat päivitetty.
- Uusi kategoria `Asuminen — remontti`, tyyppi `financing` — ei sotke needs/wants/savings-suhteita eikä ravintolarajan signaalia, mutta näkyy kassavirrassa
- Uudelleenluokiteltu yhteensä ~20 tapahtumaa (Asuminen→needs, Lainan nosto→financing, Alko→Alkoholi 9 kpl, Netrauta→remontti, Anthropic→Suoratoisto & liittymät, veronpalautus→income)

**Jäljellä:**
- [ ] **Estä uusiutuminen.** Kaksi juurisyytä kolmesta johtui samasta asiasta: sääntötaulussa saa olla useita osumia samaan tapahtumaan, ja voittaja ratkeaa id-järjestyksellä. Korjaus: `UNIQUE(kw)` tai vähintään varoitus UI:hin kun uusi sääntö osuisi tapahtumiin joilla on jo sääntö. Harkitse myös että `categorizeTx()` valitsisi **pisimmän** osuvan avainsanan lyhimmän sijaan.
- [ ] Tarkista `Lainan nosto` −158,02 € (31.7., IBAN FI65 5600…). Nimi sanoo nosto, merkki sanoo maksu.
- [ ] 6 duplikaattiavainsanaa ilman tyyppikonfliktia (compass group, elettra, riihitahti bistro, ptl*stockmann, riihimaen kaupunki, mob.pay*veikkaus). Vain kategoria heittää → kosmeettinen.

### T2b — Tiliotteiden tuonti kaikilta tileiltä ✅ TEHTY 27.8.2026 (v1.9.0)

**Kolme hiljaista bugia, jotka olisivat korruptoineet datan tuonnissa:**

1. **`parseCSV` asetti jokaiselle OP-muotoiselle riville `account:'Perus'` kovakoodattuna** (rivi 551). Säästötilin tuonti olisi kirjannut 88 tapahtumaa käyttötilille — mukaan lukien **+26 118,75 € PANO** helmikuulta. Käyttötilin saldo, kassavirta ja runway olisivat menneet kerralla rikki. Korjattu: tili tulee kutsujalta, ja käyttöliittymä näyttää arvauksen vahvistettavaksi ennen tuontia.

2. **Revolutin uusi vientimuoto ei jäsentynyt lainkaan.** Vanha parseri odotti `d.m.yyyy`-päivää sarakkeessa 0; uudessa muodossa sarake 0 on Tyyppi ja päivä on sarakkeessa 2 aikaleimana. Tuonti olisi onnistunut **nollalla rivillä ilman virheilmoitusta**. Uusi parseri huomioi myös `Palvelumaksu`-sarakkeen: kortin toimitusmaksussa `Määrä` on 0,00 ja koko veloitus on maksukentässä.

3. **Positiivinen rivi säästötilillä olisi luokittunut TULOKSI.** `categorize()`:n viimeinen fallback antaa positiiviselle riville `Palkka ja tulot / income`, ja KELLBERG-siirtosääntö koski vain Perustiliä. Säästölipas olisi tuottanut ~50 valetulorivia (6 339 €) ja säästötili yhden 26 118,75 €:n "palkan" — jokainen budjettiprosentti olisi ollut väärin.

**Lisäksi korjattu tuplalaskenta:** säästötilillä tapahtuva `savings`-rivi muunnetaan `neutral`iksi. Säästäminen mitataan siinä hetkessä kun raha lähtee käyttötililtä; ilman tätä sama euro laskettiin kahdesti (Perus→Säästölipas -siirto + lippaan PANO-rivi) tai kolmesti (Perus→Säästötili→Nordnet).

**Tilin päättely tiedostonimestä.** OP:n käyttötili, säästötili ja säästölipas ovat täysin identtistä CSV-muotoa — tiliä EI voi päätellä sisällöstä. `accountFromFilename()` riisuu diakriitit ennen vertailua, koska macOS antaa nimet hajotetussa muodossa (`ä` = `a` + yhdistyvä treema) eikä `säästötili` muuten osu.

**Verifiointi ennen tuontia:** `scripts/simuloi-tuonti.mjs` ajaa oikeat tiliotteet parserin ja luokittelun läpi ja näyttää lopputuloksen tyypeittäin. Kaikki neljä tiedostoa summautuvat pankin omaan lukuun:

| Tili | Rivejä | Netto | Saldo tuonnin jälkeen |
|---|---|---|---|
| OP Visa Credit | 25 | +469,35 | −2 608,82 ✓ ruudulla sama |
| Säästötili | 27 | +12 312,91 | 14 385,97 |
| Säästölipas | 61 | +2 839,00 | 5 113,04 |
| Revolut | 22 | +6,86 | 6,86 ✓ otteen oma loppusaldo |

- ✅ Alkusaldot korjattu D1:een (ks. taulukko alla)
- ✅ 25 uutta sääntöä sijoitus-, yritys- ja lomavirroille → **ei yhtään kategorisoimatonta riviä** simulaatiossa
- ✅ Testit: `scripts/test-csv-parsers.mjs`, `scripts/simuloi-tuonti.mjs`

**Korjatut alkusaldot:**

| Tili | Oli | Nyt | Peruste |
|---|---|---|---|
| Finnair Visa | −200 (22.3.2025) | 0 (2.12.2025) | CSV summautuu tasan −3 503,44:ään; −200 oli haamu |
| OP Visa Credit | −2 482,23 (14.6.) | −3 078,17 (31.12.2025) | ruudulla käytetty 2 608,82 − CSV:n netto 469,35 |
| Säästötili | 13 601,21 (14.6.) | 2 073,06 (31.12.2025) | |
| Säästölipas | 6 009,04 (14.6.) | 2 274,04 (31.12.2025) | |
| Revolut | 1 000 (4.7.) | 0 (25.4.) | otteen ensimmäinen rivi on nollasta |

**Havainto mallista:** säästötili ei ole säästötili vaan toinen käyttötili — sieltä maksetaan vakuutukset, yrityksen kulut, sijoitukset ja luottokortti. Säästölipas sen sijaan toimii kuten kuvattu: pieniä pyöristys-PANOja ja isompia nostoja. Säästöaste kannattaa jatkossa mitata **saldojen muutoksesta**, ei `savings`-tapahtumista.

### T2c — Erämaksujen ristiriitatarkistus ✅ TEHTY 27.8.2026 (v1.10.0)

`loanDrift()` vertaa kahta riippumatonta lukua samasta asiasta: **jäljellä oleva saldo** vs. **kuukaudet päättymiskuukauteen × kk-erä**. Ne paljastavat toisensa — elokuussa 2026 iPhonen saldo vastasi 7 erää mutta päättymiskuukauteen oli 4. Kolme erää oli maksettu ilman että saldoa päivitettiin, ja sama koski Huaweita ja keittiölainaa.

- Kynnys on **yksi erä**: laskutettu mutta maksamaton erä saa erottaa luvut ilman varoitusta
- Vain korottomille erämaksuille (`apr` tyhjä) — korollisessa lainassa saldo ei ole erien monikerta
- Varoitus näkyy lainakortilla Saldot-välilehdellä
- Testattu vanhoilla JA korjatuilla arvoilla: kaikki kolme virhettä laukaisevat, korjatut eivät

**Miksi tämä on tärkeä:** erämaksun saldo on käsin ylläpidetty luku, joka vanhenee hiljaa. Kun erät maksetaan tililtä jota ei seurata (esim. yhteiseltä tililtä), tapahtumia ei tule koskaan — ainoa mekanismi joka voi huomata vanhentumisen on tämä ristiriita.

**Korjatut saldot 27.8.2026:** iPhone 242,76 → 138,72 · Huawei 94,99 → 82,60 · Keittiölaina 2 684,54 → 1 839,11 (3 erää maksettu muualta).

### Asunnon kertakulut eroteltu kulutuksesta ✅ TEHTY 27.8.2026

Uusi kategoria **`Asuminen — kalustus`** (`wants`) erottaa muuttoon liittyvät kertaostot toistuvasta kulutuksesta. `Asuminen — remontti` (`financing`) on arvoa nostaville rakennustarvikkeille.

| kk | wants (muu) | kalustus | remontti |
|---|---|---|---|
| 04/26 | 2 007,17 | 1 820,91 | — |
| 05/26 | 910,81 | 1 402,24 | — |
| 07/26 | 835,25 | — | 950,69 |
| **yht.** | | **3 223,15** | **950,69** |

Asunnon kertakulut yhteensä **4 173,84 €** (sänky, Westwing, FinnishDesignShop, Tempur, IKEA, K-Rauta, Netrauta).

⚠️ **Tämä ei tarkoita että kulutus olisi ollut pienempää.** Sama raha meni, ja pääosin Finnair Visalle 15,51 %:n korolla. Erottelu tehtiin jotta kuukausibudjetin signaali kertoisi *toistuvasta* kulutuksesta — kertaluonteinen kalustaminen ei ole asia jota ravintolarajan pitäisi vastustaa. Kalustus on tarkoituksella `wants` eikä `financing`: huonekalu ei pidä arvoaan kuten remontti, joten sen kuuluu näkyä kulutuksena.

### T2d — Tuonnin tunnistetörmäys ✅ KORJATTU 27.8.2026 (v1.11.0)

Ensimmäinen oikea tuonti paljasti kaksi bugia joita simulaatio ei voinut nähdä, koska ne syntyvät vasta kannassa olevaa dataa vasten.

**1. OP käyttää samaa arkistointitunnusta siirron molemmilla puolilla.** Tunnus `20260101/593156/0F4760` on sekä käyttötilin −9,00 € että säästölippaan +9,00 €. Tunniste on perusavain, joten lippaan puoli ohitettiin "jo olemassa" -sääntönä. **Säästölippaan 61 rivistä meni sisään 3** ja säästötilin 27:stä 21 — hiljaa, ilman virheilmoitusta, ja tuonti raportoi onnistuneensa.

Korjaus: ei-Perus-tilien tunnisteeseen lisätään tilin nimi (`Lipas_20260101/593156/0F4760`). Perustili säilyttää paljaan tunnisteen, jottei jo tuotu data monistu.

**2. Duplikaattihaku vertasi tilien yli.** `findExistingDuplicate` täsmäsi pelkällä päivämäärällä ja summalla riippumatta tilistä. Sama päivä ja summa eri tileillä on kuitenkin normaali sisäinen siirto — ja siirron molemmat puolet tarvitaan, jotta kummankin tilin saldo täsmää pankkiin. Nyt vertailu tapahtuu vain saman tilin sisällä.

**3. CAT_DEST laski siirrot kahdesti.** `handleBalances` lisäsi säästötilin saldoon käyttötilin "Säästölipas"-kategorian siirrot *arviona*. Kun lippaan oma tiliote tuotiin, sama siirto laskettiin toiseen kertaan — säästölipas näytti 4 909,04 € kun oikea luku on 5 113,04 €. Nyt arvio käytetään vain jos tililtä EI ole omaa tiliotedataa; oma data voittaa aina arvion.

- ✅ Testattu: `scripts/test-tuonnin-duplikaatit.mjs` — simuloi kannan jossa siirron toinen puoli on jo olemassa, ja varmistaa että kaikki 61 + 27 riviä menevät läpi mutta aito saman tilin duplikaatti torjutaan yhä

**Toimenpide:** Saaston ja Lippaan rivit poistettiin D1:stä ja tiedostot on tuotava uudelleen korjatulla koodilla.

⚠️ **Sama tunnistetörmäys koskee myös selainpuolen `parseCSVFile`-varapolkua** (`app/index.html`), jota käytetään vain jos `API_BASE` on tyhjä. Ei korjattu, koska polku ei ole käytössä — korjaa jos offline-tuonti otetaan koskaan käyttöön.

### T2 — Korttidata ⚠️ OSITTAIN

- ✅ Finnair Visa tuotu 22.8.2026 asti
- ✅ **OP Visa Credit: ei toimenpiteitä.** Kortilla ei tehdä ostoja eikä siitä saa tiliotetta — tapahtumat on vietävä käsin. Saldo ja korko pysyvät silti mukana `accounts`-taulun kautta.
- [ ] Hyväksymiskriteeri: jokaisen aktiivisen tilin `MAX(date)` on korkeintaan 7 vrk vanha
- [ ] Lisää Yhteenveto-välilehdelle varoitus kun jonkin tilin data on yli 14 vrk vanha — tämä analyysi oli ensin 719 € liian optimistinen juuri siksi ettei puuttuvasta datasta varoitettu mitenkään

### T3 — Palkkajaksologiikka 27.→26. ✅ TEHTY 27.8.2026 (v1.7.0)

**Arvio oli väärä.** Tämä oli merkitty "isoksi refaktoroinniksi", mutta logiikka oli jo olemassa ja toimiva: `effectivePayday()` (siirtää palkkapäivän edelliselle pankkipäivälle), `periodBounds(off)`, `dashWindow()`, `periodIncomeForOffset()` ja `minPeriodOffset()` rakennettiin v1.1.0:ssa Yhteenveto-välilehden jaksonäkymää varten. Ainoa este oli yksi rivi:

```js
function dashIsPeriod() { return curTab==='yhteenveto' && viewMode==='period'; }
```

Jaksonäkymä oli lukittu yhteen välilehteen. Korjaus:

```js
const PERIOD_TABS = ['yhteenveto','kategoriat'];
function dashIsPeriod() { return PERIOD_TABS.includes(curTab) && viewMode==='period'; }
```

Tämän jälkeen `changeMonth()`, `updateMonthLabels()` ja `updateMobTotal()` toimivat Kategoriat-välilehdellä ilman muutoksia. `renderKategoriat()` lukee nyt `dashWindow()`-ikkunan ja `periodIncomeForOffset()`-tulon kalenterikuukauden sijaan.

- ✅ `periodIdFor(off)` → `2026-P07` (jakson alkupalkkapäivän kuukausi)
- ✅ Reunatapaus katettu: jaksossa 27.6.–26.7. ei ole palkkaa, 27.5.–26.6. on kaksi. `periodIncomeForOffset()` laskee tulon palkkapäivästä palkkapäivään ja putoaa `monthly_salary`-ennusteeseen kun jakson tulo alittaa 40 % kynnyksen.
- ✅ Testattu: `node scripts/test-budgets.js` (17 testiä)

### T4 — `budgets`-taulu + jäljellä-luku ✅ TEHTY 27.8.2026 (v1.7.0)

**Skeema muuttui suunnitellusta.** Alkuperäinen `cat TEXT PRIMARY KEY` olisi ollut virhe: ulkona syöminen hajautuu viiteen kategoriaan, ja per-kategoria-rajan kiertää vaihtamalla kategoriaa (lounas → ravintola → kahvila). Budjetti kohdistuu siksi kategoria**joukkoon**:

```sql
CREATE TABLE IF NOT EXISTS budgets (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  cats       TEXT NOT NULL,                    -- JSON-taulukko kategorianimiä
  limit_eur  REAL NOT NULL,
  period     TEXT NOT NULL DEFAULT 'salary',   -- salary | month
  rollover   INTEGER NOT NULL DEFAULT 0,       -- 1 = ylitys vähennetään seuraavasta jaksosta
  sort       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);
```

Toteumalle ei tehty omaa taulua — se lasketaan tapahtumista lennossa (`budgetSpent()`), samoin rollover edellisen jakson tapahtumista. Yksi totuuden lähde, ei synkattavaa.

- ✅ Migraatio `api/migrations/005_budgets.sql`, ajettu D1:een
- ✅ API: `GET /budgets`, `POST /budgets` (upsert), `PUT /budgets/:id`, `DELETE /budgets/:id`
- ✅ UI: `budgetCardHTML()` — **ensisijainen luku on jäljellä (32px)**, käytetty/raja toissijaisena rivinä. Mukana ostosten lukumäärä, koska 44 ostosta à 20,62 € ei ole yksi päätös vaan 44 — summa yksinään piilottaa sen että kyse on tottumuksesta.
- ✅ Modaali budjettien luontiin: nimi, raja, kategoriavalinta chipeinä, rollover-valinta
- ✅ Aloitusbudjetti luotu: `ulkona`, 550 €, rollover päällä
- ✅ Testattu: `node scripts/test-budgets.js`

Aloitusrajat datasta johdettuna:

| Kategoriaryhmä | Toteuma 27.7.–26.8. | Raja jakso 1 | Tavoite jakso 3 |
|---|---|---|---|
| Ravintolat + Baarit + Kahvilat + Lounas + Alkoholi | 907 € | **550 €** (124 €/vk) | 400 € |
| Päivittäistavarat | 283 € | ei kattoa — tämän kuuluu nousta | ~450 € |

550 € on täsmälleen jakson 27.6.–26.7. taso: aloitusraja jonka on jo kerran alittanut on ainoa jonka noudattamisesta on näyttöä.

- ✅ **Seuraus ylitykselle toteutettu:** `rollover`-lippu. Edellisen jakson ylitys vähennetään tämän jakson rajasta (`budgetStatus().carry`). Ilman tätä raja on koriste jonka voi ylittää ilman että mikään muuttuu.

**Deploy-toimet (sinä):**
1. `cd api && npx wrangler deploy` — API:n uudet `/budgets`-reitit
2. Pushaa repo → CF Pages deployaa `app/`
3. Migraatio on jo ajettu D1:een (taulu + aloitusbudjetti olemassa)

### T5 — Viikkopalaute ✅ TEHTY 27.8.2026 (v1.8.0)

Kortti Yhteenvedon ylimpänä (`#weekCard`), ensimmäisenä mitä sovelluksen avatessa näkee.

**Viikkoraja on dynaaminen, ei jaksoraja/4,43.** Suunniteltu kiinteä jako olisi valehdellut: se näyttäisi yhä "124 € tällä viikolla" vaikka jakso olisi jo 300 € yli. Toteutus:

```
päivätahti      = jäljellä oleva jaksobudjetti / jäljellä olevat päivät
viikon liikkumavara = päivätahti × tämän viikon jäljellä olevat päivät
```

Ylitys alkuviikosta kutistaa loppujakson tahtia itsestään — erillistä viikkorolloveria ei tarvita, eikä luku voi olla epäsynkassa jaksobudjetin kanssa. Kun jakso menee yli, luku menee negatiiviseksi ja teksti vaihtuu muotoon "yli jaksobudjetin".

- ✅ Viikko = ma–su (arkirytmi), leikattuna jakson sisään. Jakson reunaviikot ovat lyhyempiä ja se on oikein.
- ✅ **Frekvenssi euromäärän rinnalla:** "käytetty tällä viikolla 84 € · 5 ostosta". 44 ostosta à 20,62 € ei ole yksi päätös vaan 44.
- ✅ Edellisen viikon tulos kortin alalaidassa: toteuma vs. päiväsuhteinen osuus jakson rajasta. Vertailuluku on laskettavissa jälkikäteen mille tahansa viikolle, toisin kuin dynaaminen tahti joka riippuu kuljetusta polusta.
- ✅ Väri: vihreä normaali, kulta kun päivätahti alle 40 % alkuperäisestä, punainen yli.

**Kaksi bugia jotka löytyivät vasta testeissä:**

1. **Jakso ei ole 31 päivää.** 27.9.2026 on sunnuntai → palkkapäivä siirtyy pe 25.9:aan → jakso 27.8.–25.9. on **29 päivää**. Kiinteä "/4,43" olisi antanut väärän tahdin joka kerta kun palkkapäivä osuu viikonlopulle. Nyt tahti lasketaan todellisista päivistä.
2. **Rollover ulottui budjettia edeltäviin jaksoihin.** Uusi budjetti olisi aloittanut −354,06 € miinuksella heinäkuun toteuman perusteella — rajaa jota ei ollut olemassa ei voi olla rikkonut. Lisätty `budgetGovernedAt()`: carry lasketaan vain jaksoista jotka alkoivat budjetin luonnin jälkeen.

- ✅ Testattu: `node scripts/test-budgets.js` — 39 testiä

**Push-ilmoitus jäi tekemättä tarkoituksella** — ks. T8.

### T8 — Push-ilmoitus viikkoyhteenvedosta (HARKINNASSA)

Kortti ratkaisee palautesyklin pituuden, mutta vaatii että avaat sovelluksen. Push toisi yhteenvedon ilman avaamista.

Vaatii: VAPID-avainparin, `push_subscriptions`-taulun, service workerin `push`-handlerin, allekirjoituksen Workerissa (Web Crypto, `nodejs_compat` on jo päällä) ja Workers Cron Triggerin sunnuntai-illaksi. iOS vaatii että PWA on asennettu kotivalikkoon.

Päätä vasta kun kortti on ollut käytössä pari jaksoa: jos avaat sovelluksen muutenkin viikoittain, push ei tuo lisäarvoa vaan pelkkää ylläpidettävää.

### T6 — Toistuvien kulujen tunnistus

Ainoa säästö joka ei vaadi tahdonvoimaa: päätät kerran, vaikutus toistuu joka kuukausi.

- [ ] Payee-normalisointi: sama kauppias + sama summa ±5 % ≥ 3 kk peräkkäin → "Kiinteät kulut" -lista
- [ ] Yhteensä €/kk, osuus tuloista, muutosilmoitus ("uusi tilaus havaittu")
- [ ] **Ensimmäinen tarkistettava rivi: Elisa 194,31 € (27.7.–26.8.), edellinen jakso 130,63 €.** Sisältääkö laite-erän? Jos kyllä, päättymispäivä näkyviin; jos ei, siellä on ~60 €/kk selittämätöntä.
- [ ] Kiinteä pohja tiedossa: taloyhtiölasku 625,90 €/kk (vastike + vesi + rahoitusvastike), toistaiseksi muuttumaton

### T7 — Remonttiseuranta (UUSI)

Remontin kesto on auki. Jos kuluja tulee lisää, ne syövät kategoriarajojen uskottavuuden joka jaksossa ellei niitä eroteta.

- [ ] Oma budjetti kategorialle `Asuminen — remontti`, seuranta erillään NWS-suhteista
- [ ] Kumulatiivinen remonttikulu näkyviin (nyt 721,90 €)
- [ ] Päätä rahoitustapa: nyt remontti meni kortille 15,51 % korolla. Jos remontti jatkuu, tämä on kallein mahdollinen tapa rahoittaa se.

---


## Kehitysjonossa (prioriteettijärjestyksessä)

### "Vuotava pohja" — todellinen kassavirta-mittari ✅ TOTEUTETTU (v1.4.x)
Kassavirta-kortti lisätty Yhteenveto-välilehdelle. Analytiikka-välilehdellä kassavirta 12 kk -kaavio trendivaroituksineen.

**Oivallus:** Säästöaste tai luottojen lyhennykset eivät kerro taloudellisesta terveydestä tarpeeksi, jos samaan aikaan käyttää luottokorttia tai nostaa säästöistä kattamaan arjen kuluja. Pohja vuotaa — velka syö sen minkä säästää.

**Mittari:** Todellinen kuukausittainen kassavirta = tulot − (needs + wants) − korkokulut
- Positiivinen → talous kannattelee itse itsensä, säästäminen ja lyhennykset ovat aitoa ylijäämää
- Negatiivinen → "pohja vuotaa": jokin väline (luottokortti, säästöt, laina) paikkaa aukon

**Näkyvyys jota ei vielä ole:**
- Jos kassavirta on −500€/kk mutta sijoitat 300€/kk rahastoon, netto on −800€ — tämä ei näy nykyisessä säästöaste-mittarissa
- Luottokortin saldo kasvaa → luottorajan käyttöaste nousee → merkki josta pitäisi hälyttää
- Säästötilin saldo laskee ilman että budjetti selittää miksi

**Toteutus (ehdotus):**
- Yhteenveto-välilehdelle uusi mittari: "Kassavirta" = ylijäämä ilman savings-tyyppisiä tapahtumia
- Luottokorttien saldotrendi: jos käyttöaste kasvaa kuukaudesta toiseen → keltainen/punainen varoitus
- Saldot-välilehdelle: "Nettovarallisuuden muutos tässä kuussa" laskettuna tilinpäätösarvoista

---

### Säästötilin CSV-tuonti — arkkitehtuurimuutos

**Ongelma nykyisessä mallissa:** Säästötilin/Lipas saldo lasketaan vain sisääntulevista siirroista Perustililtä (CAT\_DEST). Nostot säästöistä eivät laske saldoa — nettovarallisuus yläkanttiin.

**Oikea ratkaisu:** Poistetaan CAT\_DEST ja siirrytään puhtaaseen tilikohtaiseen malliin:
- Kaikki inter-tilitapahtumat `neutral` molemmilla puolilla
- Säästöaste lasketaan saldojen muutoksesta (Säästötili loppu − alku), ei `savings`-tapahtumista
- Vaatii muutokset: `computeBalances`, `monthSummary`, budjettilaskenta

**Väliaikainen ratkaisu:** Päivitä Säästötilin Alkusaldo manuaalisesti kerran kuussa OP:n saldon mukaan.

### Luottokortti-kirjanpito: double-counting bugi — OSITTAIN KORJATTU

**Ongelma:** Jos seuraat sekä luottokorttiostoksia (Finnair/OP Visa CSV) että luottolaskun maksua käyttötililtä, sama meno kirjataan kahdesti — kerran ostoksena ja kerran laskun maksuna.

✅ **Korjattu (`3e8c61c`):** positiivinen summa Finnair/OPCredit-tilillä → `neutral` (maksu kortille). KELLBERG-tulo Perustilillä → `neutral` (oma raha takaisin). 17 vanhaa väärää kirjausta korjattu D1:ssä samalla.

⚠️ **Yhä auki:** sääntöjen `kaarlo henri` / `kellberg hen` (taulu `rules`) **negatiivinen** puoli Perustilillä on yhä `Luotot — lyhennys` / `needs`. Nämä osuvat kaikkiin ulosmeneviin siirtoihin näillä nimillä — myös Finnair-kortin saldonmaksuihin, joiden pitäisi olla `neutral` (koska ostot lasketaan jo erikseen Finnair-CSV:n kautta). Riski: sama nimi voi osua myös aitoihin ei-kortti-siirtoihin, joten tarkistus vaatii käyttäjän silmäilyä rivi riviltä ennen automaattikorjausta.

**Seuraava askel:** käy läpi `Luotot — lyhennys`-kategorian rivit Perustilillä, tunnista mitkä ovat Finnair/OPCredit-kortin saldonmaksuja (→ `neutral`) vs. aitoja lainanlyhennyksiä (esim. `OP Yrityspankki Oyj`, `OP Vähittäisasiakkaat Oyj` -toistuvat erät vaikuttavat aidoilta lainoilta, ei kortinmaksuilta — vahvista).

### Rahoitustapahtumat — lainan nosto ja muut tasemuutokset ✅ TOTEUTETTU

`financing`-transaktiotyyppi lisätty (`77e9919`) — ei vaikuta needs/wants/savings/income-%:iin, näkyy omana suodattimena Tapahtumat-välilehdellä ("🏦 Rahoitus").

### Toistuvat kiinteät menot — split-tapahtuma ✅ TOTEUTETTU, persistenssi korjattu

Split-tapahtuma + "tallenna toistuvana jakona" toteutettu (`351598f`) + taloyhtiölasku-parseri AI-kuittiparsintaan. Esim. 635,90€ asumistapahtuma voidaan jakaa: Asuminen 250€ + Luotot—lyhennys 300€ + Luotot—korko 85,90€.

✅ **Persistenssibugi korjattu (`7388f55`):** toistuva jako tallentui aiemmin vain selaimen localStorageen, ei D1:een (puuttui `splits`-sarake tauluista + API-kutsut), joten jako katosi seuraavassa CSV-tuonnissa. Nyt `transactions`/`rules`-tauluissa on `splits`-sarake, ja `categorize()` soveltaa tallennettua prosenttijakoa automaattisesti uusiin CSV-riveihin (pyöristys täsmää aina tarkalleen, vaikka kk-summa vaihtelisi).

### Analytiikka-välilehti — jatkokehitys
Nykyinen: kassavirta 12 kk + N/W/S% 6 kk + top 10 kategoriat YTD.
Seuraavat askeleet:
- Säästöaste-trendiviiva (line chart) 12 kk, 20% tavoiteviiva
- Kulukasvun tunnistus: mikä kategoria kasvanut eniten vs. edellinen kk / 3 kk ka
- Interaktiivisuus: klikkaa kuukausipalkkia → suodattaa Tapahtumat-välilehteen kyseiselle kuukaudelle
- Muistutus: importtaa kesäkuun CSV kun palkka on tullut (26.6.) jotta analytiikka täsmentyy

### Palkkatiming — budjettikuukausi salary_day:stä
✅ Osittain toteutettu: ennuste (monthly_salary) kun palkkapäivä tulevaisuudessa, 40% kynnys pienille tuloille.
Jäljellä: täydellinen palkkajakso-logiikka (budget month = payday to payday) vaatii koko kuukausilogiikan uusimisen — iso refaktorointi, ei prioriteettina.

### Kategorian tarkempi drill-down
"Harkinnanvaraiset"-blokin kategoriat voi jo klikata → tapahtumat suodatettuna. Seuraava askel: sivutettava/swipeable kategorianäkymä jossa vasemmalla/oikealla nuolella selaa eri kategorioita ja näkee niiden tapahtumat suoraan ilman välilehteä.

### Finnair Visa + OP Visa Credit — puuttuva data

Koodissa on Finnair Visa CSV-parseri ja OP Visa Credit -tunnistus, mutta data puuttuu jos näitä CSV:tä ei ole tuotu. Toimenpiteet:
1. Lataa Finnair Visa -tapahtumat Amex/S-Pankin verkkopalvelusta → CSV → tuo appiin
2. Lataa OP Visa Credit -tapahtumat OP:n verkkopalvelusta → CSV → tuo appiin
3. Tarkista double-counting (ks. yllä) ennen importtia — päätä käytetäänkö suoriteperustetta vai kassaperustetta

Huom: OP Visa Credit CSV-formaatti eroaa OP Debit-formaatista — varmista että parseri tunnistaa oikein.

---

### AI-analyysi: aina laskettu saldo, ei opening_balance

**Ongelma:** AI-analyysi (tai mikä tahansa joka lukee `accounts`-taulua suoraan) voi käyttää `opening_balance`-kenttää sellaisenaan, joka on vain lähtösaldo — ei nykysaldo. Esimerkki: Finnair Visa `opening_balance = -30` mutta oikea saldo on `-4 751,92`.

**Korjaus:** Kaikissa AI-analyyseissä, API-endpointeissa ja raportoinneissa käytetään aina laskettua saldoa:

```sql
SELECT 
  a.key, a.label, a.kind, a.apr, a.credit_limit,
  ROUND(a.opening_balance + COALESCE(SUM(t.amount), 0), 2) AS current_balance
FROM accounts a
LEFT JOIN transactions t ON t.account = a.key
GROUP BY a.key
```

**Toteutus:** Lisää Workers API:hin `GET /accounts/balances` -endpoint joka palauttaa aina lasketut saldot. CLAUDE.md:hen ohje: älä käytä `accounts.opening_balance` analyyseissa suoraan.

---

### Automaattinen tilikohdistus + luottokorttisaldojen reaaliaikainen päivitys

**Nykytilan ongelma:**

Luottokorttitilin saldo lasketaan `opening_balance + SUM(transactions WHERE account = 'X')`. Tämä toimii vain jos tapahtumat kohdistuvat oikealle tilille. Nyt kolme aukkoa:

1. **OP Visa Credit -saldo on jäädytetty**: tilille ei ole yhtään tapahtumaa, saldo pysyy opening_balance-arvossa vaikka ostoja tehtäisiin tai maksettaisiin.
2. **Luottokorttimaksu Perus-tililtä ei päivitä korttisaldoa**: kun maksat 500 € Perus → OP Visa Credit, syntyy vain yksi tx Perus-tilille (`Luotot — lyhennys`). OPCredit-saldo ei muutu.
3. **Lainojen saldo (loans-taulu) ei päivity automaattisesti**: balance on manuaalisesti syötetty, ei kytkettynä transaktiodataan.

**Ratkaisu — kolme osaa:**

#### A) Tilidentifiointi (`accounts`-taulu)

Lisää kenttä `identifier TEXT` — vapaamuotoinen tunniste jolla CSV-rivi tai maksu voidaan yhdistää oikeaan tiliin.

```sql
ALTER TABLE accounts ADD COLUMN identifier TEXT;
-- Esimerkit:
-- OPCredit → identifier = 'OP VISA CREDIT' tai kortin 4 viimeistä numeroa '1234'
-- Finnair  → identifier = 'FINNAIR VISA' tai 'S-PANKKI'
```

CSV-parserin logiikka:
- Tiedostonimi tai CSV:n otsikkorivi sisältää tyypillisesti tilin nimen → matchaa `accounts.identifier`:iin
- Jos match löytyy → aseta `transactions.account` automaattisesti, älä kysy käyttäjältä
- Fallback: käyttäjä valitsee manuaalisesti (nykyinen toiminta)

#### B) Luottokorttimaksun automaattinen vastatransaktio

Kun Perus-tililtä (tai mistä tahansa checking-tililtä) lähtee maksu jonka payee/selitys matchaa `accounts.identifier` (credit-tili):

1. Tunnista maksu automaattisesti CSV-tuonnissa tai manuaalisyötössä
2. Luo Perus-tilille tx normaalisti (nykyinen toiminta, `cat = neutral`)
3. Luo **automaattisesti vastatransaktio** luottokorttitilin puolelle: `amount = +sama summa, cat = neutral, type = neutral, source = 'transfer'`

Näin luottokorttitilin saldo pienenee oikeasti maksun myötä.

**Säännöt-tauluun** lisätään tukeva kenttä:
```sql
ALTER TABLE rules ADD COLUMN target_account TEXT;
-- Jos kw = 'OP VISA CREDIT' AND type = 'debit' → luo vastatransaktio account='OPCredit'
```

#### C) Lainojen automaattinen saldopäivitys

`loans`-tauluun lisätään `payee_pattern TEXT` — regexp tai substring jolla Perus-tililtä lähtevä lyhennys tunnistetaan.

```sql
ALTER TABLE loans ADD COLUMN payee_pattern TEXT;
-- Keittiölaina: payee_pattern = 'OP Vähittäisasiakkaat'
-- Asuntolaina:  payee_pattern = 'asuntolaina' tai pankin viite
```

Logiikka CSV-tuonnissa:
1. Jos tx Perus-tilillä matchaa jonkin lainan `payee_pattern` → laske `loans.balance -= tx.amount` (absoluuttinen vähennys)
2. Päivitä `loans.updated_at`
3. Tämä korvaa manuaalisen saldonsyötön

**Vaihtoehto**: lainasaldo pysyy manuaalisena mutta Workers cron ajaa kerran kuussa: `balance -= monthly_payment` automaattisesti ilman transaktiokytkentää (yksinkertaisempi, riittää osamaksuille joissa ei ole vaihtelua).

#### D) UI-muutokset

- **Tilin asetukset**: lisää `Tunniste`-kenttä (vapaamuotoinen teksti), näkyy nykyisen lomakkeen alapuolella
- **CSV-tuonti**: näytä autodetection-tulos ("Tunnistettu: Finnair Visa") ennen tuontia, mahdollisuus korjata
- **Saldot-välilehti**: näytä luottokorttien kohdalla viimeisin transaktiopäivä — helpottaa tunnistamaan jos data on vanhentunutta

**Migraatio (ei rikkovia muutoksia):**
- Kaikki uudet sarakkeet `ALTER TABLE ... ADD COLUMN ... DEFAULT NULL` — olemassaolevat rivit eivät muutu
- Vanhat CSV-tuonnit ja manuaalisyötöt toimivat edelleen samoin

**Prioriteetti:** Korkea — ilman tätä luottokorttisaldot ovat staattisia ja kassavirta-analyysi epäluotettava.

### Sijoittaminen — mitä hankittu (siirretty "Iso kuva" -osioon)
Tarkennettu: tämä ei ole pieni UI-lisäys, vaan OT↔IT-synergia (ks. ylempänä) — rahaston/osakkeen näkeminen riittää jo nykyisestä kategoria-klikkauksesta (Kategoriat-välilehti → drill-down näyttää payee-nimet). Varsinainen tarve on OT:n sijoitustapahtuman automaattinen vienti IT:hen (Investment Trackeriin), joka hakee Yahoo Financella päivän arvon ja laskee tuoton. Huomioi kertasijoitukset erikseen IT:n toistuvien (kuun 15. päivä per rahasto) lisäksi.

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
