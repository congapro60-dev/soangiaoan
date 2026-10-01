CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`admin_hash` text NOT NULL,
	`title` text NOT NULL,
	`created` integer NOT NULL,
	`started` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_code_unique` ON `rooms` (`code`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`name_key` text NOT NULL,
	`token_hash` text NOT NULL,
	`data` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_teams_room` ON `teams` (`room_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_teams_room_name` ON `teams` (`room_id`,`name_key`);