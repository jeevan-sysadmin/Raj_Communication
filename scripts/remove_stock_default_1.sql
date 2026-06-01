-- Remove stock_quantity default behavior.
-- Keeps column required and requires explicit value on insert.
ALTER TABLE `products`
  MODIFY `stock_quantity` INT(10) UNSIGNED NOT NULL;
