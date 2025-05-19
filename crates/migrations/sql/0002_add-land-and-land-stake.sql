CREATE TABLE land (
    id TEXT PRIMARY KEY,
    at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    location INT4 NOT NULL,
    bought_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    owner TEXT NOT NULL,
    sell_price uint_256 NOT NULL,
    token_used TEXT NOT NULL,
    level INT4 NOT NULL
);

CREATE TABLE land_stake (
    id TEXT PRIMARY KEY,
    at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    location INT4 NOT NULL,
    last_pay_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    amount uint_256 NOT NULL
);
