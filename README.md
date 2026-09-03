# Thameslink Hajduci · thameslinkhajduci.club

The website of Thameslink Hajduci, a six-a-side football club from East London that has been running approximately twelve minutes late since 2024.

**Everything on the site is read live from the club's Google Sheet.** There is no database, no admin panel and no upload form. Change the sheet, and the site follows within a minute.

## How it works

- **Source of truth:** the [club spreadsheet](https://docs.google.com/spreadsheets/d/1nCwz2uInlh3gePYORxvW3_0SlpFS8KgRxCCoccvw9zA/edit). One tab per season (`S1`, `S2`, …) plus `Money` and `Payments`. The site downloads the workbook as `.xlsx` and parses it in `src/lib/sheet.ts`.
- **Caching:** the fetch is cached for 60 seconds (Next.js data cache, tag `sheet`). `POST /api/revalidate` forces a re-read; the Data page has a button for it.
- **Rules:** friendlies and forfeits (the `Type` row) are shown but excluded from W/D/L, goals and player totals. Goals-per-game only counts games where scorers were logged; assists-per-game only counts games where assists were logged. Opponent names are normalised so head-to-head records line up.
- **Profile extras:** photos, shirt numbers and positions come from `src/lib/squad-extras.json` (carried over from the old team app). A tab called `Squad` in the sheet (`Player, Nickname, Position, Shirt, Photo, Bio`) overrides it field by field.

## Pages

`/` home · `/squad` and `/squad/[player]` · `/matches` and `/matches/[id]` · `/seasons` and `/seasons/[id]` · `/stats` · `/records` · `/money` · `/data`

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

Environment variables (all optional): `SHEET_ID` to point at a different spreadsheet, `NEXT_PUBLIC_SITE_URL` for absolute URLs in metadata and the API docs.

## Stack

Next.js 16 (App Router, ISR), React 19, Tailwind CSS 4, Recharts, SheetJS for the workbook parsing, Bebas Neue + Inter. Hosted on Vercel.

## Spreadsheet audit

`sheet-fixes/` holds an audit of the sheet's data quality, a corrected copy of the workbook, and the list of cell edits it contains.

## Sponsors

With thanks to TfL, Thameslink, Lime and Deliciously Ella, none of whom know we exist.
