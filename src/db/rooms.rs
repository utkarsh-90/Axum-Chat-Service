use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppResult,
    models::room::Room,
};

pub async fn create_room(pool: &PgPool, owner_user_id: Uuid, name: &str) -> AppResult<Room> {
    let id = Uuid::new_v4();

    let mut tx = pool.begin().await?;

    let room = sqlx::query_as::<_, Room>(
        r#"
        INSERT INTO rooms (id, name, owner_user_id)
        VALUES ($1, $2, $3)
        RETURNING id, name, created_at, owner_user_id
        "#,
    )
    .bind(id)
    .bind(name)
    .bind(owner_user_id)
    .fetch_one(&mut *tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO room_members (room_id, user_id, role)
        VALUES ($1, $2, 'owner')
        ON CONFLICT (room_id, user_id) DO NOTHING
        "#,
    )
    .bind(room.id)
    .bind(owner_user_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(room)
}

pub async fn list_rooms_for_user(pool: &PgPool, user_id: Uuid) -> AppResult<Vec<Room>> {
    let rooms = sqlx::query_as::<_, Room>(
        r#"
        SELECT r.id, r.name, r.created_at, r.owner_user_id
        FROM rooms r
        JOIN room_members rm ON rm.room_id = r.id
        WHERE rm.user_id = $1
        ORDER BY r.created_at ASC
        "#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(rooms)
}

pub async fn get_room_if_member(
    pool: &PgPool,
    id: Uuid,
    user_id: Uuid,
) -> AppResult<Option<Room>> {
    let room = sqlx::query_as::<_, Room>(
        r#"
        SELECT r.id, r.name, r.created_at, r.owner_user_id
        FROM rooms r
        JOIN room_members rm ON rm.room_id = r.id
        WHERE r.id = $1 AND rm.user_id = $2
        "#,
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?;

    Ok(room)
}

pub async fn get_room_by_id(pool: &PgPool, id: Uuid) -> AppResult<Option<Room>> {
    let room = sqlx::query_as::<_, Room>(
        r#"
        SELECT id, name, created_at, owner_user_id
        FROM rooms
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(room)
}

