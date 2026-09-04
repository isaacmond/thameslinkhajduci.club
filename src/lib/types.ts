export type Result = "W" | "D" | "L";

export interface PlayerMatchLine {
  player: string;
  played: boolean;
  goals: number;
  assists: number;
  cost: number;
}

export interface Match {
  id: string; // e.g. "s7-gw3"
  seasonId: string; // "S7"
  seasonNumber: number;
  gw: number;
  date: string | null; // ISO yyyy-mm-dd
  kickOff: string | null; // "19:35"
  opponent: string;
  ourGoals: number | null;
  theirGoals: number | null;
  result: Result | null;
  played: boolean;
  motm: string | null;
  comment: string | null;
  type: string | null; // "Forfeit" | "Friendly" | null
  /** false for friendlies/forfeits (Type row). Apps count when true; W/D/L only when also played. */
  countsForRecords: boolean;
  /** true when the goalscorers for this game are known (team scored 0, or at least one scorer was logged). Games without it are left out of per-game goal rates. */
  scorersRecorded: boolean;
  /** true when assists for this game are known (team scored 0, or at least one assist was logged). Games without it are left out of per-game assist rates. */
  assistsRecorded: boolean;
  matchCost: number;
  playersInGame: number;
  costPerPlayer: number;
  lineup: PlayerMatchLine[]; // only players who played or scored
}

export interface SeasonSummary {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  topScorer: string | null;
  mostApps: string | null;
  seasonCost: number;
  paidBy: string | null;
}

export interface Season {
  id: string; // "S7"
  number: number;
  title: string; // full title from sheet
  venue: string; // "PlayFootball Old Street (5G, 6-a-side)"
  period: string; // "May–Aug 2026"
  matches: Match[];
  summary: SeasonSummary;
  players: string[]; // roster listed on tab
  isCurrent: boolean;
  isComplete: boolean;
}

export interface PlayerSeasonStats {
  seasonId: string;
  apps: number;
  /** apps in games where scorers were recorded: the denominator for goals per game */
  gpgGames: number;
  /** apps in games where assists were recorded: the denominator for assists per game */
  apgGames: number;
  goals: number;
  assists: number;
  motm: number;
  cost: number;
}

export interface SquadExtra {
  nickname?: string;
  positions?: string[];
  shirt?: number | null;
  photo?: string;
  bio?: string;
}

export interface Player {
  name: string;
  slug: string;
  apps: number;
  goals: number;
  assists: number;
  motm: number;
  wins: number;
  draws: number;
  losses: number;
  goalsPerGame: number;
  assistsPerGame: number;
  gpgGames: number;
  apgGames: number;
  winRate: number;
  debut: string | null;
  lastPlayed: string | null;
  seasons: PlayerSeasonStats[];
  extra: SquadExtra;
}

export interface MoneyRow {
  player: string;
  charges: Record<string, number>;
  totalCharged: number;
  /** transfers logged plus pitch costs covered (see pitchCovered) */
  paid: number;
  /** positive: owes the club; negative: the club owes them */
  balance: number;
  /** pitch hire this player paid for (played games in seasons where they are the "Paid by" name) */
  pitchCovered: number;
}

export interface Payment {
  date: string | null;
  player: string;
  amount: number;
  note: string | null;
}

export interface ClubData {
  fetchedAt: string;
  /** true when served from the in-memory fallback because the sheet could not be reached */
  stale?: boolean;
  sheetUrl: string;
  seasons: Season[];
  matches: Match[];
  players: Player[];
  money: { paidBy: Record<string, string>; rows: MoneyRow[]; payments: Payment[] };
  allTime: SeasonSummary;
}
