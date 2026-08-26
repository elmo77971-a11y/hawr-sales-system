ALTER TABLE `users` ADD `employeeCode` varchar(40);--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_employeeCode_unique` UNIQUE(`employeeCode`);