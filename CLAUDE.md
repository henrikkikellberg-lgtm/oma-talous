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
