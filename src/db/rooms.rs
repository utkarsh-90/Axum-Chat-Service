use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppResult,
    models::room::Room,
};

pub async fn create_room(pool: &PgPool, name: &str) -> AppResult<Room> {
    let id = Uuid::new_v4();

    let room = sqlx::query_as::<_, Room>(
        r#"
        INSERT INTO rooms (id, name)
        VALUES ($1, $2)
        RETURNING id, name, created_at
        "#,
    )
    .bind(id)
    .bind(name)
    .fetch_one(pool)
    .await?;

    Ok(room)
}

pub async fn list_rooms(pool: &PgPool) -> AppResult<Vec<Room>> {
    let rooms = sqlx::query_as::<_, Room>(
        r#"
        SELECT id, name, created_at
        FROM rooms
        ORDER BY created_at ASC
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(rooms)
}

pub async fn get_room(pool: &PgPool, id: Uuid) -> AppResult<Option<Room>> {
    let room = sqlx::query_as::<_, Room>(
        r#"
        SELECT id, name, created_at
        FROM rooms
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(room)
}

