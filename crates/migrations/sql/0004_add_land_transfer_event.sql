ALTER TYPE event_type ADD VALUE 'ponzi_land-LandTransferEvent';

CREATE TABLE event_land_transfer (
    id TEXT NOT NULL PRIMARY KEY,
    from_location INT4 NOT NULL,
    to_location INT4 NOT NULL,
    token_address TEXT NOT NULL,
    amount uint_256 NOT NULL
);
