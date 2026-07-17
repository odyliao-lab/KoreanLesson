CREATE TABLE `class_members` (
	`class_code` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'student' NOT NULL,
	`joined_at` integer NOT NULL,
	PRIMARY KEY(`class_code`, `email`)
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_email` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `learning_profiles` (
	`email` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'student' NOT NULL,
	`class_code` text,
	`payload` text DEFAULT '{}' NOT NULL,
	`updated_at` integer NOT NULL
);
