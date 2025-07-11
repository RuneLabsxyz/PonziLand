ALTER TABLE land_stake
ADD COLUMN IF NOT EXISTS earliest_claim_neighbor_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
ADD COLUMN IF NOT EXISTS earliest_claim_neighbor_location INT4 NOT NULL,
ADD COLUMN IF NOT EXISTS num_active_neighbors INT4 NOT NULL;


ALTER TABLE land_stake
DROP COLUMN IF EXISTS last_pay_time;