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
        context_type: Option<&str>,
        context_id: Option<&str>,
    ) -> Result<MessageModel, Error> {
        let result = sqlx::query_as::<_, MessageModel>(
            r#"
            INSERT INTO messages (sender, recipient, content, context_type, context_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, sender, recipient, content, created_at, context_type, context_id
            "#,
        )
        .bind(sender)
        .bind(recipient)
        .bind(content)
        .bind(context_type)
        .bind(context_id)
        .fetch_one(&mut *(self.db.acquire().await?))
        .await?;

        Ok(result)
    }

    /// Get messages between two addresses (DMs only, no context)
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
                SELECT id, sender, recipient, content, created_at, context_type, context_id
                FROM messages
                WHERE (
                    (sender = $1 AND recipient = $2) OR
                    (sender = $2 AND recipient = $1)
                )
                AND context_type IS NULL
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
                SELECT id, sender, recipient, content, created_at, context_type, context_id
                FROM messages
                WHERE (
                    (sender = $1 AND recipient = $2) OR
                    (sender = $2 AND recipient = $1)
                )
                AND context_type IS NULL
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
    pub async fn get_conversations(
        &self,
        address: &str,
    ) -> Result<Vec<ConversationSummary>, Error> {
        // This query finds the most recent message for each conversation partner
        // Excludes global chat messages and context messages
        let conversations = sqlx::query_as::<_, ConversationSummary>(
            r#"
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
            WHERE (sender = $1 OR recipient = $1)
              AND recipient != 'global'
              AND sender != 'global'
              AND context_type IS NULL
            ORDER BY
                CASE
                    WHEN sender = $1 THEN recipient
                    ELSE sender
                END,
                created_at DESC
            "#,
        )
        .bind(address)
        .fetch_all(&mut *(self.db.acquire().await?))
        .await?;

        Ok(conversations)
    }

    /// Get global chat messages
    ///
    /// # Errors
    /// Returns an error if the query fails
    pub async fn get_global_messages(
        &self,
        after: Option<DateTime<Utc>>,
        limit: i64,
    ) -> Result<Vec<MessageModel>, Error> {
        let messages = if let Some(after_ts) = after {
            sqlx::query_as::<_, MessageModel>(
                r#"
                SELECT id, sender, recipient, content, created_at, context_type, context_id
                FROM messages
                WHERE recipient = 'global'
                AND created_at > $1
                ORDER BY created_at ASC
                LIMIT $2
                "#,
            )
            .bind(after_ts)
            .bind(limit)
            .fetch_all(&mut *(self.db.acquire().await?))
            .await?
        } else {
            sqlx::query_as::<_, MessageModel>(
                r#"
                SELECT id, sender, recipient, content, created_at, context_type, context_id
                FROM messages
                WHERE recipient = 'global'
                ORDER BY created_at DESC
                LIMIT $1
                "#,
            )
            .bind(limit)
            .fetch_all(&mut *(self.db.acquire().await?))
            .await?
        };

        Ok(messages)
    }

    /// Get messages for a specific context (e.g., activity comments)
    ///
    /// # Errors
    /// Returns an error if the query fails
    pub async fn get_context_messages(
        &self,
        context_type: &str,
        context_id: &str,
        after: Option<DateTime<Utc>>,
        limit: i64,
    ) -> Result<Vec<MessageModel>, Error> {
        let messages = if let Some(after_ts) = after {
            sqlx::query_as::<_, MessageModel>(
                r#"
                SELECT id, sender, recipient, content, created_at, context_type, context_id
                FROM messages
                WHERE context_type = $1
                AND context_id = $2
                AND created_at > $3
                ORDER BY created_at ASC
                LIMIT $4
                "#,
            )
            .bind(context_type)
            .bind(context_id)
            .bind(after_ts)
            .bind(limit)
            .fetch_all(&mut *(self.db.acquire().await?))
            .await?
        } else {
            sqlx::query_as::<_, MessageModel>(
                r#"
                SELECT id, sender, recipient, content, created_at, context_type, context_id
                FROM messages
                WHERE context_type = $1
                AND context_id = $2
                ORDER BY created_at DESC
                LIMIT $3
                "#,
            )
            .bind(context_type)
            .bind(context_id)
            .bind(limit)
            .fetch_all(&mut *(self.db.acquire().await?))
            .await?
        };

        Ok(messages)
    }

    /// Get a message by ID
    ///
    /// # Errors
    /// Returns an error if the query fails
    pub async fn get_message_by_id(&self, id: Uuid) -> Result<Option<MessageModel>, Error> {
        let message = sqlx::query_as::<_, MessageModel>(
            r#"
            SELECT id, sender, recipient, content, created_at, context_type, context_id
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
