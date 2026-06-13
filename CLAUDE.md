# CLAUDE.md — Oma talous PWA

Tämä tiedosto on Claude Code -konteksti. Lue aina ennen kuin teet muutoksia.

## Projekti

Henkilökohtainen budjettiseuranta PWA. Mobile-first. Yksi app joka toimii sekä puhelimessa (kuittisyöttö, kulutuksen seuranta) että desktopissa (CSV-import, analytiikka).

**GitHub:** https://github.com/henrikkikellberg-lgtm/oma-talous  
**Backlog:** `BACKLOG.md` — lue ennen isompia muutoksia

## Stack

| Kerros | Teknologia |
|--------|-----------|
| Frontend | Vanilla JS + CSS, ei frameworkia, ei build steppiä |
| Hosting | Cloudflare Pages (`app/` hakemisto) |
| API | Cloudflare Workers (`api/` hakemisto) |
| Tietokanta | Cloudflare D1 (SQLite) |
| Kuittikuvat | Cloudflare R2 |
| AI-parsinta | Claude Haiku 4.5 (kuittikuvat + pikasyöttö) |

## Cloudflare-resurssit

```
D1 database:  oma-talous-db
D1 ID:        5f4a86cb-8d6d-42db-a541-07f25e6873cd
R2 bucket:    oma-talous-receipts
CF account:   henrikkikellberg-lgtm (tarkista wrangler whoami)
```

## Repo-rakenne

```
oma-talous/
  api/              — Cloudflare Workers (wrangler.toml tässä)
    src/
      index.js
      routes/
  app/              — PWA frontend (Cloudflare Pages deployaa tästä)
    index.html
    manifest.json
    sw.js
    css/
    js/
  scripts/          — Migraatio- ja import-skriptit (ajetaan paikallisesti)
  CLAUDE.md         — tämä tiedosto
  BACKLOG.md        — kehitysjono
  .gitignore
  Makefile
```

## Design-järjestelmä

### Filosofia
Vaalea, siisti finanssimaailma. Ei tummaa teemaa. Luottamus ja selkeys — kuten verkkopankki, mutta omalla persoonallisella värityksellä. Ei gradientteja, ei varjoja, ei efektejä. Flat, korkea kontrasti, reilusti tyhjää tilaa.

### Väripaletti

```css
:root {
  /* Taustat */
  --bg:        #F2F6FA;   /* sivupohja — erittäin vaalea siniharmaa */
  --surface:   #FFFFFF;   /* kortit, modaalit */
  --surface2:  #EAF0F6;   /* sisäiset alueet, hover-tila */
  --border:    #D8E4EE;   /* reunaviivat */

  /* Brändivärit */
  --green:       #1B6B3A; /* metsänvihreä — needs, positiivinen, primary CTA */
  --green-mid:   #2D8A52; /* vaaleampi vihreä — hover-tila */
  --green-light: #E5F2EB; /* vihreä taustaväri, badget */

  --gold:        #B5883E; /* kulta — wants, aksentti, sekundaarinen */
  --gold-light:  #FAF3E6; /* kultataustaväri */

  --blue:        #1A5BAB; /* luottamussininen — tulot, savings, linkit */
  --blue-light:  #E8F0FA; /* sininen taustaväri */

  /* Teksti */
  --text:        #0E1C2D; /* pääteksti — lähes musta, tummansininen sävy */
  --muted:       #5A6E82; /* toissijainen teksti, labelit */
  --dim:         #9AAAB8; /* placeholder, metadata */

  /* Semanttiset */
  --red:         #C0322A; /* ylikulutus, virhe */
  --red-light:   #FBECEB;

  /* Reunat ja säde */
  --radius:    10px;
  --radius-sm:  7px;
  --radius-lg: 16px;
}
```

### Värilogiikka

| Väri | Käyttötarkoitus |
|------|----------------|
| `--green` | Needs-kategoria, tallenna-napit, positiiviset indikaattorit, logo |
| `--gold` | Wants-kategoria, aksentti-elementit, logo-piste |
| `--blue` | Tulot, savings, linkit, informaatiobadget |
| `--red` | Ylikulutus (yli budjetin), virhetilat |
| `--text` | Kaikki otsikot ja pääteksti |
| `--muted` | Labelit, sekundaaritiedot, navlinkit |
| `--dim` | Placeholder-teksti, pienin metadata |

### Typografia

```css
font-family: 'Inter', -apple-system, sans-serif;

/* Koot */
--text-xs:   11px;  /* metadata, badget, uppercase labelit */
--text-sm:   13px;  /* sekundaaritiedot, kategoriat */
--text-base: 15px;  /* perusteksti, kentät */
--text-lg:   18px;  /* section-otsikot */
--text-xl:   22px;  /* kuukauden total, isot numerot */
--text-2xl:  28px;  /* dashboard-pääarvo */

/* Painot */
/* 400 = normaali teksti */
/* 500 = otsikot, napit, labelit */
/* 300 = isot rahasummat (kevyt numero näyttää elegantilta) */
```

Uppercase-labelit: `font-size: 11px; font-weight: 500; letter-spacing: 0.07em; text-transform: uppercase; color: var(--dim)`

### Komponentit

**Kortit:**
```css
background: var(--surface);
border: 0.5px solid var(--border);
border-radius: var(--radius);
padding: 14px 16px;
/* Kategoriakortissa väriaksentti yläreunassa: */
border-top: 2.5px solid var(--green); /* tai --gold tai --blue */
```

**Napit:**
```css
/* Primary */
background: var(--green); color: #fff; border: none;
border-radius: var(--radius); padding: 0 20px; height: 48px;
font-size: 15px; font-weight: 500;

/* Secondary */
background: var(--surface); color: var(--text);
border: 0.5px solid var(--border);

/* Hover: opacity 0.85 tai background: var(--green-mid) */
/* Active: transform: scale(0.97) */
```

**Kenttä (input):**
```css
background: var(--surface2);
border: 1px solid var(--border);
border-radius: var(--radius-sm);
padding: 12px 14px;
color: var(--text); font-size: 15px;
/* Focus: border-color: var(--green) */
```

**Tapahtumarivi (tx-item):**
```css
display: flex; align-items: center; gap: 10px;
padding: 10px 12px;
background: var(--surface);
border: 0.5px solid var(--border);
border-radius: var(--radius-sm);
```

**Edistymispalkki:**
```css
height: 3px; background: var(--surface2); border-radius: 2px;
/* täyttö: */
height: 3px; border-radius: 2px; background: var(--green);
/* ylikulutus: background: var(--red) */
```

**FAB (mobiili-pohjanapepi):**
```css
position: fixed; bottom: 24px;
/* Primary FAB: */
background: var(--green); color: #fff; height: 52px;
border-radius: 14px; font-size: 15px; font-weight: 500;
```

**Modaali (bottom sheet mobiilissa):**
```css
background: var(--surface);
border-radius: 24px 24px 0 0;
padding: 12px 20px 40px;
/* overlay: rgba(0,0,0,0.5) */
```

### Logo
```
oma·talous   (piste kultaisena: color: var(--gold))
```
Fontti: Inter 500. Koko: 14px desktopissa, 13px mobiilissa.

### Mobiili-spesifiset säännöt
```css
/* Sivumarginaalit mobiilissa */
padding: 0 16px;

/* Maksimileveys keskitetty */
max-width: 430px; margin: 0 auto;

/* Safe area iPhonessa */
padding-bottom: env(safe-area-inset-bottom, 24px);

/* Ei tap-highlight */
-webkit-tap-highlight-color: transparent;
```

### Animaatiot
Minimalistiset, nopeat:
```css
transition: all 0.15s ease;      /* napit, hover */
transition: width 0.4s ease;     /* edistymispalkit */
transition: opacity 0.25s ease;  /* toast-viestit */
/* Ei muita animaatioita */
```

---

## Kriittiset säännöt

1. **Ei tokeneita tai secreteja koodissa.** API-avaimet aina ympäristömuuttujina (`wrangler secret put` tai CF Dashboard). `.env` on gitignoressa.
2. **Kuittikuvat resizataan ennen lähetystä** — max 1024px leveys, ~300 KB JPEG. Tehdään client-puolella Canvas API:lla ennen R2-uploadia ja Claude API -kutsua.
3. **budjetti-2.html säilyy koskemattomana** migraation aikana. Se on käytössä rinnalla kunnes uusi app on valmis.
4. **Ei frameworkeja frontendissä.** Vanilla JS, ei npm-riippuvuuksia app/-hakemistossa.
5. **D1-kyselyt Workers-koodissa** — ei suoria D1-kutsuja frontendistä.

## Git-workflow

```bash
# Nopea commit + push (käytä Makefileä):
make push m="kuvaava viesti"

# Tai suoraan:
git add -A && git commit -m "viesti" && git push origin main
```

Commit-viestit suomeksi tai englanniksi, lyhyt ja kuvaava.

## Ympäristömuuttujat (Workers)

Aseta `wrangler secret put` -komennolla tai CF Dashboardissa:

```
ANTHROPIC_API_KEY   — Claude API kuittiparsintaan
APP_SECRET          — Bearer token auth (keksi itse, pitkä random string)
```

## Kehitysjärjestys

1. `api/` — D1 schema + Workers API endpointit
2. `scripts/` — migraatio budjetti-2.html JSON:ista D1:een
3. `app/` — PWA frontend, mobile-first

## Testaus

- API: `wrangler dev` (lokaali dev-serveri)
- Frontend: suoraan selaimessa tai `wrangler pages dev app/`
- iPhone: deploy CF Pagesiin → Safari → "Lisää kotinäyttöön"
