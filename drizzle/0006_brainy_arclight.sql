ALTER TABLE "projects" ADD COLUMN "share_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "share_role" text DEFAULT 'editor' NOT NULL;