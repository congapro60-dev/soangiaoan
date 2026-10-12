CREATE TABLE `lesson_device_members` (
	`device_id` text NOT NULL,
	`session_id` text NOT NULL,
	`learner_id` text NOT NULL,
	`class_member_id` text NOT NULL,
	PRIMARY KEY(`device_id`, `learner_id`),
	FOREIGN KEY (`class_member_id`) REFERENCES `lesson_class_members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`device_id`,`session_id`) REFERENCES `lesson_devices`(`id`,`session_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lesson_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`issued_by` text NOT NULL,
	`kind` text NOT NULL,
	`token_hash` text NOT NULL,
	`request_id` text NOT NULL,
	`request_fingerprint` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`session_id`) REFERENCES `lesson_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`issued_by`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "device_kind" CHECK("lesson_devices"."kind" IN ('B','C')),
	CONSTRAINT "device_expiry" CHECK("lesson_devices"."expires_at">"lesson_devices"."created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_device_request` ON `lesson_devices` (`session_id`,`request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_device_token` ON `lesson_devices` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_device_tuple` ON `lesson_devices` (`id`,`session_id`);--> statement-breakpoint
CREATE INDEX `idx_lesson_devices_session` ON `lesson_devices` (`session_id`,`revoked_at`);
--> statement-breakpoint
CREATE TRIGGER `lesson_device_member_scope` BEFORE INSERT ON `lesson_device_members`
WHEN NOT EXISTS (
  SELECT 1 FROM `lesson_learners` l JOIN `lesson_sessions` s ON s.id=l.session_id
  JOIN `lesson_class_members` cm ON cm.id=l.class_member_id
  JOIN `lesson_classes` c ON c.id=cm.class_id
  WHERE l.session_id=NEW.session_id AND l.learner_id=NEW.learner_id AND l.class_member_id=NEW.class_member_id
  AND s.class_id=cm.class_id AND l.present=1 AND cm.revoked_at IS NULL AND c.deleted_at IS NULL
)
BEGIN SELECT RAISE(ABORT,'INVALID_DEVICE_MEMBER'); END;
