import { boolean, date, index, integer, jsonb, numeric, pgTable, primaryKey, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

/**
 * The club's records. This file is the source of truth for the database shape: edit it, run `npm run db:generate` to
 * write a migration into drizzle/, commit both, and `npm run db:migrate` (also run before every build) applies it.
 * Column names are snake_case in Postgres (see casing in src/lib/db.ts and drizzle.config.ts).
 */
export const settings = pgTable("settings", {
  key: text().primaryKey(),
  value: text().notNull(),
});

/** 'S8' … and 'FR' for out-of-season friendlies (number 0). */
export const seasons = pgTable("seasons", {
  id: text().primaryKey(),
  number: integer().notNull(),
  title: text().notNull().default(""),
  venue: text().notNull().default(""),
  period: text().notNull().default(""),
  /** default cost of a game this season, used when a fixture is added */
  pitchCost: numeric({ precision: 8, scale: 2 }),
  /** who books and pays the pitch up front; credited the cost of every played game */
  paidBy: text(),
  /** the venue's page (PlayFootball etc.), linked from the fixture page and the reminder email */
  venueUrl: text(),
  seasonCost: numeric({ precision: 9, scale: 2 }).notNull().default("0"),
});

export const players = pgTable("players", {
  name: text().primaryKey(),
  slug: text().notNull().unique(),
  nickname: text(),
  positions: text().array().notNull().default([]),
  shirt: integer(),
  photo: text(),
  bio: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedBy: text(),
});

export const seasonRosters = pgTable("season_rosters", {
  seasonId: text().notNull().references(() => seasons.id, { onDelete: "cascade" }),
  player: text().notNull().references(() => players.name, { onUpdate: "cascade", onDelete: "cascade" }),
  /** order on the team sheet */
  position: integer().notNull().default(0),
}, (t) => [primaryKey({ columns: [t.seasonId, t.player] })]);

export const matches = pgTable("matches", {
  id: text().primaryKey(), // 's8-gw2'
  seasonId: text().notNull().references(() => seasons.id, { onDelete: "cascade" }),
  gw: integer().notNull(),
  date: date(),
  kickOff: text(), // '20:15'
  opponent: text().notNull().default("TBC"),
  ourGoals: integer(),
  theirGoals: integer(),
  motm: text(),
  comment: text(),
  /** null for a league game; 'Friendly', 'Forfeit', … never count for records */
  type: text(),
  matchCost: numeric({ precision: 8, scale: 2 }).notNull().default("0"),
  /** override for the cost split; null means "count the appearances" */
  playersInGame: integer(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedBy: text(),
}, (t) => [unique("matches_season_gw").on(t.seasonId, t.gw), index("matches_season_idx").on(t.seasonId, t.gw)]);

export const appearances = pgTable("appearances", {
  matchId: text().notNull().references(() => matches.id, { onDelete: "cascade" }),
  player: text().notNull().references(() => players.name, { onUpdate: "cascade", onDelete: "cascade" }),
  played: boolean().notNull().default(true),
  goals: integer().notNull().default(0),
  assists: integer().notNull().default(0),
}, (t) => [primaryKey({ columns: [t.matchId, t.player] }), index("appearances_player_idx").on(t.player)]);

export const payments = pgTable("payments", {
  id: serial().primaryKey(),
  date: date(),
  player: text().notNull(),
  paidTo: text(),
  amount: numeric({ precision: 8, scale: 2 }).notNull(),
  note: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  createdBy: text(),
}, (t) => [index("payments_player_idx").on(t.player)]);

/** Who may sign in: an address (stored lower-case) tied to a player name. */
export const members = pgTable("members", {
  email: text().primaryKey(),
  player: text().notNull(),
  admin: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  addedBy: text(),
});

/** 'Robin' → 'Robin Watson': spellings that mean the same player. */
export const aliases = pgTable("aliases", {
  fromName: text().primaryKey(),
  toName: text().notNull(),
});

/** 'oly ivy' → 'Old Ivy'; keys are lower-case and punctuation-free. */
export const opponentAliases = pgTable("opponent_aliases", {
  key: text().primaryKey(),
  toName: text().notNull(),
});

/** Anonymous submissions waiting for the admin to apply or reject them. */
export const submissions = pgTable("submissions", {
  id: serial().primaryKey(),
  kind: text().notNull(), // 'score' | 'payment' | 'player'
  payload: jsonb().notNull().$type<Record<string, unknown>>(),
  summary: text().notNull(),
  submittedBy: text().notNull(),
  status: text().notNull().default("pending"), // 'pending' | 'applied' | 'rejected'
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp({ withTimezone: true }),
  decidedBy: text(),
}, (t) => [index("submissions_status_idx").on(t.status, t.createdAt)]);

/** The expected squad for an upcoming fixture, as the admin sets it; reminders go out the day before. */
export const squads = pgTable("squads", {
  matchId: text().primaryKey().references(() => matches.id, { onDelete: "cascade" }),
  players: text().array().notNull().default([]),
  note: text(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedBy: text(),
  remindedAt: timestamp({ withTimezone: true }),
});
