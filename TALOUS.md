# TALOUS.md — Henrikin taloudenpito

Tämä tiedosto on taloudenpidon pysyvä konteksti Claudelle: tavoitteet, tilien roolit,
kiinteät kulut, velat ja kirjauslinjaukset. Lue ennen kuin vastaat kysymyksiin
budjetista, saldoista tai sijoitusvarasta. Sovelluksen kehitys: `CLAUDE.md`.

Päivitä tämä tiedosto, kun luvut tai päätökset muuttuvat (päivämäärä riville).
Tila päivitetty: 11.11.2026.

---

## Datalähteet

| Mitä | Mistä |
|---|---|
| Tilitapahtumat, saldot, kategoriat, säännöt, budjetit | Cloudflare D1 `oma-talous-db` (`5f4a86cb-8d6d-42db-a541-07f25e6873cd`) |
| Sijoitukset, FIRE-tavoite ja -polku, nettovarallisuus | op-fund-tracker / oma·salkku: MCP `op-fund-tracker` (`get_net_worth`, `get_transactions`, `get_instruments` …). `get_portfolio` on liian iso agenttikäyttöön. D1 `a0cabc70-eaf7-4d5a-b56f-b507156d6f1d`, tavoitteet `user_goals` |
| Vuokra-asunnot | Vuokratili D1:ssä (`account='Vuokra'`), kohteet Tuottokartassa |

Tilien saldot:

```sql
SELECT a.key, a.last_import_through,
  ROUND(a.opening_balance + COALESCE((SELECT SUM(amount) FROM transactions t
    WHERE t.account=a.key AND t.date>a.opening_date),0),2) AS saldo
FROM accounts a WHERE a.kind<>'closed' ORDER BY a.sort;
```

Revolutin taskut: `viesti` = `Revolut` (päätili) tai `Revolut · <tasku>` → `GROUP BY viesti`.
Palkkajakso SQL:ssä: `strftime('%Y-%m', date, '-26 days')`.

**FIRE-tavoitesummaa, välietappeja tai suunnitelman kk-säästöä ei kirjata tänne** —
ne luetaan aina op-fund-trackerista, jotta lukuja on yksi.

---

## Tavoitteet

1. **Sijoitetaan 1 000 €/kk saapuvista varoista** — ehdoton. Lasketaan vain raha, joka
   menee sijoitusinstrumentteihin (rahastot, osakkeet, ETF:t, Revolut-sijoitukset, robo).
   Säästölipas ja Säästötili ovat rahan siirtoa paikasta toiseen, eivät FIRE-säästöä.
   Kytkös op-fund-trackerin FIRE-polkuun.
2. **Säästötili = hätävara 3–4 kk nettopalkkaa** (≈ 9 800–13 000 €) tai sijoitusasunnon
   ostoon. op-fund-trackerin investableCash käyttää 4 kk:n puskuria.
3. **Kulutusta seurataan viikoittain ja sitä pitää osata pienentää.** Tunnistettu kuvio:
   kortit tappiin ja maksu säästöistä/luotolla. 5–9/2026 kulutus (~3 520 €/kk) ylitti
   nettopalkan (~3 380 €/kk) jo ennen säästöjä; vaje katettiin Säästölippaasta.

---

## Palkka ja jakso

- Nettopalkka **3 267 €**, palkkapäivä **27.** → budjettikuukausi on 27.–26. (palkkajakso).
- Kevään bonus (3–4/2026) → Säästölipas → kesälomarahaksi. Heinä–elokuu tietoisesti korkeampi kulutus.

## Tilit ja roolit

| Tili | Rooli |
|---|---|
| OP Perustili | **Vain laskut.** Ei juoksevia menoja (periaate 10/2026). |
| Revolut | Eläminen taskuittain; rahat siirretään kerralla palkkapäivänä |
| OP Säästötili | Hätävara / asuntokäsiraha; sähkövaraus 25 €/kk |
| OP Säästölipas | Käteispuskuri (korttimaksujen pyöristykset) |
| OP Visa Credit | Ei ostoja — vain vanha velka, ks. Velat |
| Finnair Visa | Lasku maksetaan Perukselta (Aktia Bank Abp, neutral) |
| OP Vuokratili | **Erillään** henkilökohtaisesta taloudesta, kaikki rivit neutral. Ei jää ylijäämää; sijoittaa 50 €/kk |

## Revolut-taskut (jakso 10–11/2026)

Revolutiin 1 250 €/jakso, josta 200 € sijoituksiin → elämiseen **1 050 €**.

| Tasku | Täyttö | Huom. |
|---|---|---|
| Päivittäistavarat | 88 €/vk (pe) | |
| Ulkona | 58 €/vk | 232 € jaksossa — eniten venyvä |
| Muut ostokset/viihde | 60 €/jakso | U.S Video 15 €/vk |
| Arki | 250 €/jakso | VR-junat (Riihimäki–Hki, Kuopio). Loppui 11/2026 kesken (+ Float 78 € väärästä taskusta) |
| Riennot | kortiton | ylijäämät / raskaammat kuukaudet |

Havainto 11/2026: 1 050 € on ollut liian tiukka. Ehdotettu siirto Ulkona → Arki.

## Kiinteät kulut (Perustili, maksaa yksin kaiken asumisen)

| Pv | Kulu | €/kk | Huom. |
|---|---|---|---|
| 2. | Elisa | 180,33 | pelkkiä laite-eriä, ks. Velat |
| 4. | AXA | 18,26 | oman kodin lainan vakuutus (vuokrakohteen AXA vuokratilillä) |
| 5. | As Oy Havinkartano | 625,90 → ~329,80 | rahoitusvastike 296,10 poistuu viimeistään 1/2027 erästä |
| ~7. | Kauppalehti | 35,90 | |
| ~20. | DNA | 25,98 | |
| ~20. | Spotify | 12,99 | |
| ~24. | Apple | 9,99 | |
| ~25. | Fortum (energia) | ~11–15 | |
| 27. | Sähkövaraus → Säästötili | 25,00 | Caruna-siirtomaksu 3 kk välein |
| 30. | OP-asuntolaina | 505,00 | ensimmäinen 30.11.2026, ~100 t€ |
| | **Yhteensä** | **~1 450 → ~1 155** | tammikuusta 2027 alkaen |

Caruna (siirto) ~70 € 3 kk välein, seuraava eräpäivä ~25.2.2027 → maksetaan sähkövarauksesta:
palkkapäivänä 25 € Perus → Säästötili viestillä **"Sähkövaraus"**, eräpäivänä 75 € takaisin
samalla viestillä.

## Sijoitukset kuukaudessa (11/2026)

| Kohde | €/kk | Milloin |
|---|---|---|
| OP-rahastot (automaattinen) | 175 | ~16. ja ~29. (Maailma 2×50, Amerikka 50, Kiina 25) |
| Revolut (sijoitustili + Robo) | ~200 | palkkapäivänä |
| Mandatum/Saxo | 575 | käsin palkkapäivänä |
| Vuokratili | 50 | |
| **Yhteensä** | **~1 000** | |

## Velat

| Velka | Saldo | Erä €/kk | Viimeinen erä |
|---|---|---|---|
| OP Visa Credit | 1 315,57 (9.11.) | maksuja vaihtelevasti; korko ~20 + tilinhoito 3,50 | **avoin päätös** |
| Elisa: iPhone | 104,04 | 34,68 | ~2/2027 (3 erää) |
| Elisa: Huawei mesh | 78,47 | 4,13 | ~6/2028 |
| Elisa: Roborock | 486,54 | 54,06 | ~8/2027 (9 erää) |
| Elisa: MacBook Pro M5 | 2 886,18 | 87,46 | ~8/2029 |
| OP-asuntolaina (koti) | ~100 000 | 505 | |

Elisa-saldot `loans`-taulussa (`included_in_tx=1`); päättymiset laskettu saldo/erä, seuraava erä 12/2026.

## Ylijäämä sijoituksiin (laskelma 11.11.2026)

Palkka − kiinteät − Revolut-eläminen 1 050 − puskuri 100:

| Jakso | Palkasta sijoituksiin | Vaje 1 000 €:oon |
|---|---|---|
| 27.11.–26.12. | ~590 € (sis. Caruna 71 €, vastike vielä 625,90) | ~410 € |
| 27.12.– (vastike −296) | ~955 € | ~45 € (vuokratilin 50 € kattaa) |
| ~3/2027 (iPhone pois) | ~990 € | ~10 € |
| ~9/2027 (Roborock pois) | ~1 045 € | — |

Jos Revolut-eläminen nostetaan 1 150 €:oon, vaje tammikuusta ~100–145 €/kk.

## Avoimet päätökset

- **OP Visa Credit 1 315 €:** maksetaanko kerralla Säästötililtä (säästää ~280 €/v) vai
  palkasta vähitellen. Ristiriita: kortti + joulukuun silta (410 €) Säästötililtä veisi
  saldon ~9 300 €:oon, alle hätävaran alarajan (~9 800 €).
- **Joulukuun silta 410 €** sijoituksiin Säästötililtä vai joulukuussa ~590 €.
- **Revolut-elämisraha** 1 050 vs 1 150 € ja taskujen jako.

---

## Kirjauslinjaukset (oma-talous)

- Palkkajakso on ensisijainen näkymä; kalenterikuukausi toissijainen.
- Omat siirrot tilien välillä = neutral. Säästötileillä Kellbergin omat siirrot aina neutral (v1.25.2).
- Perus → Säästölipas -pyöristykset = savings Perus-puolella, lippaan PANO neutral.
- Sähkövaraus (viesti "Sähkövaraus") = Asuminen/needs Perus-puolella; **Caruna-lasku = neutral**.
  Poikkeus: marraskuun 2026 Caruna (70,82 €, erä 27.11.) vaihdetaan käsin Asuminen/needs, koska varausta ei ollut.
- Kortin laskun maksu (OP Visa Credit, Finnair) = neutral; ostot tuodaan korttitilinä.
- Saatu MobilePay-takaisinmaksu kohdistetaan ostoon samalla kategorialla plussalla.
- Remonttiostot omaan asuntoon = kulutusta.
- Revolutin samana päivänä toistuva identtinen rivi saa id-päätteen `_2`, `_3` … (v1.25.1).

## Toimintatapa Claudelle

- Vastaa suomeksi, tiiviisti ja rehellisesti — ei optimismia luvuista.
- Laske luvut kannasta, älä arvioi. Kerro oletukset, jos jokin luku puuttuu.
- D1-korjaukset (puuttuva rivi, sääntö) saa tehdä suoraan; kerro mitä muutit ja rivien id:t.
- Git push ja deploy: anna komennot käyttäjälle, jokainen omana koodilohkonaan.
  Repo Macilla: `~/Documents/Claude/Projects/Oma-talous`.
