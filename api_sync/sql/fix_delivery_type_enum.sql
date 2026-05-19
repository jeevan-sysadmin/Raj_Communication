-- Normalize legacy/empty delivery_type values to valid enum values.
-- Valid enum: 'inhand', 'courier', 'parcelservice'

UPDATE deliveries
SET delivery_type = 'inhand'
WHERE delivery_type IS NULL
   OR delivery_type = ''
   OR delivery_type = 'in_hand'
   OR delivery_type = 'pickup';

UPDATE deliveries
SET delivery_type = 'parcelservice'
WHERE delivery_type = 'parcel_service'
   OR delivery_type = 'delivery'
   OR delivery_type = 'home_delivery';

-- Safety: if enum definition has drifted, enforce it.
ALTER TABLE deliveries
  MODIFY delivery_type ENUM('inhand','courier','parcelservice') NOT NULL DEFAULT 'inhand';
