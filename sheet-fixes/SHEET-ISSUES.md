# Spreadsheet audit · 3 Sep 2026

The site reads the Google Sheet as-is, so anything odd in the sheet shows up on the site. This is what the parser found when it read every tab, what has been fixed in the corrected copy, and what needs a human.

## What's in this folder

- `thameslink-hajduci-corrected.xlsx`: the whole workbook with the 29 opponent-name fixes below applied, plus the S1 GW5 score corrected to 2–1 (Isaac, 4 Sep 2026). Nothing else touched. Formulas, dates, column widths and the Payments dropdown are preserved.
- `changes.csv`: the same edits as a flat list (29 opponent names, the S1 GW5 score, the Money Paid formula and header, the Robin Watson and Eddie McLaughlin renames).

## How to apply

**Option A (recommended, 5 minutes): make the 31 cell edits by hand** using the table in section 1 plus the two cells in 2.1. Nothing else changes and you keep the sheet's revision history intact.

**Option B: replace the whole spreadsheet.** In the Google Sheet: File → Import → Upload → pick `thameslink-hajduci-corrected.xlsx` → Import location "Replace spreadsheet". The URL and sheet ID stay the same, so the site keeps working. Afterwards check that the All-time tab still recalculates (it uses `INDIRECT`, which Sheets supports) and that the Payments tab's dropdown survived. Tab `gid`s may change, which does not matter to the site (it finds tabs by name).

Either way the site picks the change up within a minute, or instantly via the "Force refresh" button on the Data page.

## 1. Fixed in the corrected copy: opponent names (29 cells)

The same club was spelled up to five different ways, which split head-to-head records. Standardised to one spelling each. The site also applies these aliases itself, so the site is right either way; fixing the sheet just makes the sheet right too.

| Tab | Cell | Was | Now |
|---|---|---|---|
| S2 | G5 | Dalston | Dalston Eagles |
| S3 | C5 | Enjoy your Mane Jane | Enjoy Your Mane Jane |
| S3 | E5 | Dign Cats | Ding Cats |
| S3 | L5 | Ding cats | Ding Cats |
| S3 | O5 | Enjoy your Mane Jane | Enjoy Your Mane Jane |
| S4 | E5 | Enjoy your Mane Jane | Enjoy Your Mane Jane |
| S4 | G5 | Spudos FC | Spudos |
| S4 | I5 | DingCats | Ding Cats |
| S4 | K5 | Old ivy | Old Ivy |
| S4 | M5 | Enjoy your mane Jane | Enjoy Your Mane Jane |
| S5 | D5 | Enjoy your mane Jane | Enjoy Your Mane Jane |
| S5 | E5 | Old ivy | Old Ivy |
| S5 | F5 | Not Very often | Not Very Often |
| S5 | G5 | britannias | The Britannias |
| S5 | H5 | DingCats | Ding Cats |
| S5 | I5 | Dukes | Dukes Select |
| S5 | J5 | Old ivy | Old Ivy |
| S5 | K5 | Enjoy | Enjoy Your Mane Jane |
| S5 | L5 | Britannias | The Britannias |
| S5 | N5 | DingCats | Ding Cats |
| S5 | O5 | Not very often | Not Very Often |
| S6 | B5 | Mane Jane | Enjoy Your Mane Jane |
| S6 | H5 | Old Ivy FC | Old Ivy |
| S6 | J5 | enjoy your mane | Enjoy Your Mane Jane |
| S6 | O5 | Cottesmore | Cottesmore FC |
| S7 | B5 | Enjoy your Mane Jane | Enjoy Your Mane Jane |
| S7 | I5 | Oly Ivy | Old Ivy |
| S7 | J5 | Enjoy your mane Jane | Enjoy Your Mane Jane |
| S7 | P5 | Xzr Fc | XZR FC |

## 2. Decisions and open questions

### 2.1 Season 1, GW5 vs Clapham Casuals: now 2–1 (applied)
Both spreadsheets had **1–2**, but two Hajduci scorers and two assists are logged and the old app said **2–1**. Isaac confirmed 2–1 on 4 Sep 2026, so the corrected copy sets tab **S1** cells **F6** (Our goals) → `2` and **F7** (Their goals) → `1`. Score/Result recalculate. Season 1 becomes W3 D1 L6 and the all-time record gains a win. If you apply edits by hand, these two cells are part of the list.

### 2.2 Season 4, three games with no score (not recoverable from the legacy sheet)
GW9 (28 Aug 2025 vs Dukes Select), GW10 (4 Sep 2025 vs Old Ivy) and GW12 (18 Sep 2025 vs Enjoy Your Mane Jane) have appearance marks but no score. The legacy workbook (`Thameslink Haiduci.xlsx`) also records them as `??`, and its Goals grid matches the new sheet game for game, so there is nothing to copy across. The site counts the appearances (as the sheet's All-time tab does) but they don't count as played games for W/D/L. If anyone remembers the scores, fill in rows 6 and 7 for those columns.

### 2.3 Goals scored but nobody credited
Per your rule these games are now **excluded from every player's goals-per-game denominator**. The legacy workbook has no scorers for them either. If the scorers are known, fill them in and they'll count again.

| Game | Opponent | Score |
|---|---|---|
| S4 GW3 | Green of the South | 4–8 |
| S4 GW14 | Green of the South | 2–4 |
| S7 GW13 | Green of the South | 3–9 |

(Forfeits also have no scorers, but they are already excluded from all records.)

### 2.4 Only some scorers credited (18 games)
These games **do** count towards goals-per-game (someone's goals were recorded), but the totals won't add up to the team score until the missing scorers are filled in.

| Game | Opponent | Score | Scorers logged |
|---|---|---|---|
| S1 GW6 | MBS | 5–9 | 4 of 5 |
| S2 GW1 | Dalston Eagles | 3–10 | 2 of 3 |
| S2 GW3 | LCG United | 2–5 | 1 of 2 |
| S2 GW4 | Brighton | 8–2 | 3 of 8 |
| S2 GW5 | City ACS | 4–3 | 3 of 4 |
| S2 GW7 | Mutus | 2–11 | 1 of 2 |
| S2 GW8 | LCG United | 5–4 | 4 of 5 |
| S3 GW5 | Old Ivy | 4–8 | 3 of 4 |
| S4 GW1 | Dukes Select | 3–8 | 2 of 3 |
| S5 GW3 | Enjoy Your Mane Jane | 2–4 | 1 of 2 |
| S5 GW12 | Green of the South | 2–10 | 1 of 2 |
| S6 GW1 | Enjoy Your Mane Jane | 3–11 | 1 of 3 |
| S6 GW2 | MOB FC | 8–2 | 5 of 8 |
| S6 GW3 | Cottesmore FC | 4–7 | 3 of 4 |
| S6 GW10 | Vauban FC | 6–4 | 3 of 6 |
| S7 GW11 | Vauban FC | 6–10 | 3 of 6 |
| S7 GW12 | The Britannias | 4–6 | 3 of 4 |
| S7 GW15 | XZR FC | 6–1 | 2 of 6 |

### 2.5 Assists are patchy
Assists are logged in only **16 of the 79 games** in which Hajduci scored. Per your rule, assists-per-game only counts those 16 games (plus 0–0s and games where we didn't score). Expect the assists-per-game numbers to look high and jumpy until assists are recorded more consistently. The site labels the denominator everywhere it shows the rate.

### 2.6 Champagne moments
The site no longer shows champagne moments anywhere (Isaac, 4 Sep 2026), so the "Abdul" entry in S1 GW5 is harmless. The column can stay in the sheet for posterity or go; the site ignores it.

### 2.7 Opponent recorded as "Forfeit"
S3 GW1 and S7 GW10 have "Forfeit" in the Opponent cell. Harmless (they are excluded from records anyway) but if you know who forfeited, putting the club name in and leaving "Forfeit" in the Type row keeps the fixture list honest.

## 2.8 Money: the pitch payer was never credited (fixed in the corrected copy)
The Money tab's **Paid** column only summed the Payments tab, so whoever pays for the pitch (row 2, "Season paid by") was charged their share like everyone else and shown as owing it. The corrected copy changes `Money!F4:F31` to:

```
=SUMIF(Payments!$B:$B,$A4,Payments!$C:$C)
 +IF($A4=$B$2,IFERROR(SUMPRODUCT((INDIRECT("'"&B$1&"'!$B$14:$U$14")>0)*INDIRECT("'"&B$1&"'!$B$13:$U$13")),0),0)
 +IF($A4=$C$2, … same for column C …)+IF($A4=$D$2, … same for column D …)
```

That is: transfers received **plus** the pitch cost of every played game in any season that player paid for. With one S8 game played, Isaac is now shown as **owed £68.53** (paid £79.95, own share £11.42) and the other six players owe £11.42 each, which adds up. `G3` is relabelled "Balance (+ owes · − is owed)". To apply by hand: paste the formula above into `Money!F4` (one line, no spaces) and fill down to F31, then relabel G3.

## 2.9 Player names (fixed in the corrected copy)
Isaac, 4 Sep 2026: **Robin** is Robin Watson and **Eddie Ringer** is Eddie McLaughlin. The corrected copy renames every cell that carries either name (player rows in all season tabs and the template, the All-time and Money tabs, and MOTM cells). The site applies the same renames itself, so it is already correct; the Payments dropdown will offer the new names once the sheet is updated.

| Tab | Cell | Was | Now |
|---|---|---|---|
| S1 | A25 | Eddie Ringer | Eddie McLaughlin |
| S1 | A37 | Robin | Robin Watson |
| S2 | A25 | Eddie Ringer | Eddie McLaughlin |
| S2 | A37 | Robin | Robin Watson |
| S3 | A25 | Eddie Ringer | Eddie McLaughlin |
| S3 | A37 | Robin | Robin Watson |
| S4 | A25 | Eddie Ringer | Eddie McLaughlin |
| S4 | A37 | Robin | Robin Watson |
| S5 | O10 | Eddie Ringer | Eddie McLaughlin |
| S5 | A25 | Eddie Ringer | Eddie McLaughlin |
| S5 | A37 | Robin | Robin Watson |
| S6 | A25 | Eddie Ringer | Eddie McLaughlin |
| S6 | A37 | Robin | Robin Watson |
| S7 | A25 | Eddie Ringer | Eddie McLaughlin |
| S7 | A37 | Robin | Robin Watson |
| S8 | A25 | Eddie Ringer | Eddie McLaughlin |
| S8 | A37 | Robin | Robin Watson |
| Season template | A25 | Eddie Ringer | Eddie McLaughlin |
| Season template | A37 | Robin | Robin Watson |
| All-time | A10 | Eddie Ringer | Eddie McLaughlin |
| All-time | A22 | Robin | Robin Watson |
| Money | A11 | Eddie Ringer | Eddie McLaughlin |
| Money | A23 | Robin | Robin Watson |

## 2.10 Friendlies outside a season (new tab in the corrected copy)
Friendlies played *during* a season already work: put the game in the season tab and write `Friendly` in the Type row. For one-offs that belong to no season, the corrected copy adds a **Friendlies** tab, a copy of the season template with `Friendly` pre-filled in the Type row for every column and the columns labelled Game 1–20. Fill it in exactly like a season tab (date, kick-off, opponent, goals, appearances, scorers, assists, MOTM, comments, match cost, paid by). The site lists these on `/matches` under "Friendlies", on `/seasons/friendlies`, and on the players' match logs, but they never touch W/D/L, form, records or player totals. If you add the tab by hand instead: duplicate `Season template`, rename it `Friendlies`, and type `Friendly` into row 16 across B–U.

## 3. Optional: a Squad tab
Photos, shirt numbers and positions currently come from a copy of the old app's data bundled with the site. If you add a tab called **Squad** with columns `Player, Nickname, Position, Shirt, Photo, Bio`, the site will read it live and it overrides the bundled data field by field (Photo can be any public image URL). Nothing to do if you're happy with what's there.

## 4. The per-game rule, as implemented
The sheet has no per-game metrics of its own, so the change lives in the site's calculations:
- A game has **scorers recorded** if we scored 0, or at least one Hajduci scorer is logged. Goals per game = goals ÷ appearances in such games.
- A game has **assists recorded** if we scored 0, or at least one assist is logged. Assists per game = assists ÷ appearances in such games.
- Both flags are exported on every match (`scorers_recorded`, `assists_recorded`) and the denominators on every player (`games_with_scorers_logged`, `games_with_assists_logged`) via `/api/export`, so you can check the maths.
