CREATE TABLE `account_transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`from_account_id` text NOT NULL,
	`to_account_id` text NOT NULL,
	`amount` integer NOT NULL,
	`transfer_date` text NOT NULL,
	`memo` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `income_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`name` text NOT NULL,
	`amount` integer NOT NULL,
	`income_day` integer NOT NULL,
	`input_mode` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notification_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`timing` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_user_type_idx` ON `notification_settings` (`user_id`,`type`);--> statement-breakpoint
CREATE TABLE `saving_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`target_amount` integer NOT NULL,
	`current_amount` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `savings_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`amount` integer,
	`percentage` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `planned_expenses` ADD `account_id` text REFERENCES accounts(id);--> statement-breakpoint
ALTER TABLE `planned_expenses` ADD `credit_card_id` text REFERENCES credit_cards(id);--> statement-breakpoint
ALTER TABLE `planned_expenses` ADD `category_id` text NOT NULL REFERENCES expense_categories(id);--> statement-breakpoint
ALTER TABLE `planned_expenses` ADD `name` text NOT NULL;--> statement-breakpoint
ALTER TABLE `planned_expenses` ADD `planned_date` text NOT NULL;--> statement-breakpoint
ALTER TABLE `planned_expenses` ADD `confirmed_date` text;--> statement-breakpoint
ALTER TABLE `planned_expenses` ADD `payment_method` text NOT NULL;--> statement-breakpoint
ALTER TABLE `planned_expenses` ADD `memo` text;--> statement-breakpoint
ALTER TABLE `recurring_expenses` ADD `account_id` text REFERENCES accounts(id);--> statement-breakpoint
ALTER TABLE `recurring_expenses` ADD `credit_card_id` text REFERENCES credit_cards(id);--> statement-breakpoint
ALTER TABLE `recurring_expenses` ADD `category_id` text NOT NULL REFERENCES expense_categories(id);--> statement-breakpoint
ALTER TABLE `recurring_expenses` ADD `name` text NOT NULL;--> statement-breakpoint
ALTER TABLE `recurring_expenses` ADD `payment_method` text NOT NULL;--> statement-breakpoint
ALTER TABLE `recurring_expenses` ADD `billing_day` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `recurring_expenses` ADD `is_amount_fixed` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `saving_allocations` ADD `income_id` text REFERENCES incomes(id);--> statement-breakpoint
ALTER TABLE `saving_allocations` ADD `saving_goal_id` text NOT NULL REFERENCES saving_goals(id);