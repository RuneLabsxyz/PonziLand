use crate::{Database, Error};
use chaindata_models::models::{ConversationSummary, MessageModel};
use chrono::{DateTime, Utc};
use uuid::Uuid;

pub struct MessagesRepository {
    db: Database,
}

impl MessagesRepository {
    #[must_use]
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Insert a new message
    ///
    /// # Errors
    /// Returns an error if the insert fails
    pub async fn insert_message(
        &self,
        sender: &str,
        recipient: &str,
        content: &str,
    ) -> Result<MessageModel, Error> {
        let result = sqlx::query_as::<_, MessageModel>(
            r#"
            INSERT INTO messages (sender, recipient, content)
            VALUES ($1, $2, $3)
            RETURNING id, sender, recipient, content, created_at
            "#,
        )
        .bind(sender)
        .bind(recipient)
        .bind(content)
        .fetch_one(&mut *(self.db.acquire().await?))
        .await?;

        Ok(result)
    }

    /// Get messages between two addresses
    ///
    /// # Errors
    /// Returns an error if the query fails
    pub async fn get_conversation(
        &self,
        address1: &str,
        address2: &str,
        after: Option<DateTime<Utc>>,
        limit: i64,
    ) -> Result<Vec<MessageModel>, Error> {
        let messages = if let Some(after_ts) = after {
            sqlx::query_as::<_, MessageModel>(
                r#"
                SELECT id, sender, recipient, content, created_at
                FROM messages
                WHERE (
                    (sender = $1 AND recipient = $2) OR
                    (sender = $2 AND recipient = $1)
                )
                AND created_at > $3
                ORDER BY created_at ASC
                LIMIT $4
                "#,
            )
            .bind(address1)
            .bind(address2)
            .bind(after_ts)
            .bind(limit)
            .fetch_all(&mut *(self.db.acquire().await?))
            .await?
        } else {
            sqlx::query_as::<_, MessageModel>(
                r#"
                SELECT id, sender, recipient, content, created_at
                FROM messages
                WHERE (
                    (sender = $1 AND recipient = $2) OR
                    (sender = $2 AND recipient = $1)
                )
                ORDER BY created_at DESC
                LIMIT $3
                "#,
            )
            .bind(address1)
            .bind(address2)
            .bind(limit)
            .fetch_all(&mut *(self.db.acquire().await?))
            .await?
        };

        Ok(messages)
    }

    /// Get all conversations for a user with last message summary
    ///
    /// # Errors
    /// Returns an error if the query fails
    pub async fn get_conversations(&self, address: &str) -> Result<Vec<ConversationSummary>, Error> {
        // This query finds the most recent message for each conversation partner
        let conversations = sqlx::query_as::<_, ConversationSummary>(
            r#"
            WITH latest_messages AS (
                SELECT DISTINCT ON (
                    CASE
                        WHEN sender = $1 THEN recipient
                        ELSE sender
                    END
                )
                    CASE
                        WHEN sender = $1 THEN recipient
                        ELSE sender
                    END as with_address,
                    content as last_message,
                    created_at as last_message_at
                FROM messages
                WHERE sender = $1 OR recipient = $1
                ORDER BY
                    CASE
                        WHEN sender = $1 THEN recipient
                        ELSE sender
                    END,
                    created_at DESC
            ),
            unread_counts AS (
                SELECT
                    sender as from_address,
                    COUNT(*) as unread_count
                FROM messages
                WHERE recipient = $1
                GROUP BY sender
            )
            SELECT
                lm.with_address,
                lm.last_message,
                lm.last_message_at,
                COALESCE(uc.unread_count, 0) as unread_count
            FROM latest_messages lm
            LEFT JOIN unread_counts uc ON uc.from_address = lm.with_address
            ORDER BY lm.last_message_at DESC
            "#,
        )
        .bind(address)
        .fetch_all(&mut *(self.db.acquire().await?))
        .await?;

        Ok(conversations)
    }

    /// Get a message by ID
    ///
    /// # Errors
    /// Returns an error if the query fails
    pub async fn get_message_by_id(&self, id: Uuid) -> Result<Option<MessageModel>, Error> {
        let message = sqlx::query_as::<_, MessageModel>(
            r#"
            SELECT id, sender, recipient, content, created_at
            FROM messages
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&mut *(self.db.acquire().await?))
        .await?;

        Ok(message)
    }
}
