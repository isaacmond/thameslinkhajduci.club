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

## 3. The records database (source of truth)

The site's records live in **Neon Postgres** (Vercel Marketplace, project `thameslinkhajduci-club`), read through Drizzle ORM. The Google Sheet is retired: it was imported once and the Data page offers the whole dataset as a downloadable spreadsheet (`/api/export?format=xlsx`) whenever you want one. If `DATABASE_URL` is missing the site falls back to reading the sheet, which is how it ran before the import.

- **Schema** is `src/db/schema.ts`. Change it, run `npm run db:generate` (writes a SQL migration into `drizzle/`), commit both. `npm run db:migrate` applies pending migrations and runs automatically before every build, so a deploy never runs ahead of its schema.
- **Done on 4 Sep 2026**: Neon provisioned (`neon-aureolin-coin`), migrations applied, the live sheet imported once. The import code stays in `src/lib/db-import.ts` for the tests, but there is no command for it any more: against the live database it would wipe everything recorded since.
- **Backups**: `scripts/backup.mjs` downloads the whole dataset (workbook + JSON) into `~/Documents/Documents/Thameslink Hajduci/` as `records-<date>.*` plus `records-latest.*`, once a day. It runs automatically whenever Claude Code opens this project (`.claude/settings.json` SessionStart hook) and by hand with `npm run backup` (`--force` to redo today's). That folder syncs to Google Drive, so anyone you share it with can open the spreadsheet. The JSON is what you would restore from.
- **Tests** run the real migrations on an in-process Postgres (`tests/db.ts`); `tests/db-roundtrip.test.ts` proves the database reproduces the sheet stat for stat, and `tests/writes.test.ts` covers every write.
- `npm run db:studio` opens Drizzle Studio on the live database for a look around.

## Submissions (scores, payments, new players)

`/submit` has three tabs. Each request is validated against the real fixture list, roster and money table and turned into a typed change.

- **Signed-in members** (see below): the change is written to the records immediately and the site follows within a minute. The email you get is a copy.
- **Everyone else**: the change goes into the **approval queue** on the admin page (`/admin#pending`) and you are emailed. One tap records it, one tap bins it. Nothing changes on the site until then.
- **Match result** (`/submit`): result, scorers, assists, line-up and MOTM. Submitting again for the same fixture is a correction and replaces the earlier line-up.
- **Payment** (`/submit?type=payment`): who paid, who they paid (defaults to the season's pitch payer), how much, when, a reference. The form pre-fills what they owe.
- **New player** (`/submit?type=player`): name, nickname, positions, shirt number (checked against numbers in use), photo link. They join the current season's team sheet.

**Email (Resend, via the Vercel Marketplace).** Every submission is emailed to `SCORE_TO_EMAIL`. Mail comes from `scores@thameslinkhajduci.club` (domain verified in Resend 4 Sep; `SCORE_FROM_EMAIL`), so it reaches anyone. Optional: `SCORE_WEBHOOK_URL` (Slack or Discord) posts each submission there too. Notifications are capped at 20 an hour per instance.

## Signing in (WorkOS AuthKit)

Email and password, hosted by WorkOS. Members sign in from the header; the first time they use **Sign up** with an address on the members list. Signed in, they get `/account`: their own profile (photo, nickname, positions, shirt number, bio, first and last name) and direct recording of their submissions.

- **Members list**: the admin adds or removes addresses on `/admin#members` (pick the player, type the email; effective within seconds, no deploy). Nothing is hard-coded: the `members` table is the whole list. You cannot remove your own address or the last admin's.
- **Team sheet & reminders**: on `/admin#squad` pick the fixture, tick who is expected, add a note, save. At 18:00 UK time the day before a game (`vercel.json` crons at 17:00 and 18:00 UTC → `/api/cron/reminders`, which only sends on the run that is 18:00 in London; guarded by `CRON_SECRET`) everyone picked who has an address on the members list gets an email with the when, where, squad and note; "Send reminder now" does the same immediately. Players without an address are flagged so you can chase them in the chat. The fixture page shows the expected squad.
- **Admin** (you, and anyone you flag with "Make admin" on the members list): `/admin` has the approval queue, the team sheet, the members list and the **seasons & fixtures** editor: add next week's game, fix a date or opponent, mark a forfeit, start a new season (id like `S9`, pitch cost per game, who pays the pitch).
- **WorkOS dashboard**: the callback `https://thameslinkhajduci.club/callback` is registered. Under **Applications → your app → Redirects**, set the Initiate login URL to `https://thameslinkhajduci.club/sign-in` and the Sign-out URI to `https://thameslinkhajduci.club/`; the sign-out button errors until the latter exists. Branding assets are on your Desktop in `workos-branding/`.
- Env on Vercel: `WORKOS_API_KEY` (live key on production), `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD`, `NEXT_PUBLIC_WORKOS_REDIRECT_URI`. Photos go to the Vercel Blob store `hajduci-media` (`BLOB_READ_WRITE_TOKEN`).

## Friendlies

Friendlies inside a season: add the fixture in the seasons & fixtures editor with type **Friendly**. Friendlies outside any season live in the `FR` season. They appear on `/matches`, `/seasons/friendlies` and player match logs, and never count towards records.

## Operating the site

- **Update anything:** sign in and use Submit, your account page (profile) or `/admin` (everything else). The site re-reads the records within 60 seconds of any change (or hit "Force refresh" on `/data`).
- **New season:** `/admin` → Seasons & fixtures → New season, then add its fixtures. It appears everywhere automatically, including the money page.
- **Renames and spellings:** player and opponent aliases from the sheet were imported into the `aliases` and `opponent_aliases` tables; edit them in Drizzle Studio for now.
- **Money:** a player's charge for a game is the pitch cost split between everyone who played; whoever is the season's "pitch paid by" is credited every played game's cost. Payments logged through Submit reduce what people owe. Tracking starts at the season in the `money_from_season` setting (S8).
- **Health:** `/data` lists anything inconsistent in the records (scorers v goals, MOTM not in the line-up, overdue scores).
