-- Increase precision of usd_ratio to support very small values (16+ decimals) and large values
ALTER TABLE historical_price_feed 
    ALTER COLUMN usd_ratio TYPE DECIMAL(38, 18);
