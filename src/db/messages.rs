use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppResult,
    models::message::{Message, MessageWithUsername},
};

pub async fn create_message(
    pool: &PgPool,
    room_id: Uuid,
    user_id: Uuid,
    content: &str,
) -> AppResult<Message> {
    let id = Uuid::new_v4();

    let message = sqlx::query_as::<_, Message>(
        r#"
        INSERT INTO messages (id, room_id, user_id, content)
        VALUES ($1, $2, $3, $4)
        RETURNING id, room_id, user_id, content, created_at
        "#,
    )
    .bind(id)
    .bind(room_id)
    .bind(user_id)
    .bind(content)
    .fetch_one(pool)
    .await?;

    Ok(message)
}

#[allow(dead_code)]
pub async fn list_recent_messages(
    pool: &PgPool,
    room_id: Uuid,
    limit: i64,
) -> AppResult<Vec<Message>> {
    let messages = sqlx::query_as::<_, Message>(
        r#"
        SELECT id, room_id, user_id, content, created_at
        FROM messages
        WHERE room_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        "#,
    )
    .bind(room_id)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    Ok(messages)
}

pub async fn list_recent_messages_with_usernames(
    pool: &PgPool,
    room_id: Uuid,
    limit: i64,
) -> AppResult<Vec<MessageWithUsername>> {
    let messages = sqlx::query_as::<_, MessageWithUsername>(
        r#"
        SELECT m.id, m.room_id, m.user_id, u.username, m.content, m.created_at
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.room_id = $1
        ORDER BY m.created_at DESC
        LIMIT $2
        "#,
    )
    .bind(room_id)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    Ok(messages)
}

pub async fn list_messages_before(
    pool: &PgPool,
    room_id: Uuid,
    before: Uuid,
    limit: i64,
) -> AppResult<Vec<MessageWithUsername>> {
    let messages = sqlx::query_as::<_, MessageWithUsername>(
        r#"
        SELECT m.id, m.room_id, m.user_id, u.username, m.content, m.created_at
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.room_id = $1 AND m.created_at < (SELECT created_at FROM messages WHERE id = $2)
        ORDER BY m.created_at DESC
        LIMIT $3
        "#,
    )
    .bind(room_id)
    .bind(before)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    Ok(messages)
}

