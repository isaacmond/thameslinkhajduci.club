ALTER TABLE "matches" ADD COLUMN "ringers" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "ringer_goals" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "ringer_assists" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Ringers become counts on the match: how many, and what they scored and set up. Their names go, everywhere.
-- appearances.ringer itself is dropped in 0006, once no running deployment reads it.
UPDATE "matches" m SET "ringers" = r.n, "ringer_goals" = r.g, "ringer_assists" = r.a
  FROM (SELECT "match_id", count(*) FILTER (WHERE "played") AS n, sum("goals") AS g, sum("assists") AS a FROM "appearances" WHERE "ringer" GROUP BY "match_id") r
  WHERE m."id" = r."match_id";--> statement-breakpoint
UPDATE "motm_polls" p SET "candidates" = ARRAY(SELECT c FROM unnest(p."candidates") c WHERE c NOT IN (SELECT "player" FROM "appearances" WHERE "ringer" AND "player" NOT IN (SELECT "player" FROM "appearances" WHERE NOT "ringer")));--> statement-breakpoint
UPDATE "matches" SET "motm" = NULL WHERE "motm" IN (SELECT "player" FROM "appearances" WHERE "ringer" AND "player" NOT IN (SELECT "player" FROM "appearances" WHERE NOT "ringer"));--> statement-breakpoint
DELETE FROM "players" WHERE "name" IN (SELECT "player" FROM "appearances" WHERE "ringer" AND "player" NOT IN (SELECT "player" FROM "appearances" WHERE NOT "ringer"));--> statement-breakpoint
DELETE FROM "appearances" WHERE "ringer";
