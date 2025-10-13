-- Add AddStakeEvent type to event_type enum
ALTER TYPE event_type ADD VALUE 'ponzi_land-AddStakeEvent';

-- Create table for AddStakeEvent
CREATE TABLE event_add_stake (
    id TEXT NOT NULL PRIMARY KEY,
    location INT4 NOT NULL,
    new_stake_amount uint_256 NOT NULL,
    owner TEXT NOT NULL
);
