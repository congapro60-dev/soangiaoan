CREATE TABLE `skill_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`target_id` text NOT NULL,
	`kind` text NOT NULL,
	`cost` integer NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_skills_room` ON `skill_actions` (`room_id`);--> statement-breakpoint
CREATE INDEX `idx_skills_actor` ON `skill_actions` (`actor_id`);--> statement-breakpoint
CREATE INDEX `idx_skills_target` ON `skill_actions` (`target_id`);