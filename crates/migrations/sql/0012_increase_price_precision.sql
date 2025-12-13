-- Increase precision of price to support very small values (16+ decimals) and large values
ALTER TABLE historical_price_feed 
    ALTER COLUMN price TYPE DECIMAL(38, 18);
