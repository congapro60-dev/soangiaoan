CREATE TABLE `lesson_pupil_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`learner_id` text NOT NULL,
	`request_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`package_hash` text NOT NULL,
	`activity_id` text,
	`task_id` text,
	`status` text DEFAULT 'new' NOT NULL,
	`previous_status` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `lesson_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`,`learner_id`) REFERENCES `lesson_learners`(`session_id`,`learner_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "lesson_report_category" CHECK("lesson_pupil_reports"."category" IN ('question_repeated','content','progress','display','other')),
	CONSTRAINT "lesson_report_description" CHECK(length("lesson_pupil_reports"."description") BETWEEN 10 AND 1200),
	CONSTRAINT "lesson_report_status" CHECK("lesson_pupil_reports"."status" IN ('new','reviewed','resolved','archived')),
	CONSTRAINT "lesson_report_previous_status" CHECK("lesson_pupil_reports"."previous_status" IN ('new','reviewed','resolved'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_report_request` ON `lesson_pupil_reports` (`session_id`,`learner_id`,`request_id`);--> statement-breakpoint
CREATE INDEX `idx_lesson_report_created` ON `lesson_pupil_reports` (`session_id`,`learner_id`,`created_at`);