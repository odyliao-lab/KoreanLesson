CREATE TABLE `question_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_code` text,
	`reporter_email` text NOT NULL,
	`reporter_name` text NOT NULL,
	`level` text NOT NULL,
	`day` integer NOT NULL,
	`exercise_id` text NOT NULL,
	`kicker` text NOT NULL,
	`question` text NOT NULL,
	`submitted_answer` text NOT NULL,
	`expected_answer` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`resolution_note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
