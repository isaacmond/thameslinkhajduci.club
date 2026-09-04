# Thameslink Hajduci · thameslinkhajduci.club

The website of Thameslink Hajduci, a six-a-side football club from East London that has been running approximately twelve minutes late since 2024.

**The club's records live in a Postgres database (Neon) and the site is the way in.** Members sign in to record results, payments and new players and to edit their own profile; the admin approves anything sent in anonymously, sets team sheets, and manages seasons, fixtures and members from `/admin`. Every page follows within a minute of a change.

## How it works

- **Source of truth:** Postgres, through Drizzle ORM (`src/db/schema.ts`, migrations in `drizzle/`, loader in `src/lib/db-data.ts`). The records were imported once from the club's old Google Sheet on 4 Sep 2026; `src/lib/sheet.ts` still parses that workbook format for the tests. `/api/export?format=xlsx` downloads everything as a spreadsheet.
- **Caching:** the fetch is cached for 60 seconds (Next.js data cache, tag `sheet`). `POST /api/revalidate` forces a re-read; the Data page has a button for it.
- **Rules:** friendlies and forfeits (the `Type` row, or anything in a `Friendlies` tab) are shown but excluded from W/D/L, goals and player totals. Whoever is named in a season's "Paid by" cell is credited the pitch cost of played games. Goals-per-game only counts games where scorers were logged; assists-per-game only counts games where assists were logged. Opponent names are normalised so head-to-head records line up.
- **Profiles:** photos, nicknames, shirt numbers, positions and bios live on the `players` table (members edit their own on `/account`; photos go to Vercel Blob). `src/lib/squad-extras.json` is the baseline carried over from the old team app for players who have never edited theirs.
- **Names without deploys:** optional `Aliases` (`From, To`) and `Opponents` (`Spelling, Canonical`) tabs are read live and applied on top of the built-in maps.
- **Resilience:** the workbook fetch retries, a per-request/parse cache avoids re-parsing, an in-memory last-good copy and a build-time snapshot (`scripts/snapshot.mjs`) serve stale data if Google is unreachable, and `/api/health` reports status plus records-health findings.

## Pages

`/` home (departures board, talking points, milestone watch) · `/squad` and `/squad/[player]` (form, streaks, attendance, insights) · `/matches` and `/matches/[id]` (match report, or a pre-match forecast for fixtures) · `/opponents` and `/opponents/[slug]` (head-to-head history with generated roundels) · `/compare?a=&b=` (two players side by side) · `/seasons`, `/seasons/[id]` (tube-line season diagram, golden-boot race, points race) and `/seasons/friendlies` · `/stats` · `/records` · `/money` · `/data` (exports, records health) · `/submit` (match result, payment or new player: recorded immediately for signed-in members, queued for the admin otherwise; the admin is emailed either way and `SCORE_WEBHOOK_URL` can post to Slack/Discord) · `/account` (your profile) · `/admin` (approvals, team sheet and reminder emails, members, seasons & fixtures).

## API

```
GET  /api/data                       full normalised dataset (JSON), ?pretty=1 for humans
GET  /api/export?table=<t>&format=csv|json|md[&season=S7]
     tables: players, matches, seasons, appearances, goals, assists, opponents, money, payments
POST /api/revalidate                 re-read the sheet now
```

CORS is open. Handy in Google Sheets: `=IMPORTDATA("https://thameslinkhajduci.club/api/export?table=players&format=csv")`.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (fetches the sheet at build time)
npm run lint
```

Environment variables: `DATABASE_URL` (Neon, set by the Vercel Marketplace integration; without it the site falls back to reading the old workbook), `WORKOS_API_KEY` + `WORKOS_CLIENT_ID` + `WORKOS_COOKIE_PASSWORD` + `NEXT_PUBLIC_WORKOS_REDIRECT_URI` (sign-in), `BLOB_READ_WRITE_TOKEN` (profile photos), `RESEND_API_KEY` + `SCORE_TO_EMAIL` + `SCORE_FROM_EMAIL` (email), `CRON_SECRET` (the daily reminder cron), and optionally `SCORE_WEBHOOK_URL` (Slack/Discord) and `NEXT_PUBLIC_SITE_URL`.

## Stack

Next.js 16 (App Router, ISR), React 19, Tailwind CSS 4, Recharts, SheetJS for the workbook parsing, Bebas Neue + Inter. Hosted on Vercel.

## Spreadsheet audit (historical)

`sheet-fixes/` holds the audit of the old Google Sheet's data quality, the corrected copy of the workbook that seeded the database, and the list of cell edits it contained. It is kept as the record of where the numbers came from; the tests still parse it.

## Sponsors

With thanks to our partners Transport for London, Thameslink, Lime and Deliciously Ella.
