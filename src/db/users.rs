use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppResult,
    models::user::User,
};

pub async fn create_user(
    pool: &PgPool,
    username: &str,
    password_hash: &str,
) -> AppResult<User> {
    let id = Uuid::new_v4();

    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (id, username, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, username, password_hash, created_at
        "#,
    )
    .bind(id)
    .bind(username)
    .bind(password_hash)
    .fetch_one(pool)
    .await?;

    Ok(user)
}

pub async fn get_user_by_username(
    pool: &PgPool,
    username: &str,
) -> AppResult<Option<User>> {
    let user = sqlx::query_as::<_, User>(
        r#"
        SELECT id, username, password_hash, created_at
        FROM users
        WHERE username = $1
        "#,
    )
    .bind(username)
    .fetch_optional(pool)
    .await?;

    Ok(user)
}

#[allow(dead_code)]
pub async fn get_user_by_id(pool: &PgPool, id: Uuid) -> AppResult<Option<User>> {
    let user = sqlx::query_as::<_, User>(
        r#"
        SELECT id, username, password_hash, created_at
        FROM users
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(user)
}

