CREATE TABLE `installmentPayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`installmentId` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`paymentMethod` enum('cash','card','transfer') NOT NULL DEFAULT 'cash',
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `installmentPayments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `installments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`saleId` int NOT NULL,
	`customerId` int NOT NULL,
	`dueDate` timestamp NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`paidAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`status` enum('pending','partial','paid') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `installments_id` PRIMARY KEY(`id`)
);
