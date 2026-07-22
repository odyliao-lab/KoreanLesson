CREATE TABLE `assignment_progress` (
	`assignment_id` integer NOT NULL,
	`student_email` text NOT NULL,
	`score` integer NOT NULL,
	`best_score` integer NOT NULL,
	`total_questions` integer NOT NULL,
	`attempt_count` integer DEFAULT 1 NOT NULL,
	`completed_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`assignment_id`, `student_email`)
);
--> statement-breakpoint
CREATE TABLE `parent_student_links` (
	`class_code` text NOT NULL,
	`parent_email` text NOT NULL,
	`student_email` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`class_code`, `parent_email`, `student_email`)
);
