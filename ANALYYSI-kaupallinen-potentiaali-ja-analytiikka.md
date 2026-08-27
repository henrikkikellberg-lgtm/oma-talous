# Oma talous — kaupallinen potentiaali & kehitysanalyysi

*Analyysi 3.7.2026 · pohjana koodi (app/index.html v1.4.x, api/, schema), BACKLOG.md, SUUNNITELMA-analytiikka-velat.md sekä tuore markkinakatsaus.*

---

## 1. Tiivistelmä

Oma talous on teknisesti fiksusti rakennettu (Cloudflare-stack, ~0 €/kk käyttökulut, AI-kuittiparsinta) ja sisältää oivalluksia joita kilpailijoilla ei ole — erityisesti suoriteperusteinen "rehellinen kuva velaksi elämisestä" (nettovelkaantuminen, kassavirta, runway). **Kaupallinen potentiaali Suomen kuluttajamarkkinassa on kuitenkin rajallinen ilman automaattista pankkiyhteyttä (PSD2).** CSV-tuontiin perustuva sovellus ei skaalaudu maksavaksi kuluttajatuotteeksi, koska pankkien omat ilmaiset työkalut (OP, Nordea, S-Pankki) ja pankkiyhteydellä varustetut kilpailijat (Bilance, Spiir) asettavat riman. Realistisin polku: (a) pidä henkilökohtaisena supertyökaluna ja jalosta analytiikka huippuun, tai (b) kaupallista kapeaan nicheen — "velkaantumisen rehellinen mittari + AI-kuitit" — Enable Banking -tyyppisen aggregaattorikumppanin kautta.

Analytiikka on nykyisellään suppea: kolme peruspylväskaaviota (kassavirta 12 kk, N/W/S% 6 kk, top-kategoriat YTD) ilman interaktiota, ennusteita tai poikkeamahavaintoja. Luku 5 antaa 12 konkreettista, priorisoitua toimenpidettä.

---

## 2. Nykytilan vahvuudet ja heikkoudet

### Vahvuudet
| Alue | Havainto |
|------|----------|
| Kustannusrakenne | CF Pages + Workers + D1 + R2: käytännössä ilmainen ajaa, skaalautuu halvalla |
| Erottuva idea | Suoriteperusteinen malli: luotto-ostot kuluvat heti, laskun maksu on neutral-siirto → nettovelkaantuminen näkyy rehellisesti. Tätä ei tee OP, Bilance eikä Spiir. |
| AI-syöttö | Kuittikuvien ja pikasyötön Haiku-parsinta on moderni ja harvinainen ilmaisissa sovelluksissa |
| Runway-ajattelu | €/päivä palkkaan, saldoennuste palkkapäivänä — konkreettisempaa kuin kilpailijoiden "kulutit X € ravintoloihin" |
| Design | Selkeä design-järjestelmä (CLAUDE.md), suomenkielinen, mobile-first |

### Heikkoudet (kaupallistamisen näkökulmasta)
1. **Ei pankkiyhteyttä** — CSV-tuonti on tehokäyttäjän työkalu, ei massamarkkinatuote. Tämä on ylivoimaisesti suurin este.
2. **Yhden käyttäjän arkkitehtuuri** — auth on yksi jaettu `APP_SECRET`-bearer, D1:ssä ei `user_id`-saraketta missään taulussa. Monikäyttäjyys vaatii schema- ja API-remontin.
3. **Monoliitti-frontend** — 3 344 riviä yhdessä index.html:ssä. Toimii yhdelle kehittäjälle, mutta hidastaa kasvua ja altistaa regressioille (ei testejä).
4. **GDPR/tietosuoja** — pankkitapahtumat + kuittikuvat ovat henkilötietoa; kaupallinen tuote vaatii tietosuojaselosteen, käsittelysopimukset (Cloudflare, Anthropic) ja poisto-/vientitoiminnot.
5. **Kovakoodauksia** — alkusaldot, tilit ja palkkaoletukset ovat schema.sql:ssä sisäänleivottuina; onboarding puuttuu kokonaan.

---

## 3. Suomen markkina

### Kilpailukenttä
| Kilpailija | Malli | Huomio |
|-----------|-------|--------|
| **Pankkien omat** (OP:n talousseuranta, Nordea, S-Pankki) | Ilmainen, automaattinen | Kova rima: 90 %:lle riittävä. OP kehittää aggregointia aktiivisesti. |
| **Bilance** (EE) | Freemium, PSD2-synkka (OP, Nordea, S-Pankki, Danske, POP, OmaSP, Sp) | Lähin suora kilpailija; 4,5/5 arviot, mutta luottokorttitapahtumien käsittely ontuu — juuri siinä Oma talous on parempi |
| **Spiir** (DK) | Ilmainen, PSD2-synkka | Ilmainen ankkuroi hintatason alas |
| **Penno** (FI) | Manuaalinen syöttö | Osoittaa että manuaalisovelluksella on pieni mutta olemassa oleva yleisö |
| **Spendee, YNAB ym. kv.** | Maksullinen | Ei suomalaisia pankkiyhteyksiä kunnolla / ei suomea |

### Sääntely
Automaattinen tilitietojen haku vaatii joko oman **AISP-rekisteröinnin Finanssivalvonnalta** (riskienhallinta-, raportointi- ja vakuutusvaatimukset — raskas yhdelle hengelle) tai kumppanuuden lisensoidun aggregaattorin kanssa (esim. suomalainen **Enable Banking**, Tink, GoCardless/Nordigen), jolloin toimit heidän lisenssinsä alla ja maksat per käyttäjä/kutsu.

### Realistinen arvio potentiaalista
Markkina on pieni (5,5 M asukasta), maksuhalukkuus matala (pankit + Spiir ilmaisia) ja Bilance on jo ottanut "suomalainen PFM pankkisynkalla" -position. Realistinen katto itsenäiselle maksulliselle tuotteelle lienee **muutamia tuhansia maksavia käyttäjiä (esim. 3–5 €/kk)** — eli sivutulo, ei liiketoiminta. Erottautumiskulmat joilla niche on mahdollinen:

1. **"Rehellinen velkakuva"** — luottokortilla elämisen näkyväksi tekeminen (nettovelkaantuminen, käyttöastetrendi, korkokustannus). Bilancen heikoin kohta, ja ajankohtainen teema kotitalouksien velkaantumiskeskustelussa.
2. **AI-kuitit + pikasyöttö** — rivitason kuittidata (ruokakori-analyysi) jota pankkidata ei koskaan tarjoa.
3. **50/30/20-metodiuskollisuus** — budjetointimetodia tosissaan noudattaville (YNAB-henkinen yleisö suomeksi).

Vaihtoehtoinen kaupallistamispolku ilman kuluttajatuotteen riskiä: julkaise ydinoivallukset (suoriteperusteinen velkalaskenta, runway) avoimena koodina ja rakenna mainetta, tai lisensoi konsepti/komponentit pienpankille tai talousvalmentajille (B2B2C).

---

## 4. Parannettavaa sovelluksessa (yleiset, prioriteettijärjestyksessä)

1. **Onboarding & konfiguroitavuus** — tilit, alkusaldot, palkka ja kategoriat UI:sta, ei schema.sql:stä. Edellytys sekä kaupallistamiselle että omalle ylläpidolle.
2. **Frontendin pilkkominen** — index.html → `js/`-moduulit (state, api, render-per-tab, charts). Ei frameworkia tarvita; ES-moduulit riittävät eikä build-step riko sääntöä #4.
3. **Testit kriittiselle laskennalle** — `monthSummary`, `computeBalances`, `budgetIncomeForMonth`, `expandTx` ovat puhtaita funktioita → helppo yksikkötestata (node + assert riittää `scripts/test.js`:ssä). Double-counting-bugit ovat jo kerran purreet.
4. **Säästötilimallin korjaus** (BACKLOGissa jo tunnistettu) — CAT_DEST pois, puhdas tilikohtainen malli, säästöaste saldojen muutoksesta. Ilman tätä analytiikan nettovarallisuusluvut valehtelevat yläkanttiin.
5. **Monikäyttäjä-auth, jos kaupallistat** — `user_id` kaikkiin tauluihin, magic link / passkey-kirjautuminen (CF Workers + D1 riittää), R2-avaimet käyttäjäkohtaisiksi.
6. **PWA loppuun** — repo:ssa ei ole sw.js:ää vaikka CLAUDE.md sen mainitsee: offline-luku (cache viimeisin data), push-muistutus kuun vaihteen CSV-tuonnista.
7. **Tietoturva** — bearer-tokenin säilytys localStoragessa + rate limit `/receipts/parse`-endpointtiin (Anthropic-kulut), CSV-injektiosuojaus.

---

## 5. Analytiikka: konkreettiset toimet

Nykytila: `renderAnalytiikka()` piirtää kolme staattista pylväskaaviota (kassavirta 12 kk, N/W/S% 6 kk, top 10 kategoriat YTD) + tekstimuotoiset trendivaroitukset. Hyvä pohja — `monthData`-rakenne, `expandTx()` ja Chart.js ovat jo paikoillaan. Alla toimet vaikuttavuus/vaiva-järjestyksessä. Kaikki toteutettavissa nykyisellä stackilla ilman uusia riippuvuuksia (poikkeukset mainittu).

### Taso 1 — nopeat voitot (1–2 h/kpl)

**1. Drill-down kaavioista tapahtumiin.** Chart.js `onClick` → top-kategoriapalkin klikkaus avaa kyseisen kategorian tapahtumalistan (olemassa oleva `renderCatDetail`), kassavirtapalkin klikkaus vaihtaa kuukauden ja hyppää Yhteenvetoon. Muuttaa kaaviot koristeesta työkaluksi. Suurin yksittäinen parannus pienimmällä vaivalla.

**2. Kulutustahti-käyrä (pace line).** Kuluvan kuukauden kumulatiivinen kulutus päivittäin (viiva) vs. edellisten 3 kk keskimääräinen kumulatiivinen käyrä (katkoviiva) vs. lineaarinen budjettitahti. Vastaa kysymykseen "olenko tässä kuussa edellä vai jäljessä" yhdellä vilkaisulla. Data on jo `txsForMonth`-listoissa; `type: 'line'` + `borderDash`.

**3. Tavoiteviivat kaavioihin.** N/W/S-kaavioon vaakaviivat 50/30/20-tasoille ja kassavirtakaavioon nollaviiva korostettuna. Ilman annotation-pluginia: piirrä `type: 'line'` -dataset samaan mixed charttiin. Nyt tavoite lukee vain tekstinä kulmassa.

**4. Kategoria-kuukausivertailu top-kategorioihin.** Top-kategoriat-palkkeihin delta edelliseen 3 kk keskiarvoon: "Ruoka 612 € (+18 % vs 3 kk ka)" tooltippiin ja värikoodaus (punainen = kasvussa). `catTotals`-laskenta per kuukausi on triviaali laajennus nykyiseen YTD-laskentaan.

### Taso 2 — uudet näkymät (0,5–1 pv/kpl)

**5. Kategoria × kuukausi -lämpökartta.** Taulukko: rivit = kategoriat, sarakkeet = 6–12 kk, solun tausta väriskaalalla (surface2 → gold-light → red-light suhteessa rivin keskiarvoon). Paljastaa hiipivät kustannukset (vakuutus nousi, tilaukset kertyvät) paremmin kuin yksikään käyrä. Ei tarvitse Chart.js:ää — HTML-taulukko + inline-tyylit istuu design-järjestelmään.

**6. Nettovarallisuus-trendi.** Viivakaavio: varat (checking+savings) − velat (credit + loans) kuukauden lopun tilanteina, `computeBalances(asOf)` on jo olemassa (Saldot-välilehden kk-valitsin käyttää sitä) ja lainasnapshotit kertyvät `ot_loan_snapshots`iin (huom: nyt vain localStoragessa → laitekohtainen; siirrä D1:een jotta trendi säilyy). Tämä on koko "rehellinen kuva" -filosofian pääkaavio ja puuttuu kokonaan. Kytkeytyy BACKLOGin koontiraportti-visioon (OT+IT).

**7. Toistuvien kulujen tunnistus (tilaukset & kiinteät kulut).** Ryhmittele payee-normalisoinnilla: sama kauppias + sama summa (±5 %) ≥ 3 kk peräkkäin → "Kiinteät kulut" -lista: yhteensä €/kk, osuus tuloista, muutokset ("uusi tilaus havaittu: Disney+ 8,99 €"). Erittäin konkreettinen säästötyökalu ja kaupallisesti kiinnostavin yksittäinen ominaisuus (Bilancella ei ole; kv-sovelluksissa premium-feature).

**8. Korkokulut ja velkaennuste.** `accounts.apr` ja `loans.apr` ovat jo kannassa. Kortti: maksettu korko YTD, ennuste 12 kk nykysaldoilla, "jos lyhennät +100 €/kk → säästät X € ja olet velaton kk/vvvv". Laskuri on olemassa ("Mahtuuko budjettiin?") — tämä on sen peilikuva.

### Taso 3 — isommat (1–3 pv/kpl)

**9. Kassavirtaennuste 3–6 kk eteenpäin.** Toistuvat kulut (kohta 7) + palkka + lainaerät + 3 kk liukuva keskiarvo muuttuvista kuluista → ennustettu tilisaldo ja nettovelka kuukausittain. Runway-kortin logiikka laajennettuna kuukausista eteenpäin. Erottautumistekijä: kukaan Suomi-kilpailijoista ei ennusta.

**10. AI-kuukausikatsaus.** Haiku on jo integroitu (`/receipts/parse`, `/quick/parse`). Uusi endpoint `/insights`: syötä monthData + kategoriadeltat + toistuvat kulut → 3–5 lauseen luonnollinen yhteenveto ("Ruokakulusi kasvoivat kolmatta kuukautta putkeen...") + 1 toimenpide-ehdotus. Muista kriittinen sääntö #1: saldot LEFT JOIN -laskennalla, ei opening_balancesta. Halpa (yksi kutsu/kk/käyttäjä) ja markkinoinnillisesti näyttävin ominaisuus.

**11. Vuosinäkymä.** 12 kk koonti: tulot, kulut, säästöaste, nettovarallisuuden muutos, top-nousijat/laskijat, YoY-vertailu edellisvuoteen kun dataa kertyy. Luonteva paikka myös verovuosi-exportille (CSV).

**12. Kuittirivianalyysi.** Kuittien `parsed_json` sisältää rivitason dataa jota pankkidata ei koskaan tarjoa: ruokakorin jakauma (liha/kasvikset/herkut), yksikköhintojen kehitys, kauppakohtainen hintavertailu. Pitkän tähtäimen erottautuja — kannattaa alkaa kerryttää strukturoitua rividataa nyt vaikka UI tulisi myöhemmin.

### Tekninen huomio
Chart.js riittää tasoille 1–2. Lämpökartta ja vuosinäkymä kannattaa tehdä puhtaalla HTML/CSS:llä (kevyempi, design-järjestelmän mukainen). Jos kaavioiden määrä kasvaa, harkitse Chart.js:n lataamista vain analytiikka-tabissa (`import()` on-demand) — CDN-skripti head:issa hidastaa nyt jokaista käynnistystä mobiilissa.

---

## 6. Suositeltu etenemisjärjestys

1. Analytiikan taso 1 (kohdat 1–4) + säästötilimallin korjaus → analytiikka luotettavaksi ja käyttökelpoiseksi. ~1 vko iltatyönä.
2. Nettovarallisuus-trendi + toistuvat kulut + lämpökartta (5–7) → sovellus kertoo asioita joita OP-mobiili ei kerro.
3. Päätöspiste kaupallistamisesta: jos kyllä → Enable Banking -pilotti (PSD2-synkka), monikäyttäjä-auth, GDPR-paketti, ja markkinointikulmaksi "rehellinen velkakuva + AI-kuitit". Jos ei → kohdat 9–12 omaan käyttöön ja OT+IT-koontiraportti (BACKLOGin iso kuva).

---

## Lähteet

- [Sortter: Testasimme 10 sovellusta talouden hallintaan](https://sortter.fi/blogi/artikkeli/sovellukset-saastamiseen/)
- [Verrattu.fi: Budjetointisovellusvertailu](https://verrattu.fi/budjetti-sovellus-tulojen-ja-menojen-seurantaan/)
- [Naiset puhuu rahasta: Bilance-arvio](https://naisetpuhuurahasta.fi/bilance-budjetointisovellus/)
- [Rahasampo: Bilance-kokemuksia](https://rahasampo.org/bilance-appi-joka-aiheuttaa-morkkista/)
- [Yomio: Paras kulujen seurantasovellus 2026](https://yomio.app/fi/blog/best-expense-tracking-app)
- [Enable Banking — Open Banking Finland](https://enablebanking.com/docs/markets/fi/)
- [Open Banking Tracker: Finland](https://www.openbankingtracker.com/country/finland)
- [Finanssivalvonta: Maksupalvelun tarjoajien toimiluvat ja rekisteröinti](https://www.finanssivalvonta.fi/en/financial-market-participants/banks/authorisations-registrations-and-notifications/payment-service-providers/)
- [Computer Weekly: OP Financial Group open banking](https://www.computerweekly.com/news/252474671/Finlands-OP-Financial-accelerates-open-banking-push)
