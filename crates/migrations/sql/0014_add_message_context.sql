-- Add context fields to messages for activity-scoped chat
ALTER TABLE messages
ADD COLUMN context_type VARCHAR(50) DEFAULT NULL,
ADD COLUMN context_id VARCHAR(255) DEFAULT NULL;

-- Index for fetching messages by context
CREATE INDEX idx_messages_context ON messages (context_type, context_id, created_at DESC)
WHERE context_type IS NOT NULL;
