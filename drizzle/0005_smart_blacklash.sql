CREATE TABLE `decision_progress_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`decision_id` text NOT NULL,
	`note` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`decision_id`) REFERENCES `decisions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `decisions` ADD `evolution_insight` text;--> statement-breakpoint
ALTER TABLE `decisions` ADD `final_synthesis` text;