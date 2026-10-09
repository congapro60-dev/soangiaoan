CREATE TABLE `exam_answers` (
	`attempt_id` text NOT NULL,
	`qid` text NOT NULL,
	`value_json` text NOT NULL,
	`seq` integer DEFAULT 0 NOT NULL,
	`manual_score` real,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`attempt_id`) REFERENCES `exam_attempts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_exam_answer` ON `exam_answers` (`attempt_id`,`qid`);--> statement-breakpoint
CREATE TABLE `exam_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`attempt_id` text,
	`qid` text NOT NULL,
	`kind` text NOT NULL,
	`mime` text NOT NULL,
	`data` text NOT NULL,
	`bytes` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`attempt_id`) REFERENCES `exam_attempts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_exam_asset_exam` ON `exam_assets` (`exam_id`,`qid`);--> statement-breakpoint
CREATE INDEX `idx_exam_asset_attempt` ON `exam_assets` (`attempt_id`);--> statement-breakpoint
CREATE TABLE `exam_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`token_hash` text,
	`mascot` integer DEFAULT 0 NOT NULL,
	`tab_leaves` integer DEFAULT 0 NOT NULL,
	`joined_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`submitted_at` integer,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_exam_attempt_name` ON `exam_attempts` (`exam_id`,`name_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_exam_attempt_token` ON `exam_attempts` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_exam_attempt_exam` ON `exam_attempts` (`exam_id`);--> statement-breakpoint
CREATE TABLE `exams` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_account_id` text NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`duration_min` integer NOT NULL,
	`settings_json` text NOT NULL,
	`questions_json` text NOT NULL,
	`request_id` text,
	`started_at` integer,
	`ends_at` integer,
	`closed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exams_code_unique` ON `exams` (`code`);--> statement-breakpoint
CREATE INDEX `idx_exams_owner` ON `exams` (`owner_account_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_exams_request` ON `exams` (`owner_account_id`,`request_id`);