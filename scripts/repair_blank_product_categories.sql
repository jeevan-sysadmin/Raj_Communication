-- One-time data repair for existing rows where category became empty due to invalid enum inserts.
UPDATE `products`
SET `category` = 'OTHERS'
WHERE `category` = '' OR `category` IS NULL;

