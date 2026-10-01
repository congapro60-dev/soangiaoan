CREATE TABLE `community_players` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`event_id` text NOT NULL,
	`team_id` text NOT NULL,
	`data` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_community_event` ON `community_players` (`event_id`);