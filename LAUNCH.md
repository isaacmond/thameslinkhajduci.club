# Launch checklist

Everything below is already done except the items marked **YOU**.

## Live

- Production: https://thameslinkhajduci-club.vercel.app (Vercel project `thameslinkhajduci-club`, scope `isaacs-projects-d16aba6d`)
- Code: https://github.com/isaacmond/thameslinkhajduci.club (public)
- Domains attached to the project: `thameslinkhajduci.club` (primary), `www.thameslinkhajduci.club` → 308 redirect to apex, `thameslinkhajduci.com` → 308 redirect to apex. All three are waiting on DNS.

## 1. YOU: point the domains at Vercel (Squarespace DNS)

Status on 4 Sep 2026: **thameslinkhajduci.com is done** and already redirects to .club at Vercel. **thameslinkhajduci.club still has Squarespace's parking records** (four `A` records to 198.185.159.x / 198.49.23.x and `www` → ext-sq.squarespace.com), so it shows Squarespace's "Coming Soon" page. Open the **.club** domain's DNS settings, remove the Squarespace Defaults preset (that is where those parking records live), then add the two `.club` rows below. Give your own browser a few minutes afterwards; the old records have a 4-hour TTL, so a private window or another network shows the change sooner.

In Squarespace → Domains → each domain → DNS settings, add these records. Delete any existing `A` or `CNAME` on the same host first (Squarespace pre-fills its own parking records).

| Domain | Host | Type | Value |
|---|---|---|---|
| thameslinkhajduci.club | `@` | A | `216.198.79.1` |
| thameslinkhajduci.club | `www` | CNAME | `6da2290599e19eb2.vercel-dns-017.com` |
| thameslinkhajduci.com | `@` | A | `216.198.79.1` |
| thameslinkhajduci.com | `www` | CNAME | `6da2290599e19eb2.vercel-dns-017.com` |

**Making .com redirect to .club.** Nothing extra to configure on Vercel: `thameslinkhajduci.com` and `www.thameslinkhajduci.com` are attached to the project as 308 redirects to `thameslinkhajduci.club`, with the path preserved (so `/squad` on .com lands on `/squad` on .club) and HTTPS handled automatically. Once the two `.com` records above resolve, the redirect is live. Alternative if you would rather not touch DNS: Squarespace → Domains → thameslinkhajduci.com → Domain forwarding → forward to `https://thameslinkhajduci.club`, permanent (301), forward path on. Use one method, not both.

Notes:
- `216.198.79.1` is the address Vercel currently recommends for this project; `76.76.21.21` also works if Squarespace rejects the first.
- Leave nameservers as Squarespace's. No need to move DNS.
- Propagation is usually minutes, occasionally an hour. Vercel issues the TLS certificate automatically once it sees the records. Check status any time with `npx vercel domains inspect thameslinkhajduci.club --scope isaacs-projects-d16aba6d`, or in the Vercel dashboard under Project → Settings → Domains.

## 2. Deploys: automatic on push (done)

The Vercel project is linked to `isaacmond/thameslinkhajduci.club`. Every push to `main` builds and goes to production; every other branch or pull request gets a preview URL. Nothing to do. Manual fallback if ever needed:

```bash
npx vercel deploy --prod --scope isaacs-projects-d16aba6d
```

## 3. YOU: tidy the spreadsheet (optional)

See `sheet-fixes/SHEET-ISSUES.md`. The site already normalises opponent names itself, so nothing is broken; this is about making the sheet match. The S1 GW5 score is already corrected to 2–1 in that copy; three S4 scores remain unknown (the legacy workbook has `??` for them too).

## Score submissions

`/submit` lets anyone report a result, scorers, assists, line-up and MOTM. **Nothing is written by the site.** The request is validated (real fixture, real roster names, scorers can't exceed the score) and turned into a message with the exact cells to change in the sheet (tab, cell, value). The submitter can send it to the group chat (WhatsApp share), copy it, or, if they're an admin, open the sheet. You apply it in seconds; the site follows within a minute.

**Email to the admin (Resend, via the Vercel Marketplace).** Every valid submission is emailed to the address in the `SCORE_TO_EMAIL` env var (already set on the project). One step is yours: accept Resend's marketplace terms at https://vercel.com/isaacs-projects-d16aba6d/~/integrations/accept-terms/resend?source=cli, then run `npx vercel integration add resend --no-claim --scope isaacs-projects-d16aba6d` in the repo (or ask me to). That provisions Resend and sets `RESEND_API_KEY` on the project; the next deploy starts sending. Because your Vercel account is the same Gmail address, Resend's default sender reaches it without any DNS work. To send from `scores@thameslinkhajduci.club` instead, verify the domain in the Resend dashboard (it gives you two DNS records for Squarespace) and set `SCORE_FROM_EMAIL`.

Optional extra: `SCORE_WEBHOOK_URL` (Slack or Discord incoming webhook) posts each submission there too.

## Friendlies

Friendlies inside a season: enter the game in the season tab and write `Friendly` in the Type row. Friendlies outside any season: fill in the **Friendlies** tab (in the corrected workbook; or duplicate `Season template`, rename it `Friendlies`, and put `Friendly` in row 16 across B–U). They appear on `/matches`, `/seasons/friendlies` and player match logs, and never count towards records.

## Operating the site

- **Update anything:** edit the Google Sheet. The site re-reads it within 60 seconds. For instant, hit "Force refresh from sheet" on `/data` (or `POST /api/revalidate`).
- **New season:** duplicate the `Season template` tab, name it `S9`, and fill it in. It appears everywhere automatically, including the Money tab's `S9 charges` column.
- **Renames and spellings:** add a row to the `Aliases` tab (player names) or the `Opponents` tab (club names) in the workbook; the site applies it within a minute, no deploy needed.
- **Force refresh** is throttled to once per 20 seconds. Set a `REVALIDATE_SECRET` env var and send it as an `x-revalidate-secret` header to bypass the throttle from a script.
- **Photos, shirt numbers, positions:** add a `Squad` tab with columns `Player, Nickname, Position, Shirt, Photo, Bio` to override the bundled data. Photo is any public image URL.
- **Exports:** `/data` has the point-and-click explorer; `/api/export?table=…&format=csv|json|md` for scripts and Google Sheets `IMPORTDATA`.
- **If the sheet is unreachable** the site keeps serving the last successful read and shows a small "sheet unreachable" badge on the home page.
