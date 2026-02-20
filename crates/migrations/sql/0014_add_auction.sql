CREATE TABLE auction (
    id TEXT PRIMARY KEY,
    at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    location INT4 NOT NULL,
    start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    start_price uint_256 NOT NULL,
    floor_price uint_256 NOT NULL,
    is_finished BOOLEAN NOT NULL,
    decay_rate INT2 NOT NULL,
    sold_at_price uint_256
);

CREATE UNIQUE INDEX idx_auction_location ON auction (location);
