CREATE TABLE `lesson_class_evidence` (
	`member_id` text NOT NULL,
	`session_id` text NOT NULL,
	`package_hash` text NOT NULL,
	`task_id` text NOT NULL,
	`submission_id` text NOT NULL,
	`objective_code` text NOT NULL,
	`objective_statement` text NOT NULL,
	`level` text NOT NULL,
	`kind` text NOT NULL,
	`assessed` integer NOT NULL,
	`assisted` integer NOT NULL,
	`ok` integer NOT NULL,
	`counts_for_mastery` integer NOT NULL,
	`submitted_at` integer NOT NULL,
	`synced_at` integer NOT NULL,
	PRIMARY KEY(`member_id`, `session_id`, `package_hash`, `task_id`, `submission_id`, `objective_code`),
	FOREIGN KEY (`member_id`) REFERENCES `lesson_class_members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `lesson_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "class_evidence_level" CHECK("lesson_class_evidence"."level" IN ('must','should','could')),
	CONSTRAINT "class_evidence_assessed" CHECK("lesson_class_evidence"."assessed" IN (0,1)),
	CONSTRAINT "class_evidence_assisted" CHECK("lesson_class_evidence"."assisted" IN (0,1)),
	CONSTRAINT "class_evidence_ok" CHECK("lesson_class_evidence"."ok" IN (0,1)),
	CONSTRAINT "class_evidence_countsForMastery" CHECK("lesson_class_evidence"."counts_for_mastery" IN (0,1))
);
--> statement-breakpoint
CREATE INDEX `idx_lesson_class_evidence_member` ON `lesson_class_evidence` (`member_id`,`objective_code`,`submitted_at`);--> statement-breakpoint
CREATE TABLE `lesson_class_login_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `lesson_class_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_class_login_token` ON `lesson_class_login_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_lesson_class_login_member` ON `lesson_class_login_sessions` (`member_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `lesson_class_members` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`member_code` text NOT NULL,
	`name` text NOT NULL,
	`team_id` text,
	`pin_hash` text NOT NULL,
	`request_id` text NOT NULL,
	`request_fingerprint` text NOT NULL,
	`login_fail_count` integer DEFAULT 0 NOT NULL,
	`login_window_start` integer,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `lesson_classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`,`team_id`) REFERENCES `lesson_class_teams`(`class_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "class_member_fail_count" CHECK("lesson_class_members"."login_fail_count" >= 0 AND "lesson_class_members"."login_fail_count" <= 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_class_member_code` ON `lesson_class_members` (`class_id`,`member_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_class_member_request` ON `lesson_class_members` (`class_id`,`request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_class_member_tuple` ON `lesson_class_members` (`class_id`,`id`);--> statement-breakpoint
CREATE TABLE `lesson_class_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`title` text NOT NULL,
	`request_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `lesson_classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_class_team_request` ON `lesson_class_teams` (`class_id`,`request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_class_team_tuple` ON `lesson_class_teams` (`class_id`,`id`);--> statement-breakpoint
CREATE TABLE `lesson_classes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_account_id` text NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`request_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`owner_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_class_code` ON `lesson_classes` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_class_request` ON `lesson_classes` (`owner_account_id`,`request_id`);--> statement-breakpoint
ALTER TABLE `lesson_learners` ADD `class_member_id` text REFERENCES lesson_class_members(id);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_class_session_member` ON `lesson_learners` (`session_id`,`class_member_id`);--> statement-breakpoint
ALTER TABLE `lesson_sessions` ADD `class_id` text REFERENCES lesson_classes(id);