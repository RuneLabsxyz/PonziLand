CREATE TABLE historical_price_feed (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes on symbol and timestamp
CREATE INDEX idx_historical_price_feed_symbol ON historical_price_feed(symbol);
CREATE INDEX idx_historical_price_feed_timestamp ON historical_price_feed(timestamp);
