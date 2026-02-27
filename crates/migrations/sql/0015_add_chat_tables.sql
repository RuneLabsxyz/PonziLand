-- Migration to add chat system tables

-- Chat channel types: 'global' for public channels, 'dm' for direct messages
CREATE TYPE chat_channel_type AS ENUM ('global', 'dm');

-- Channels table (global chat + DM conversations)
CREATE TABLE chat_channel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_type chat_channel_type NOT NULL,
    name TEXT, -- NULL for DMs, set for global channels
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Participants in DM channels (exactly 2 per DM channel)
CREATE TABLE chat_channel_participant (
    id SERIAL PRIMARY KEY,
    channel_id UUID NOT NULL REFERENCES chat_channel(id) ON DELETE CASCADE,
    user_address TEXT NOT NULL,
    joined_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX chat_channel_participant_unique
    ON chat_channel_participant (channel_id, user_address);
CREATE INDEX chat_channel_participant_user_idx
    ON chat_channel_participant (user_address);

-- Messages table
CREATE TABLE chat_message (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES chat_channel(id) ON DELETE CASCADE,
    sender_address TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX chat_message_channel_created_idx
    ON chat_message (channel_id, created_at DESC);
CREATE INDEX chat_message_sender_idx
    ON chat_message (sender_address);

-- Bans / mutes table
CREATE TABLE chat_ban (
    id SERIAL PRIMARY KEY,
    user_address TEXT NOT NULL,
    reason TEXT,
    banned_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITHOUT TIME ZONE -- NULL = permanent
);

CREATE INDEX chat_ban_user_active_idx
    ON chat_ban (user_address, expires_at);

-- Seed the default global channel
INSERT INTO chat_channel (id, channel_type, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'global', 'General');
