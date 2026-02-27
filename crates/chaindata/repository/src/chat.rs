use crate::{Database, Error};
use chaindata_models::models::{ChatBanModel, ChatChannelModel, ChatMessageModel};
use chrono::NaiveDateTime;
use sqlx::Row;
use uuid::Uuid;

/// Well-known UUID for the default "General" global channel.
pub const GLOBAL_CHANNEL_ID: Uuid = Uuid::from_bytes([
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
]);

pub struct ChatRepository {
    db: Database,
}

impl ChatRepository {
    #[must_use]
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    // ── Messages ──────────────────────────────────────────────

    /// Insert a new chat message and return its ID.
    ///
    /// # Errors
    /// Returns an error if the insert fails.
    pub async fn insert_message(
        &self,
        channel_id: Uuid,
        sender_address: &str,
        content: &str,
    ) -> Result<Uuid, Error> {
        let row = sqlx::query(
            r#"
            INSERT INTO chat_message (channel_id, sender_address, content)
            VALUES ($1, $2, $3)
            RETURNING id
            "#,
        )
        .bind(channel_id)
        .bind(sender_address)
        .bind(content)
        .fetch_one(&mut *(self.db.acquire().await?))
        .await?;

        Ok(row.get("id"))
    }

    /// Fetch the most recent messages for a channel (paginated, newest first).
    ///
    /// # Errors
    /// Returns an error if the query fails.
    pub async fn get_messages(
        &self,
        channel_id: Uuid,
        limit: i64,
        before: Option<NaiveDateTime>,
    ) -> Result<Vec<ChatMessageModel>, Error> {
        if let Some(before_ts) = before {
            sqlx::query_as::<_, ChatMessageModel>(
                r#"
                SELECT id, channel_id, sender_address, content, created_at
                FROM chat_message
                WHERE channel_id = $1 AND created_at < $2
                ORDER BY created_at DESC
                LIMIT $3
                "#,
            )
            .bind(channel_id)
            .bind(before_ts)
            .bind(limit)
            .fetch_all(&mut *(self.db.acquire().await?))
            .await
            .map_err(Error::from)
        } else {
            sqlx::query_as::<_, ChatMessageModel>(
                r#"
                SELECT id, channel_id, sender_address, content, created_at
                FROM chat_message
                WHERE channel_id = $1
                ORDER BY created_at DESC
                LIMIT $2
                "#,
            )
            .bind(channel_id)
            .bind(limit)
            .fetch_all(&mut *(self.db.acquire().await?))
            .await
            .map_err(Error::from)
        }
    }

    // ── Channels ──────────────────────────────────────────────

    /// Get a channel by ID.
    ///
    /// # Errors
    /// Returns an error if the query fails.
    pub async fn get_channel(&self, id: Uuid) -> Result<Option<ChatChannelModel>, Error> {
        sqlx::query_as::<_, ChatChannelModel>(
            r#"
            SELECT id, channel_type, name, created_at
            FROM chat_channel
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&mut *(self.db.acquire().await?))
        .await
        .map_err(Error::from)
    }

    /// Find an existing DM channel between two users, or return None.
    ///
    /// # Errors
    /// Returns an error if the query fails.
    pub async fn find_dm_channel(
        &self,
        user_a: &str,
        user_b: &str,
    ) -> Result<Option<ChatChannelModel>, Error> {
        sqlx::query_as::<_, ChatChannelModel>(
            r#"
            SELECT c.id, c.channel_type, c.name, c.created_at
            FROM chat_channel c
            WHERE c.channel_type = 'dm'
              AND c.id IN (
                SELECT cp1.channel_id
                FROM chat_channel_participant cp1
                JOIN chat_channel_participant cp2 ON cp1.channel_id = cp2.channel_id
                WHERE cp1.user_address = $1 AND cp2.user_address = $2
              )
            LIMIT 1
            "#,
        )
        .bind(user_a)
        .bind(user_b)
        .fetch_optional(&mut *(self.db.acquire().await?))
        .await
        .map_err(Error::from)
    }

    /// Create a DM channel between two users and return it.
    ///
    /// # Errors
    /// Returns an error if the insert fails.
    pub async fn create_dm_channel(
        &self,
        user_a: &str,
        user_b: &str,
    ) -> Result<ChatChannelModel, Error> {
        let mut tx = self.db.begin().await?;

        let channel = sqlx::query_as::<_, ChatChannelModel>(
            r#"
            INSERT INTO chat_channel (channel_type)
            VALUES ('dm')
            RETURNING id, channel_type, name, created_at
            "#,
        )
        .fetch_one(&mut *tx)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO chat_channel_participant (channel_id, user_address)
            VALUES ($1, $2), ($1, $3)
            "#,
        )
        .bind(channel.id)
        .bind(user_a)
        .bind(user_b)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(channel)
    }

    /// Get or create a DM channel between two users.
    ///
    /// # Errors
    /// Returns an error if the query or insert fails.
    pub async fn get_or_create_dm_channel(
        &self,
        user_a: &str,
        user_b: &str,
    ) -> Result<ChatChannelModel, Error> {
        if let Some(channel) = self.find_dm_channel(user_a, user_b).await? {
            return Ok(channel);
        }
        self.create_dm_channel(user_a, user_b).await
    }

    /// List all DM channels for a user.
    ///
    /// # Errors
    /// Returns an error if the query fails.
    pub async fn list_dm_channels(
        &self,
        user_address: &str,
    ) -> Result<Vec<ChatChannelModel>, Error> {
        sqlx::query_as::<_, ChatChannelModel>(
            r#"
            SELECT c.id, c.channel_type, c.name, c.created_at
            FROM chat_channel c
            JOIN chat_channel_participant cp ON c.id = cp.channel_id
            WHERE cp.user_address = $1 AND c.channel_type = 'dm'
            ORDER BY c.created_at DESC
            "#,
        )
        .bind(user_address)
        .fetch_all(&mut *(self.db.acquire().await?))
        .await
        .map_err(Error::from)
    }

    /// Get the other participant's address in a DM channel.
    ///
    /// # Errors
    /// Returns an error if the query fails.
    pub async fn get_dm_peer(
        &self,
        channel_id: Uuid,
        current_user: &str,
    ) -> Result<Option<String>, Error> {
        let row: Option<sqlx::postgres::PgRow> = sqlx::query(
            r#"
            SELECT user_address
            FROM chat_channel_participant
            WHERE channel_id = $1 AND user_address != $2
            LIMIT 1
            "#,
        )
        .bind(channel_id)
        .bind(current_user)
        .fetch_optional(&mut *(self.db.acquire().await?))
        .await?;

        Ok(row.map(|r| r.get("user_address")))
    }

    // ── Bans ──────────────────────────────────────────────────

    /// Check if a user is currently banned.
    ///
    /// # Errors
    /// Returns an error if the query fails.
    pub async fn is_user_banned(&self, user_address: &str) -> Result<bool, Error> {
        let row = sqlx::query(
            r#"
            SELECT COUNT(*) as count
            FROM chat_ban
            WHERE user_address = $1
              AND (expires_at IS NULL OR expires_at > NOW())
            "#,
        )
        .bind(user_address)
        .fetch_one(&mut *(self.db.acquire().await?))
        .await?;

        let count: i64 = row.get("count");
        Ok(count > 0)
    }

    /// Get active ban for a user, if any.
    ///
    /// # Errors
    /// Returns an error if the query fails.
    pub async fn get_active_ban(&self, user_address: &str) -> Result<Option<ChatBanModel>, Error> {
        sqlx::query_as::<_, ChatBanModel>(
            r#"
            SELECT id, user_address, reason, banned_at, expires_at
            FROM chat_ban
            WHERE user_address = $1
              AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY banned_at DESC
            LIMIT 1
            "#,
        )
        .bind(user_address)
        .fetch_optional(&mut *(self.db.acquire().await?))
        .await
        .map_err(Error::from)
    }

    // ── Rate limiting helper ──────────────────────────────────

    /// Count messages sent by a user in the last N seconds.
    ///
    /// # Errors
    /// Returns an error if the query fails.
    pub async fn count_recent_messages(
        &self,
        sender_address: &str,
        seconds: i64,
    ) -> Result<i64, Error> {
        let row = sqlx::query(
            r#"
            SELECT COUNT(*) as count
            FROM chat_message
            WHERE sender_address = $1
              AND created_at > (NOW() - make_interval(secs => $2))
            "#,
        )
        .bind(sender_address)
        .bind(seconds as f64)
        .fetch_one(&mut *(self.db.acquire().await?))
        .await?;

        Ok(row.get("count"))
    }
}
