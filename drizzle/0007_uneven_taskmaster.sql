CREATE TABLE `purchaseItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(180) NOT NULL,
	`sku` varchar(80) NOT NULL,
	`unit` varchar(40) NOT NULL DEFAULT 'قطعة',
	`quantity` int NOT NULL,
	`unitPrice` decimal(12,2) NOT NULL,
	`total` decimal(12,2) NOT NULL,
	CONSTRAINT `purchaseItems_id` PRIMARY KEY(`id`)
);
