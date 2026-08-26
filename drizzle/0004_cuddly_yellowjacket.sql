ALTER TABLE `products` ADD `barcode` varchar(80);--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_barcode_unique` UNIQUE(`barcode`);