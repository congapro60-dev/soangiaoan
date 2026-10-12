CREATE TABLE `lesson_league_classes` (
	`league_id` text NOT NULL,
	`class_id` text NOT NULL,
	`baseline_mean` real,
	`baseline_count` integer,
	`added_at` integer NOT NULL,
	PRIMARY KEY(`league_id`, `class_id`),
	FOREIGN KEY (`league_id`) REFERENCES `lesson_leagues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `lesson_classes`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "league_baseline_count" CHECK("lesson_league_classes"."baseline_count">0)
);
--> statement-breakpoint
CREATE TABLE `lesson_league_round_results` (
	`id` text PRIMARY KEY NOT NULL,
	`league_id` text NOT NULL,
	`class_id` text NOT NULL,
	`round` integer NOT NULL,
	`session_id` text NOT NULL,
	`participant_ids_json` text NOT NULL,
	`participant_count` integer NOT NULL,
	`linked_revision` integer NOT NULL,
	`linked_at` integer NOT NULL,
	`mean_score` real,
	`improvement` real,
	`finalized_revision` integer,
	`finalized_at` integer,
	FOREIGN KEY (`session_id`) REFERENCES `lesson_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`league_id`,`class_id`) REFERENCES `lesson_league_classes`(`league_id`,`class_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "league_round_number" CHECK("lesson_league_round_results"."round">=1 AND "lesson_league_round_results"."round"<=1000),
	CONSTRAINT "league_participant_count" CHECK("lesson_league_round_results"."participant_count">0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_league_class_round` ON `lesson_league_round_results` (`league_id`,`class_id`,`round`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_league_session` ON `lesson_league_round_results` (`league_id`,`session_id`);--> statement-breakpoint
CREATE INDEX `idx_lesson_league_round` ON `lesson_league_round_results` (`league_id`,`round`,`class_id`);--> statement-breakpoint
CREATE TABLE `lesson_leagues` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_account_id` text NOT NULL,
	`title` text NOT NULL,
	`format` text NOT NULL,
	`request_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "league_format" CHECK("lesson_leagues"."format" IN ('async','live','cooperative'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_league_request` ON `lesson_leagues` (`owner_account_id`,`request_id`);