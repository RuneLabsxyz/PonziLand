-- ============================================================================
-- PNL Tracking System - Simplified Aggregation Model
-- ============================================================================
-- Design Philosophy:
--   1. One position = One land ownership period (entry → exit)
--   2. Aggregated counters updated incrementally (no row per tax event)
--   3. Single token_used per position (from Land model)
--   4. Multi-token taxes stored as JSONB (neighbors pay in their tokens)
-- ============================================================================

-- ============================================================================
-- Table: land_position
-- Purpose: Track complete position lifecycle with aggregated metrics
-- Updates: CREATE on entry, UPDATE during ownership, finalize on exit
-- ============================================================================
-- Enum types for stronger integrity (consistent with event_type pattern)
CREATE TYPE entry_type AS ENUM ('AUCTION', 'BUY');
CREATE TYPE exit_type AS ENUM ('SOLD', 'NUKED');
CREATE TYPE position_status AS ENUM ('ACTIVE', 'CLOSED');

CREATE TABLE land_position (
    -- Identity
    position_id SERIAL PRIMARY KEY,
    land_location INT4 NOT NULL,
    owner_address TEXT NOT NULL,

    -- Token used by THIS land during THIS position
    -- - Fees are paid in this token
    -- - Initial stake is in this token
    -- - Exit price will be in this token (becomes exit_token)
    token_used TEXT NOT NULL,

    -- Entry (immutable after INSERT)
    entry_price uint_256 NOT NULL,              -- Price paid in entry_token
    entry_token TEXT NOT NULL,                  -- Token used to BUY (can differ from token_used)
    entry_type entry_type NOT NULL,             -- 'AUCTION' | 'BUY'
    entry_timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    entry_event_id TEXT NOT NULL,

    -- Stake (mutable - updated via AddStakeEvent)
    initial_stake uint_256 NOT NULL,            -- Stake at entry (from LandStake.amount after entry)
    total_stake_added uint_256 NOT NULL DEFAULT 0, -- Sum of AddStake amounts


    -- Taxes (mutable - updated via LandTransferEvent)
    -- Earned: JSONB because neighbors pay in THEIR token_used
    -- Paid: Single amount because always paid in THIS position's token_used
    taxes_earned_by_token JSONB NOT NULL DEFAULT '{}'::jsonb, -- {"token_addr": "amount"}
    taxes_paid_amount uint_256 NOT NULL DEFAULT 0,     -- Total taxes paid (in token_used only)
    
    -- Fees (mutable - calculated and accumulated)
    -- All fees in their respective tokens (entry or position token)
    total_buy_fee uint_256 NOT NULL DEFAULT 0,         -- Fee on entry (in entry_token)
    total_claim_fees uint_256 NOT NULL DEFAULT 0,      -- Fees on claims (in token_used)

    -- Exit (NULL while ACTIVE, set once on close)
    exit_price uint_256,                        -- Price received (in token_used)
    stake_refunded uint_256,                    -- Stake returned (in token_used)
    exit_timestamp TIMESTAMP WITHOUT TIME ZONE,
    exit_type exit_type,                        -- 'SOLD' | 'NUKED'
    exit_event_id TEXT,

    -- Status
    status position_status NOT NULL,

    -- USD Valuation (nullable - calculated asynchronously from token prices)
    value_in_usdc uint_256
);

-- ============================================================================
-- Table: position_event_log (Audit Trail)
-- Purpose: Append-only log for debugging and event replay
-- Optional but HIGHLY recommended for production
-- ============================================================================
CREATE TABLE position_event_log (
    log_id SERIAL PRIMARY KEY,
    position_id INT4 NOT NULL REFERENCES land_position(position_id) ON DELETE CASCADE,

    event_type TEXT NOT NULL,                   -- 'CREATED' | 'STAKE_ADDED' | 'TAX_IN' | 'TAX_OUT' | 'CLOSED'
    event_data JSONB NOT NULL,                  -- Event details for replay

    timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    blockchain_event_id TEXT NOT NULL
);

-- ============================================================================
-- Table: pnl_processor_state
-- Purpose: Track last processed event timestamp for PnlProcessorTask
-- ============================================================================
CREATE TABLE pnl_processor_state (
    id INT4 PRIMARY KEY DEFAULT 1,
    last_processed_timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    last_processed_event_id TEXT,

    -- Constraint to ensure only one row exists
    CONSTRAINT single_row_constraint CHECK (id = 1)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Index for querying user's active positions
CREATE INDEX idx_position_owner_status ON land_position(owner_address, status);

-- Index for querying positions by location and status
CREATE INDEX idx_position_location_status ON land_position(land_location, status);

-- Index for filtering by status
CREATE INDEX idx_position_status ON land_position(status);

-- Index for position_event_log
CREATE INDEX idx_event_log_position ON position_event_log(position_id);

-- Index for temporal queries on event log
CREATE INDEX idx_event_log_timestamp ON position_event_log(timestamp);

-- Ensure only one ACTIVE position per land
CREATE UNIQUE INDEX ux_active_position_per_land ON land_position(land_location) WHERE status = 'ACTIVE';
-- ============================================================================
-- Initial Data
-- ============================================================================

-- Initialize pnl_processor_state with epoch start
-- This allows the processor to start from the beginning of time
INSERT INTO pnl_processor_state (id, last_processed_timestamp, last_processed_event_id)
VALUES (1, '1970-01-01 00:00:00'::TIMESTAMP, NULL);

