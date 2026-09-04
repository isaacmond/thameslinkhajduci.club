CREATE TABLE "aliases" (
	"from_name" text PRIMARY KEY NOT NULL,
	"to_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appearances" (
	"match_id" text NOT NULL,
	"player" text NOT NULL,
	"played" boolean DEFAULT true NOT NULL,
	"goals" integer DEFAULT 0 NOT NULL,
	"assists" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "appearances_match_id_player_pk" PRIMARY KEY("match_id","player")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"season_id" text NOT NULL,
	"gw" integer NOT NULL,
	"date" date,
	"kick_off" text,
	"opponent" text DEFAULT 'TBC' NOT NULL,
	"our_goals" integer,
	"their_goals" integer,
	"motm" text,
	"comment" text,
	"type" text,
	"match_cost" numeric(8, 2) DEFAULT '0' NOT NULL,
	"players_in_game" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "matches_season_gw" UNIQUE("season_id","gw")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"email" text PRIMARY KEY NOT NULL,
	"player" text NOT NULL,
	"admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"added_by" text
);
--> statement-breakpoint
CREATE TABLE "opponent_aliases" (
	"key" text PRIMARY KEY NOT NULL,
	"to_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date,
	"player" text NOT NULL,
	"paid_to" text,
	"amount" numeric(8, 2) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "players" (
	"name" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"nickname" text,
	"positions" text[] DEFAULT '{}' NOT NULL,
	"shirt" integer,
	"photo" text,
	"bio" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "players_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "season_rosters" (
	"season_id" text NOT NULL,
	"player" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "season_rosters_season_id_player_pk" PRIMARY KEY("season_id","player")
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" text PRIMARY KEY NOT NULL,
	"number" integer NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"venue" text DEFAULT '' NOT NULL,
	"period" text DEFAULT '' NOT NULL,
	"pitch_cost" numeric(8, 2),
	"paid_by" text,
	"season_cost" numeric(9, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"summary" text NOT NULL,
	"submitted_by" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by" text
);
--> statement-breakpoint
ALTER TABLE "appearances" ADD CONSTRAINT "appearances_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appearances" ADD CONSTRAINT "appearances_player_players_name_fk" FOREIGN KEY ("player") REFERENCES "public"."players"("name") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_rosters" ADD CONSTRAINT "season_rosters_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_rosters" ADD CONSTRAINT "season_rosters_player_players_name_fk" FOREIGN KEY ("player") REFERENCES "public"."players"("name") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "appearances_player_idx" ON "appearances" USING btree ("player");--> statement-breakpoint
CREATE INDEX "matches_season_idx" ON "matches" USING btree ("season_id","gw");--> statement-breakpoint
CREATE INDEX "payments_player_idx" ON "payments" USING btree ("player");--> statement-breakpoint
CREATE INDEX "submissions_status_idx" ON "submissions" USING btree ("status","created_at");