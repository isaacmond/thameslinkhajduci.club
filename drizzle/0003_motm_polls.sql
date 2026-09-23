CREATE TABLE "motm_ballots" (
	"token" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"player" text NOT NULL,
	"vote" text,
	"voted_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	CONSTRAINT "motm_ballots_match_player" UNIQUE("match_id","player")
);
--> statement-breakpoint
CREATE TABLE "motm_polls" (
	"match_id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"candidates" text[] DEFAULT '{}' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_by" text,
	"winner" text,
	"opened_by" text
);
--> statement-breakpoint
ALTER TABLE "motm_ballots" ADD CONSTRAINT "motm_ballots_match_id_motm_polls_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."motm_polls"("match_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "motm_ballots" ADD CONSTRAINT "motm_ballots_player_players_name_fk" FOREIGN KEY ("player") REFERENCES "public"."players"("name") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "motm_polls" ADD CONSTRAINT "motm_polls_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "motm_ballots_match_idx" ON "motm_ballots" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "motm_polls_status_idx" ON "motm_polls" USING btree ("status","closes_at");