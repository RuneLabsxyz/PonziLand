-- Add token_used column to event_auction_finished table
-- This tracks which token was used in auction transactions, matching LandBoughtEvent's token_used field
ALTER TABLE event_auction_finished ADD COLUMN token_used TEXT NOT NULL DEFAULT '';
