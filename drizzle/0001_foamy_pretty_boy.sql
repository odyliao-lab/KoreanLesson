CREATE TABLE `assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_code` text NOT NULL,
	`title` text NOT NULL,
	`level` text NOT NULL,
	`day` integer NOT NULL,
	`due_date` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
