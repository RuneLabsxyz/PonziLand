-- Add token flow tracking to simple positions table
-- This separates land buy/sell transactions from operational token flows (taxes, etc.)

ALTER TABLE simple_positions 
ADD COLUMN token_inflows JSONB DEFAULT '{}',
ADD COLUMN token_outflows JSONB DEFAULT '{}';

-- Create indexes for efficient querying of JSON fields
CREATE INDEX idx_simple_positions_token_inflows_gin ON simple_positions USING gin(token_inflows);
CREATE INDEX idx_simple_positions_token_outflows_gin ON simple_positions USING gin(token_outflows);

-- Add comments to clarify the difference between buy/sell vs flows
COMMENT ON COLUMN simple_positions.buy_cost_token IS 'Cost to acquire the land itself';
COMMENT ON COLUMN simple_positions.sale_revenue_token IS 'Revenue from selling the land itself';
COMMENT ON COLUMN simple_positions.token_inflows IS 'Aggregated token amounts received while holding land (taxes, etc.) as {token_address: amount}';
COMMENT ON COLUMN simple_positions.token_outflows IS 'Aggregated token amounts paid while holding land (taxes, etc.) as {token_address: amount}';