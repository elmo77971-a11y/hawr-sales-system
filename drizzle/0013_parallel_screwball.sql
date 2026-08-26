CREATE TABLE `inventoryTransfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL,
	`fromLocation` varchar(120) NOT NULL,
	`toLocation` varchar(120) NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventoryTransfers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `inventoryMovements` MODIFY COLUMN `type` enum('purchase','return','sale','adjustment','transfer') NOT NULL;