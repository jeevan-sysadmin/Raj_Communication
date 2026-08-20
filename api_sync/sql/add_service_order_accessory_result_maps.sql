ALTER TABLE `service_orders`
  ADD COLUMN `accessory_type_map` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`accessory_type_map`)) AFTER `issue_description_map`,
  ADD COLUMN `result_text_map` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' CHECK (json_valid(`result_text_map`)) AFTER `accessory_type_map`;
