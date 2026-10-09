DROP INDEX `idx_lesson_source_hash`;--> statement-breakpoint
CREATE INDEX `idx_lesson_source_hash` ON `lesson_sources` (`owner_account_id`,`sha256`);