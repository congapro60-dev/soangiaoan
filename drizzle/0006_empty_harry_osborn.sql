CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_email_unique` ON `accounts` (`email`);--> statement-breakpoint
CREATE TABLE `admin_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_account_id` text,
	`room_id` text,
	`action` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_admin_audit_room` ON `admin_audit` (`room_id`);--> statement-breakpoint
CREATE TABLE `host_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`expected_email` text NOT NULL,
	`role` text NOT NULL,
	`room_id` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`accepted_at` integer,
	`revoked_at` integer,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `host_invites_token_hash_unique` ON `host_invites` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_host_invites_email` ON `host_invites` (`expected_email`);--> statement-breakpoint
CREATE TABLE `room_memberships` (
	`room_id` text NOT NULL,
	`account_id` text NOT NULL,
	`role` text NOT NULL,
	`granted_at` integer NOT NULL,
	`granted_by` text,
	`revoked_at` integer,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_room_membership` ON `room_memberships` (`room_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `idx_membership_account` ON `room_memberships` (`account_id`);--> statement-breakpoint
CREATE TABLE `system_hosts` (
	`account_id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	`created_by` text,
	`revoked_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_system_hosts_revoked` ON `system_hosts` (`revoked_at`);--> statement-breakpoint
CREATE TABLE `system_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
