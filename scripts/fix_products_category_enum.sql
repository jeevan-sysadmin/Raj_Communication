-- Fix products.category enum so selected UI categories store correctly.
-- Run this on your `raj communication` database.

ALTER TABLE `products`
  MODIFY `category` ENUM(
    'CAMERA',
    'DVR',
    'NVR',
    'HARDDISK',
    'SOLAR CAMERA',
    'PTCAMERA',
    'SD CARD',
    'SSD',
    'POWER SUPPLY',
    'MONITOR',
    'EXTENDER',
    'MEDIA CONVERTER',
    'PTZCAMERA',
    'POE SWITCH',
    'DESKTOP SWITCH',
    'TV',
    'UPS',
    'OTHERS'
  ) NOT NULL DEFAULT 'CAMERA';

-- Optional cleanup: convert old typo value to correct value before/after alter if needed.
-- UPDATE `products` SET `category` = 'MEDIA CONVERTER' WHERE `category` = 'EDIA CONVERTER';

