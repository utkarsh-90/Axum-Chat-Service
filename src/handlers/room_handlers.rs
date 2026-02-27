use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    auth::extractor::AuthUser,
    db::{
        messages::{list_messages_before, list_recent_messages_with_usernames},
        rooms::{create_room, get_room_if_member, list_rooms_for_user},
    },
    error::{AppError, AppResult},
    models::room::{CreateRoomRequest, Room},
    state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct ListMessagesQuery {
    pub before: Option<Uuid>,
    #[serde(default = "default_limit")]
    pub limit: i64,
}

fn default_limit() -> i64 {
    50
}

pub async fn list_rooms_handler(
    State(state): State<AppState>,
    auth: AuthUser,
) -> AppResult<Json<Vec<Room>>> {
    let rooms = list_rooms_for_user(&state.db, auth.user_id).await?;
    Ok(Json(rooms))
}

pub async fn create_room_handler(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<CreateRoomRequest>,
) -> AppResult<Json<Room>> {
    if payload.name.trim().is_empty() {
        return Err(AppError::BadRequest("room name must not be empty".into()));
    }

    let room = create_room(&state.db, auth.user_id, &payload.name).await?;
    Ok(Json(room))
}

pub async fn join_room_handler(
    State(state): State<AppState>,
    Path(room_id): Path<Uuid>,
    auth: AuthUser,
) -> AppResult<Json<Room>> {
    // Ensure room exists.
    let room = crate::db::rooms::get_room_by_id(&state.db, room_id)
        .await?
        .ok_or_else(|| AppError::NotFound("room not found".into()))?;

    // Add membership (idempotent).
    sqlx::query(
        r#"
        INSERT INTO room_members (room_id, user_id, role)
        VALUES ($1, $2, 'member')
        ON CONFLICT (room_id, user_id) DO NOTHING
        "#,
    )
    .bind(room_id)
    .bind(auth.user_id)
    .execute(&state.db)
    .await?;

    // Optionally, we could preload recent messages here as metadata.
    Ok(Json(room))
}

pub async fn list_room_messages_handler(
    State(state): State<AppState>,
    Path(room_id): Path<Uuid>,
    Query(q): Query<ListMessagesQuery>,
    auth: AuthUser,
) -> AppResult<Json<Vec<crate::models::message::MessageWithUsername>>> {
    let _room = get_room_if_member(&state.db, room_id, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("room not found".into()))?;

    let limit = q.limit.clamp(1, 100);
    let messages = match q.before {
        Some(before) => list_messages_before(&state.db, room_id, before, limit).await?,
        None => list_recent_messages_with_usernames(&state.db, room_id, limit).await?,
    };
    Ok(Json(messages))
}

