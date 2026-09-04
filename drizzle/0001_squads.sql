CREATE TABLE "squads" (
	"match_id" text PRIMARY KEY NOT NULL,
	"players" text[] DEFAULT '{}' NOT NULL,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	"reminded_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "squads" ADD CONSTRAINT "squads_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;