-- Run this once to add the new columns to your existing districts table
-- and set sensible defaults for your existing districts.

ALTER TABLE districts
  ADD COLUMN IF NOT EXISTS max_capacity_m3 DECIMAL(10,2) DEFAULT 1000.00,
  ADD COLUMN IF NOT EXISTS max_consumers   INT           DEFAULT 500;

-- Update your existing districts with real limits (edit these values as needed)
UPDATE districts SET max_capacity_m3 = 5000, max_consumers = 200 WHERE id = 'D01';
UPDATE districts SET max_capacity_m3 = 5000, max_consumers = 200 WHERE id = 'D02';
UPDATE districts SET max_capacity_m3 = 5000, max_consumers = 200 WHERE id = 'D03';
UPDATE districts SET max_capacity_m3 = 5000, max_consumers = 200 WHERE id = 'D04';

-- Also update for your real districts if named differently
UPDATE districts SET max_capacity_m3 = 5000, max_consumers = 200 WHERE max_capacity_m3 IS NULL OR max_capacity_m3 = 0;
