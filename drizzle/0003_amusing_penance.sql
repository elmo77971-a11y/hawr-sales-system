CREATE TABLE `syncOperations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operationId` varchar(80) NOT NULL,
	`operationType` varchar(80) NOT NULL,
	`payload` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `syncOperations_id` PRIMARY KEY(`id`),
	CONSTRAINT `syncOperations_operationId_unique` UNIQUE(`operationId`)
);
