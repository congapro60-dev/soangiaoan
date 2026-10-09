CREATE TABLE `lesson_package_sources` (
 `package_row_id` text NOT NULL,
 `package_version` text NOT NULL,
 `package_hash` text NOT NULL,
 `source_id` text NOT NULL,
 `source_sha256` text NOT NULL,
 `extraction_revision` text NOT NULL,
 `extraction_hash` text NOT NULL,
 `owner_account_id` text NOT NULL,
 FOREIGN KEY (`package_row_id`) REFERENCES `lesson_packages`(`row_id`) ON UPDATE no action ON DELETE no action,
 FOREIGN KEY (`source_id`) REFERENCES `lesson_sources`(`id`) ON UPDATE no action ON DELETE no action,
 FOREIGN KEY (`owner_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_package_source` ON `lesson_package_sources` (`package_row_id`,`package_version`,`package_hash`,`source_id`);
--> statement-breakpoint
CREATE TABLE `lesson_sources` (
 `id` text PRIMARY KEY NOT NULL,
 `owner_account_id` text NOT NULL,
 `request_id` text NOT NULL,
 `request_fingerprint` text NOT NULL,
 `original_name` text NOT NULL,
 `mime` text NOT NULL,
 `bytes` integer NOT NULL,
 `sha256` text NOT NULL,
 `status` text NOT NULL,
 `parser_revision` text NOT NULL,
 `extraction_hash` text,
 `error_code` text,
 `created_at` integer NOT NULL,
 `updated_at` integer NOT NULL,
 FOREIGN KEY (`owner_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_source_request` ON `lesson_sources` (`owner_account_id`,`request_id`);
--> statement-breakpoint
CREATE INDEX `idx_lesson_source_owner` ON `lesson_sources` (`owner_account_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_source_hash` ON `lesson_sources` (`owner_account_id`,`sha256`);
