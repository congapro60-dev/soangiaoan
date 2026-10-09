CREATE TABLE `lesson_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`package_row_id` text NOT NULL,
	`actor_account_id` text NOT NULL,
	`reviewed_parent_hash` text NOT NULL,
	`approved_hash` text NOT NULL,
	`source_ack` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`package_row_id`) REFERENCES `lesson_packages`(`row_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lesson_event_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`actor_key` text NOT NULL,
	`event_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`result` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `lesson_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_receipt` ON `lesson_event_receipts` (`session_id`,`actor_key`,`event_id`);--> statement-breakpoint
CREATE TABLE `lesson_learners` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`learner_id` text NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`token_hash` text NOT NULL,
	`present` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `lesson_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_learners_token_hash_unique` ON `lesson_learners` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_learner` ON `lesson_learners` (`session_id`,`learner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_name` ON `lesson_learners` (`session_id`,`name_key`);--> statement-breakpoint
CREATE TABLE `lesson_packages` (
	`row_id` text PRIMARY KEY NOT NULL,
	`owner_account_id` text NOT NULL,
	`package_id` text NOT NULL,
	`version` text NOT NULL,
	`content_hash` text NOT NULL,
	`status` text NOT NULL,
	`data` text NOT NULL,
	`parent_row_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_row_id`) REFERENCES `lesson_packages`(`row_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_package_version` ON `lesson_packages` (`owner_account_id`,`package_id`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_package_hash` ON `lesson_packages` (`row_id`,`version`,`content_hash`);--> statement-breakpoint
CREATE TABLE `lesson_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`package_row_id` text NOT NULL,
	`package_version` text NOT NULL,
	`package_hash` text NOT NULL,
	`owner_account_id` text NOT NULL,
	`request_id` text,
	`request_fingerprint` text,
	`state` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`mutation_nonce` text NOT NULL,
	`presenter_token_hash` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`package_row_id`,`package_version`,`package_hash`) REFERENCES `lesson_packages`(`row_id`,`version`,`content_hash`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_sessions_room_id_unique` ON `lesson_sessions` (`room_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_session_request` ON `lesson_sessions` (`owner_account_id`,`request_id`);
--> statement-breakpoint
CREATE TRIGGER `lesson_packages_immutable_update` BEFORE UPDATE ON `lesson_packages` BEGIN SELECT RAISE(ABORT, 'lesson_packages are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER `lesson_packages_immutable_delete` BEFORE DELETE ON `lesson_packages` BEGIN SELECT RAISE(ABORT, 'lesson_packages are immutable'); END;
