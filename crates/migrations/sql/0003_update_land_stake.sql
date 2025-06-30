-- Add migration script here
ALTER TABLE land_stake
ADD COLUMN IF NOT EXISTS earliest_claim_neighbor_time BIGINT,
ADD COLUMN IF NOT EXISTS earliest_claim_neighbor_location BIGINT,
ADD COLUMN IF NOT EXISTS num_active_neighbors INTEGER;


ALTER TABLE land_stake
DROP COLUMN IF EXISTS last_pay_time;