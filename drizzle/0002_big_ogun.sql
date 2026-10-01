DROP INDEX `idx_teams_room_name`;--> statement-breakpoint
ALTER TABLE `teams` ADD `removed_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_teams_room_name` ON `teams` (`room_id`,`name_key`) WHERE "teams"."removed_at" IS NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `round` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `control_key` text;--> statement-breakpoint
ALTER TABLE `rooms` ADD `deleted_at` integer;