ALTER TABLE `users` RENAME COLUMN "auth0_user_id" TO "local_user_id";--> statement-breakpoint
DROP INDEX `users_auth0_user_id_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_local_user_id_unique` ON `users` (`local_user_id`);