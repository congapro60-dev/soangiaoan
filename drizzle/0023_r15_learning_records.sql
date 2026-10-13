CREATE TABLE `lesson_evidence_sync` (
	`session_id` text PRIMARY KEY NOT NULL,
	`source_revision` integer NOT NULL,
	`synced_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `lesson_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lesson_learning_plan_versions` (
	`plan_id` text NOT NULL,
	`revision` integer NOT NULL,
	`status` text NOT NULL,
	`body` text NOT NULL,
	`source_fingerprint` text NOT NULL,
	`actor_account_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`plan_id`, `revision`),
	FOREIGN KEY (`plan_id`) REFERENCES `lesson_learning_plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lesson_learning_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_account_id` text NOT NULL,
	`class_id` text NOT NULL,
	`member_id` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`status` text NOT NULL,
	`body` text NOT NULL,
	`source_fingerprint` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`approved_at` integer,
	`deleted_at` integer,
	FOREIGN KEY (`owner_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `lesson_classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `lesson_class_members`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "learning_plan_status" CHECK("lesson_learning_plans"."status" IN ('draft','approved'))
);
--> statement-breakpoint
CREATE INDEX `idx_learning_plans_member` ON `lesson_learning_plans` (`member_id`,`updated_at`);