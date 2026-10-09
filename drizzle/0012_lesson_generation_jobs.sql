CREATE TABLE `lesson_generation_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_account_id` text NOT NULL,
	`source_id` text NOT NULL,
	`source_sha256` text NOT NULL,
	`parser_revision` text NOT NULL,
	`extraction_hash` text NOT NULL,
	`request_id` text NOT NULL,
	`request_fingerprint` text NOT NULL,
	`settings_json` text NOT NULL,
	`model` text NOT NULL,
	`status` text NOT NULL,
	`result_json` text,
	`error_code` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	FOREIGN KEY (`owner_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `lesson_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_generation_request` ON `lesson_generation_jobs` (`owner_account_id`,`request_id`);--> statement-breakpoint
CREATE INDEX `idx_lesson_generation_owner_status` ON `lesson_generation_jobs` (`owner_account_id`,`status`,`updated_at`);