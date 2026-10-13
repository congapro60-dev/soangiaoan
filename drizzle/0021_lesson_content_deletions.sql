CREATE TABLE lesson_content_deletions (
  kind text NOT NULL,
  object_id text NOT NULL,
  owner_account_id text NOT NULL REFERENCES accounts(id),
  deleted_at integer NOT NULL,
  PRIMARY KEY(kind,object_id)
);
--> statement-breakpoint
ALTER TABLE lesson_leagues ADD deleted_at integer;
--> statement-breakpoint
ALTER TABLE lesson_league_classes ADD deleted_at integer;
--> statement-breakpoint
ALTER TABLE lesson_league_round_results ADD deleted_at integer;
