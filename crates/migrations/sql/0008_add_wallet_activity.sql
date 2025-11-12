-- Migration to add wallet activity tracking table
CREATE TABLE wallet_activity (
    id SERIAL PRIMARY KEY,
    address TEXT NOT NULL,
    first_activity_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    activity_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE UNIQUE INDEX wallet_activity_address_idx ON wallet_activity (address);
CREATE INDEX wallet_activity_last_activity_idx ON wallet_activity (last_activity_at DESC);
CREATE INDEX wallet_activity_first_activity_idx ON wallet_activity (first_activity_at DESC);
CREATE INDEX wallet_activity_count_idx ON wallet_activity (activity_count DESC);

-- Relational alternative: view aggregating wallet activity from event tables
CREATE OR REPLACE VIEW wallet_activity_view AS
WITH all_addresses AS (
    SELECT e.at, elb.buyer AS address FROM event e JOIN event_land_bought elb ON e.id = elb.id
    UNION ALL
    SELECT e.at, elb.seller AS address FROM event e JOIN event_land_bought elb ON e.id = elb.id
    UNION ALL
    SELECT e.at, eaf.buyer AS address FROM event e JOIN event_auction_finished eaf ON e.id = eaf.id
    UNION ALL
    SELECT e.at, eln.owner AS address FROM event e JOIN event_land_nuked eln ON e.id = eln.id
    UNION ALL
    SELECT e.at, eaa.address AS address FROM event e JOIN event_address_authorized eaa ON e.id = eaa.id
    UNION ALL
    SELECT e.at, ear.address AS address FROM event e JOIN event_address_removed ear ON e.id = ear.id
)
SELECT
    address,
    MIN(at) AS first_activity_at,
    MAX(at) AS last_activity_at,
    COUNT(*) AS activity_count
FROM all_addresses
WHERE address IS NOT NULL AND address <> '0' AND address <> '0x0'
GROUP BY address;

CREATE INDEX IF NOT EXISTS event_land_bought_buyer_idx ON event_land_bought (buyer);
CREATE INDEX IF NOT EXISTS event_land_bought_seller_idx ON event_land_bought (seller);
CREATE INDEX IF NOT EXISTS event_auction_finished_buyer_idx ON event_auction_finished (buyer);
CREATE INDEX IF NOT EXISTS event_land_nuked_owner_idx ON event_land_nuked (owner);
CREATE INDEX IF NOT EXISTS event_address_authorized_address_idx ON event_address_authorized (address);
CREATE INDEX IF NOT EXISTS event_address_removed_address_idx ON event_address_removed (address);