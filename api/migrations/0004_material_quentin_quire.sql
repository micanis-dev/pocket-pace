ALTER TABLE `saving_goals` ADD `is_primary` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `savings_rules` ADD `saving_goal_id` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `default_category_id` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `default_payment_method` text DEFAULT 'cash' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `default_account_id` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `default_credit_card_id` text;