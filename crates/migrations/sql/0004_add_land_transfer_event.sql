CREATE DOMAIN uint_256 AS NUMERIC
CHECK (VALUE >= 0 AND VALUE < 2::numeric ^ 256)
CHECK (SCALE(VALUE) = 0);

ALTER TYPE event_type ADD VALUE 'ponzi_land-LandTransferEvent';

CREATE TABLE event_land_transfer (
    id TEXT NOT NULL PRIMARY KEY,
    from_location INT4 NOT NULL,
    to_location INT4 NOT NULL,
    token_address TEXT NOT NULL,
    amount uint_256 NOT NULL
);
