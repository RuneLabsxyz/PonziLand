-- Add usd_ratio column to historical_price_feed
ALTER TABLE historical_price_feed ADD COLUMN usd_ratio DECIMAL(20, 8);

-- Create index on usd_ratio for queries
CREATE INDEX idx_historical_price_feed_usd_ratio ON historical_price_feed(usd_ratio);
