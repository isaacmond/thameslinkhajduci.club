import type { ClubData } from "./types";
import { headToHead } from "./stats";

export const TABLES = ["players", "matches", "seasons", "appearances", "goals", "assists", "opponents", "money", "payments"] as const;
export type TableName = (typeof TABLES)[number];
export type Row = Record<string, string | number | boolean | null>;

export const TABLE_INFO: Record<TableName, string> = {
  players: "One row per player with career totals (or season totals when filtered).",
  matches: "Every fixture and result, including friendlies/forfeits, with MOTM and comments.",
  seasons: "One row per season: venue, dates, W/D/L, goals.",
  appearances: "Long format: one row per player per match played.",
  goals: "Long format: one row per player per match where they scored.",
  assists: "Long format: one row per player per match where they assisted.",
  opponents: "Head-to-head record against every opponent.",
  money: "Season 8 onwards: charges, payments and balance per player. Negative balance means the club owes them.",
  payments: "Every transfer logged on the Payments tab.",
};

export function buildTable(data: ClubData, table: TableName, opts: { season?: string } = {}): { columns: string[]; rows: Row[] } {
  const season = opts.season?.toUpperCase();
  const matches = season ? data.matches.filter((m) => m.seasonId === season) : data.matches;
  switch (table) {
    case "players": {
      const rows: Row[] = data.players.flatMap((p): Row[] => {
        const s = season ? p.seasons.find((x) => x.seasonId === season) : null;
        if (season && !s) return [];
        const src = s ?? p;
        const base: Row = { player: p.name, apps: src.apps, goals: src.goals, assists: src.assists, motm: src.motm, goals_per_game: src.gpgGames ? +(src.goals / src.gpgGames).toFixed(2) : 0, games_with_scorers_logged: src.gpgGames, assists_per_game: src.apgGames ? +(src.assists / src.apgGames).toFixed(2) : 0, games_with_assists_logged: src.apgGames };
        if (season) return [base];
        return [{ ...base, wins: p.wins, draws: p.draws, losses: p.losses, win_rate_pct: p.winRate, debut: p.debut, last_played: p.lastPlayed, seasons_played: p.seasons.filter((x) => x.apps > 0).length }];
      });
      return { columns: Object.keys(rows[0] ?? { player: "" }), rows };
    }
    case "matches": {
      const rows: Row[] = matches.map((m) => ({ season: m.seasonId, gw: m.gw, date: m.date, kick_off: m.kickOff, opponent: m.opponent, our_goals: m.ourGoals, their_goals: m.theirGoals, result: m.result, type: m.type, counts_for_records: m.countsForRecords, scorers_recorded: m.scorersRecorded, assists_recorded: m.assistsRecorded, motm: m.motm, comment: m.comment, players: m.lineup.filter((l) => l.played).length, scorers: m.lineup.filter((l) => l.goals > 0).map((l) => `${l.player} (${l.goals})`).join("; "), match_cost: m.matchCost || null }));
      return { columns: Object.keys(rows[0] ?? {}), rows };
    }
    case "seasons": {
      const rows: Row[] = data.seasons.map((s) => ({ season: s.id, venue: s.venue, period: s.period, fixtures: s.matches.length, played: s.summary.played, won: s.summary.won, drawn: s.summary.drawn, lost: s.summary.lost, goals_for: s.summary.goalsFor, goals_against: s.summary.goalsAgainst, goal_difference: s.summary.goalsFor - s.summary.goalsAgainst, top_scorer: s.summary.topScorer, most_apps: s.summary.mostApps, season_cost: s.summary.seasonCost || null, paid_by: s.summary.paidBy }));
      return { columns: Object.keys(rows[0] ?? {}), rows };
    }
    case "appearances": case "goals": case "assists": {
      const rows: Row[] = [];
      for (const m of matches) for (const l of m.lineup) {
        if (table === "appearances" && !l.played) continue;
        if (table === "goals" && !l.goals) continue;
        if (table === "assists" && !l.assists) continue;
        rows.push({ season: m.seasonId, gw: m.gw, date: m.date, opponent: m.opponent, result: m.result, player: l.player, goals: l.goals, assists: l.assists, motm: m.motm === l.player, counts_for_records: m.countsForRecords });
      }
      return { columns: ["season", "gw", "date", "opponent", "result", "player", "goals", "assists", "motm", "counts_for_records"], rows };
    }
    case "opponents": {
      const rows: Row[] = headToHead(matches).map((o) => ({ opponent: o.opponent, played: o.played, won: o.won, drawn: o.drawn, lost: o.lost, goals_for: o.gf, goals_against: o.ga, seasons: o.seasons.join(" ") }));
      return { columns: Object.keys(rows[0] ?? {}), rows };
    }
    case "money": {
      const rows: Row[] = data.money.rows.map((r) => ({ player: r.player, ...Object.fromEntries(Object.entries(r.charges).map(([k, v]) => [`${k}_charges`, +v.toFixed(2)])), total_charged: +r.totalCharged.toFixed(2), pitch_paid_for: +r.pitchCovered.toFixed(2), paid: +r.paid.toFixed(2), balance: +r.balance.toFixed(2), status: r.balance > 0.01 ? "owes" : r.balance < -0.01 ? "is owed" : "settled" }));
      return { columns: Object.keys(rows[0] ?? {}), rows };
    }
    case "payments": {
      const rows: Row[] = data.money.payments.map((p) => ({ date: p.date, player: p.player, amount: p.amount, note: p.note }));
      return { columns: ["date", "player", "amount", "note"], rows };
    }
  }
  return { columns: [], rows: [] };
}
