use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Room {
    pub id: Uuid,
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub owner_user_id: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateRoomRequest {
    pub name: String,
}

