CREATE DOMAIN uint_256 AS NUMERIC
CHECK (VALUE >= 0 AND VALUE < 2::numeric ^ 256)
CHECK (SCALE(VALUE) = 0);

CREATE TYPE event_type AS ENUM (
    'ponzi_land-AuctionFinishedEvent',
    'ponzi_land-LandBoughtEvent',
    'ponzi_land-LandNukedEvent',
    'ponzi_land-NewAuctionEvent',
    'ponzi_land-AddressAuthorizedEvent',
    'ponzi_land-AddressRemovedEvent',
    'ponzi_land-VerifierUpdatedEvent'
);

CREATE TABLE event (
    id TEXT NOT NULL PRIMARY KEY,
    at timestamp without time zone NOT NULL,
    event_type event_type NOT NULL
);

CREATE TABLE event_auction_finished (
    id TEXT NOT NULL PRIMARY KEY,
    location INT4 NOT NULL,
    buyer text NOT NULL,
    price uint_256 NOT NULL
);

CREATE TABLE event_address_authorized (
    id TEXT NOT NULL PRIMARY KEY,
    at timestamp without time zone NOT NULL,
    address text NOT NULL
);

CREATE TABLE event_address_removed (
    id TEXT NOT NULL PRIMARY KEY,
    at timestamp without time zone NOT NULL,
    address text NOT NULL
);

CREATE TABLE event_land_bought (
    id TEXT NOT NULL PRIMARY KEY,
    location INT4 NOT NULL,
    buyer text NOT NULL,
    seller text NOT NULL,
    price uint_256 NOT NULL,
    token_used text NOT NULL
);

CREATE TABLE event_new_auction (
    id TEXT NOT NULL PRIMARY KEY,
    location INT4 NOT NULL,
    starting_price uint_256 NOT NULL,
    floor_price uint_256 NOT NULL
);

CREATE TABLE event_land_nuked (
    id TEXT NOT NULL PRIMARY KEY,
    location INT4 NOT NULL,
    owner text NOT NULL
);
