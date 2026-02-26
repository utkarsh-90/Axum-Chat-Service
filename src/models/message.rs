use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Message {
    pub id: Uuid,
    pub room_id: Uuid,
    pub user_id: Uuid,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutgoingWsMessage {
    pub id: Uuid,
    pub room_id: Uuid,
    pub user_id: Uuid,
    pub username: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub kind: WsMessageKind,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WsMessageKind {
    History,
    Message,
    System,
}

/// Message row with username (e.g. from JOIN with users).
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MessageWithUsername {
    pub id: Uuid,
    pub room_id: Uuid,
    pub user_id: Uuid,
    pub username: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct IncomingWsMessage {
    pub content: String,
}

/// Max allowed message body length (chars/bytes).
pub const MAX_MESSAGE_LEN: usize = 4096;

