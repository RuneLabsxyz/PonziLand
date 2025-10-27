-- Add token_inflows and token_outflows columns to simple_positions table
ALTER TABLE simple_positions 
ADD COLUMN token_inflows JSONB NOT NULL DEFAULT '{}',
ADD COLUMN token_outflows JSONB NOT NULL DEFAULT '{}';

-- Create indexes for efficient querying of token flows
CREATE INDEX idx_simple_positions_token_inflows ON simple_positions USING gin(token_inflows);
CREATE INDEX idx_simple_positions_token_outflows ON simple_positions USING gin(token_outflows);