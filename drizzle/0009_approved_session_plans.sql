CREATE TABLE `lesson_session_plans` (
  `row_id` text PRIMARY KEY NOT NULL,
  `owner_account_id` text NOT NULL,
  `package_row_id` text NOT NULL,
  `package_version` text NOT NULL,
  `package_hash` text NOT NULL,
  `plan_hash` text NOT NULL,
  `data` text NOT NULL,
  `source_review` text NOT NULL,
  `approved_by` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`owner_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`approved_by`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`package_row_id`,`package_version`,`package_hash`) REFERENCES `lesson_packages`(`row_id`,`version`,`content_hash`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_plan_tuple` ON `lesson_session_plans` (`row_id`,`plan_hash`,`package_row_id`,`package_version`,`package_hash`);
--> statement-breakpoint
-- Existing deployments need a table rebuild because SQLite cannot add a composite
-- foreign key with ALTER TABLE. Rebuild every direct child together with the
-- parent so existing learner and receipt rows never point at the renamed table.
DROP INDEX IF EXISTS `idx_lesson_receipt`;
DROP INDEX IF EXISTS `lesson_learners_token_hash_unique`;
DROP INDEX IF EXISTS `idx_lesson_learner`;
DROP INDEX IF EXISTS `idx_lesson_name`;
DROP INDEX IF EXISTS `lesson_sessions_room_id_unique`;
DROP INDEX IF EXISTS `idx_lesson_session_request`;
ALTER TABLE `lesson_sessions` RENAME TO `lesson_sessions_pre_0009`;
ALTER TABLE `lesson_learners` RENAME TO `lesson_learners_pre_0009`;
ALTER TABLE `lesson_event_receipts` RENAME TO `lesson_event_receipts_pre_0009`;
--> statement-breakpoint
CREATE TABLE `lesson_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `room_id` text NOT NULL,
  `package_row_id` text NOT NULL,
  `package_version` text NOT NULL,
  `package_hash` text NOT NULL,
  `plan_row_id` text,
  `plan_hash` text,
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
  FOREIGN KEY (`package_row_id`,`package_version`,`package_hash`) REFERENCES `lesson_packages`(`row_id`,`version`,`content_hash`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`plan_row_id`,`plan_hash`,`package_row_id`,`package_version`,`package_hash`) REFERENCES `lesson_session_plans`(`row_id`,`plan_hash`,`package_row_id`,`package_version`,`package_hash`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `lesson_sessions` (`id`,`room_id`,`package_row_id`,`package_version`,`package_hash`,`owner_account_id`,`request_id`,`request_fingerprint`,`state`,`revision`,`status`,`mutation_nonce`,`presenter_token_hash`,`created_at`,`updated_at`)
SELECT `id`,`room_id`,`package_row_id`,`package_version`,`package_hash`,`owner_account_id`,`request_id`,`request_fingerprint`,`state`,`revision`,`status`,`mutation_nonce`,`presenter_token_hash`,`created_at`,`updated_at`
FROM `lesson_sessions_pre_0009`;
--> statement-breakpoint
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
INSERT INTO `lesson_learners` (`id`,`session_id`,`learner_id`,`name`,`name_key`,`token_hash`,`present`,`created_at`)
SELECT `id`,`session_id`,`learner_id`,`name`,`name_key`,`token_hash`,`present`,`created_at`
FROM `lesson_learners_pre_0009`;
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
INSERT INTO `lesson_event_receipts` (`id`,`session_id`,`actor_key`,`event_id`,`fingerprint`,`result`,`created_at`)
SELECT `id`,`session_id`,`actor_key`,`event_id`,`fingerprint`,`result`,`created_at`
FROM `lesson_event_receipts_pre_0009`;
--> statement-breakpoint
DROP TABLE `lesson_learners_pre_0009`;
DROP TABLE `lesson_event_receipts_pre_0009`;
DROP TABLE `lesson_sessions_pre_0009`;
--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_sessions_room_id_unique` ON `lesson_sessions` (`room_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_session_request` ON `lesson_sessions` (`owner_account_id`,`request_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_learners_token_hash_unique` ON `lesson_learners` (`token_hash`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_learner` ON `lesson_learners` (`session_id`,`learner_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_name` ON `lesson_learners` (`session_id`,`name_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_receipt` ON `lesson_event_receipts` (`session_id`,`actor_key`,`event_id`);
--> statement-breakpoint
CREATE INDEX `idx_lesson_session_plan` ON `lesson_sessions` (`plan_row_id`,`plan_hash`);
--> statement-breakpoint
CREATE TRIGGER `lesson_session_plans_immutable_update` BEFORE UPDATE ON `lesson_session_plans` BEGIN SELECT RAISE(ABORT, 'lesson_session_plans are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER `lesson_session_plans_immutable_delete` BEFORE DELETE ON `lesson_session_plans` BEGIN SELECT RAISE(ABORT, 'lesson_session_plans are immutable'); END;
