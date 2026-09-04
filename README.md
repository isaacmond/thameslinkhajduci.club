# Thameslink Hajduci · thameslinkhajduci.club

The website of Thameslink Hajduci, a six-a-side football club from East London that has been running approximately twelve minutes late since 2024.

**Everything on the site is read live from the club's Google Sheet.** There is no database, no admin panel and no upload form. Change the sheet, and the site follows within a minute.

## How it works

- **Source of truth:** the [club spreadsheet](https://docs.google.com/spreadsheets/d/1nCwz2uInlh3gePYORxvW3_0SlpFS8KgRxCCoccvw9zA/edit). One tab per season (`S1`, `S2`, …) plus `Money` and `Payments`. The site downloads the workbook as `.xlsx` and parses it in `src/lib/sheet.ts`.
- **Caching:** the fetch is cached for 60 seconds (Next.js data cache, tag `sheet`). `POST /api/revalidate` forces a re-read; the Data page has a button for it.
- **Rules:** friendlies and forfeits (the `Type` row, or anything in a `Friendlies` tab) are shown but excluded from W/D/L, goals and player totals. The sheet's champagne-moment row is ignored. Whoever is named in a season's "Paid by" cell is credited the pitch cost of played games. Goals-per-game only counts games where scorers were logged; assists-per-game only counts games where assists were logged. Opponent names are normalised so head-to-head records line up.
- **Profile extras:** photos, shirt numbers and positions come from `src/lib/squad-extras.json` (carried over from the old team app). A tab called `Squad` in the sheet (`Player, Nickname, Position, Shirt, Photo, Bio`) overrides it field by field.
- **Names without deploys:** optional `Aliases` (`From, To`) and `Opponents` (`Spelling, Canonical`) tabs are read live and applied on top of the built-in maps.
- **Resilience:** the workbook fetch retries, a per-request/parse cache avoids re-parsing, an in-memory last-good copy and a build-time snapshot (`scripts/snapshot.mjs`) serve stale data if Google is unreachable, and `/api/health` reports status plus records-health findings.

## Pages

`/` home (departures board, talking points, milestone watch) · `/squad` and `/squad/[player]` (form, streaks, attendance, insights) · `/matches` and `/matches/[id]` (match report, or a pre-match forecast for fixtures) · `/opponents` and `/opponents/[slug]` (head-to-head history with generated roundels) · `/compare?a=&b=` (two players side by side) · `/seasons`, `/seasons/[id]` (tube-line season diagram, golden-boot race, points race) and `/seasons/friendlies` · `/stats` · `/records` · `/money` · `/data` (exports, records health) · `/submit` (score submissions, validated and handed to the admin for approval; optional `SCORE_WEBHOOK_URL` posts them to Slack/Discord) Three kinds: match result, payment, new player. Each becomes an approval request (email + group-chat text) with the exact sheet cells to change; the site never writes to the sheet.

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

Environment variables (all optional): `SHEET_ID` to point at a different spreadsheet, `NEXT_PUBLIC_SITE_URL` for absolute URLs in metadata and the API docs, `SCORE_TO_EMAIL` + `RESEND_API_KEY` (Resend via the Vercel Marketplace) to email score submissions to the admin, `SCORE_FROM_EMAIL` to send from a verified domain, `SCORE_WEBHOOK_URL` to also post them to a Slack/Discord webhook.

## Stack

Next.js 16 (App Router, ISR), React 19, Tailwind CSS 4, Recharts, SheetJS for the workbook parsing, Bebas Neue + Inter. Hosted on Vercel.

## Spreadsheet audit

`sheet-fixes/` holds an audit of the sheet's data quality, a corrected copy of the workbook, and the list of cell edits it contains.

## Sponsors

With thanks to our partners Transport for London, Thameslink, Lime and Deliciously Ella.
