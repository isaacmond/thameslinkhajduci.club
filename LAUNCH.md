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

## Submissions (scores, payments, new players)

`/submit` has three tabs. **Nothing is written by the site.** Each request is validated, turned into a message with the exact cells to change in the sheet, emailed to you (once Resend is switched on, below) and handed back to the submitter to post in the group chat. You apply it in seconds; the site follows within a minute.

- **Match result** (`/submit`): result, scorers, assists, line-up and MOTM for a real fixture. Scorers can't exceed the score, names must be on the roster, six submissions a minute per address. The message lists the season-tab cells (e.g. `F5=3, F6=1, F22=1`).
- **Payment** (`/submit?type=payment`): who paid, who they paid, how much, when, and a reference. The form pre-fills what the sheet says they owe and defaults the recipient to the season's "Paid by"; picking anyone else is allowed but the email flags it so you can decide who gets credited. The message gives the next free row of the `Payments` tab (Date, Player, Amount, Note) and says what will be left to pay. The recipient goes into the Note ("paid to X") unless you add a **Paid to** column to the `Payments` tab, in which case the site fills that column instead and shows the recipient on the Money page and in the data export. Player pages and the Money page link straight to it.
- **New player** (`/submit?type=player`): full name (must not already exist), nickname, position(s), shirt number (checked against numbers already worn), optional photo link. The message gives the first free roster row in the current season tab (the goals and assists grids follow the name automatically), plus `All-time` and `Money`, and the Squad-tab row if you have added one. The Squad page links to it.

**Email to the admin (Resend, via the Vercel Marketplace).** Done: Resend is provisioned (resource `resend-email-aquamarine-harbor`, region eu-west-1) and connected to the project, which set `RESEND_API_KEY` and `RESEND_EMAIL_DOMAIN`; every valid submission is emailed to the address in `SCORE_TO_EMAIL`. Until the domain is verified, mail goes out from Resend's default sender (`onboarding@resend.dev`), which only delivers to the Resend account's own address, i.e. yours. To send from `scores@thameslinkhajduci.club` (and to any recipient), add these three records in Squarespace's DNS panel for thameslinkhajduci.club, then set `SCORE_FROM_EMAIL` to `Thameslink Hajduci <scores@thameslinkhajduci.club>` on Vercel (or ask me to):

| Host | Type | Value | Priority |
| --- | --- | --- | --- |
| `resend._domainkey` | TXT | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDheGgSb3NH1H1TThjAubYAbWCNMaKY24Uyf6ZFHLFEUmPA4zIF05tbXW4S1OGBxBOAeUd1kqLATw+50c3TrOeH48IbhS7rgE1zS/mqtr8rwiu2nF3cfIVtMnnzK3wtYWT1IPMTP5AXgZknVDRetwfFyidZh52uV75/SOsuLYq4fwIDAQAB` | |
| `send` | MX | `feedback-smtp.eu-west-1.amazonses.com` | 10 |
| `send` | TXT | `v=spf1 include:amazonses.com ~all` | |

Resend re-checks automatically (status at https://resend.com/domains, or `vercel integration open resend`). The same three records are already in Vercel's DNS for the domain, so they take effect on their own if you ever switch the nameservers to Vercel.

Optional extra: `SCORE_WEBHOOK_URL` (Slack or Discord incoming webhook) posts each submission there too. Notifications are capped at 20 an hour per server instance so a prankster cannot burn the email quota; over the cap the submitter still gets the message to copy.

## Signing in (WorkOS AuthKit)

Members on the list in `src/lib/members.ts` can sign in (header "Sign in" link, or `/sign-in`). Signed in, they get `/account`: their own profile (photo, nickname, positions, shirt number, bio, first and last name) and their submissions on `/submit` are **written straight into the sheet** instead of emailed for approval (the email still arrives, as a record). Everyone else keeps the approval flow. The list is currently Isaac (two addresses) and Phil; add a line per person, or set `MEMBERS_JSON` on Vercel to a JSON array of `{ "player": "Name as in the sheet", "emails": ["..."] }` for additions without a deploy.

Set up, in order (the site runs fine with sign-in hidden until all of it is done):

1. **WorkOS dashboard** (https://dashboard.workos.com, the environment whose API key is on Vercel): the client ID is already on Vercel. The redirect URI `https://thameslinkhajduci.club/callback` is registered (done through the API, 4 Sep). Two settings are dashboard-only: open **Applications** in the left sidebar, pick the application, then the **Redirects** tab, and set the **Initiate login URL** to `https://thameslinkhajduci.club/sign-in` and the **Sign-out URI** to `https://thameslinkhajduci.club/`. Without the sign-out URI the "Sign out" button errors. For local development add `http://localhost:3000/callback` as a redirect URI on the same tab (or in the staging environment with its own keys). Sign-in is **email + password** (AuthKit's default; leave Google and the other providers off). Members create their account the first time from the sign-in page's "Sign up" link using an address on the list. The header shows "Sign in" once `WORKOS_CLIENT_ID`, `WORKOS_API_KEY` and `WORKOS_COOKIE_PASSWORD` are all present; all three are set on production (live-environment key and client ID, 4 Sep).
2. **Google service account** (lets the site write to the sheet): in https://console.cloud.google.com create or pick a project, enable the **Google Sheets API**, create a **service account**, create a **JSON key** for it, and share the records sheet with the service account's email as an **Editor**. Then `npx vercel env add GOOGLE_SERVICE_ACCOUNT_JSON production` and paste the whole JSON file as the value (also `development` for local runs), and redeploy. Until this exists, signed-in members see their account page but saving says it is not switched on, and their submissions fall back to the approval email.
3. **Photos** live in the Vercel Blob store `hajduci-media` (already created and connected; `BLOB_READ_WRITE_TOKEN` is set). The sheet gets the public URL in the Squad tab's Photo column.

Profiles are stored on a **Squad** tab in the sheet (columns Player, Nickname, Position, Shirt, Photo, Bio, Updated). The site creates the tab and header the first time someone saves; you can edit it by hand too, it is read like any other tab.

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
