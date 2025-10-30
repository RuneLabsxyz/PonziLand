-- Add simple positions table for tracking land ownership history
CREATE TABLE simple_positions (
    id TEXT PRIMARY KEY,
    at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    owner TEXT NOT NULL,
    land_location INT4 NOT NULL,
    time_bought TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX idx_simple_positions_owner ON simple_positions(owner);
CREATE INDEX idx_simple_positions_land_location ON simple_positions(land_location);
CREATE INDEX idx_simple_positions_time_bought ON simple_positions(time_bought DESC);
CREATE INDEX idx_simple_positions_owner_time ON simple_positions(owner, time_bought DESC);