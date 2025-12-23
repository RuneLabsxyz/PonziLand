-- Add messages table for wallet-to-wallet DMs
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender VARCHAR(66) NOT NULL,
    recipient VARCHAR(66) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fetching conversation between two addresses (order-independent)
CREATE INDEX idx_messages_conversation ON messages (
    LEAST(sender, recipient),
    GREATEST(sender, recipient),
    created_at DESC
);

-- Index for fetching messages received by a user (for conversation list)
CREATE INDEX idx_messages_recipient ON messages (recipient, created_at DESC);

-- Index for fetching messages sent by a user
CREATE INDEX idx_messages_sender ON messages (sender, created_at DESC);
