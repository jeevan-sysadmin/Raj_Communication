-- Ensure products stock_quantity column exists for older schemas.
-- Safe for MariaDB/MySQL versions that support IF NOT EXISTS.

ALTER TABLE `products`
  ADD COLUMN IF NOT EXISTS `stock_quantity` INT(10) UNSIGNED NOT NULL DEFAULT 1 AFTER `price`;
