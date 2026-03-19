CREATE TABLE "score_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"organizer_email" varchar(255) NOT NULL,
	"wrestlers_updated" integer NOT NULL,
	"summary" varchar(1000) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wrestlers" ADD COLUMN "tournament_points" integer DEFAULT 0 NOT NULL;