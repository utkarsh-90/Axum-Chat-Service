use axum::{
    extract::State,
    Json,
};

use chrono::{TimeZone, Utc};

use crate::{
    auth::{extractor::AuthUser, jwt::generate_token, password::{hash_password, verify_password}},
    db::users::{create_user, get_user_by_username},
    error::{AppError, AppResult},
    models::auth::{LoginRequest, LoginResponse, MeResponse, RegisterRequest},
    state::AppState,
};

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> AppResult<Json<LoginResponse>> {
    if payload.username.trim().is_empty() || payload.password.trim().is_empty() {
        return Err(AppError::BadRequest(
            "username and password must not be empty".into(),
        ));
    }

    if let Some(_) = get_user_by_username(&state.db, &payload.username).await? {
        return Err(AppError::BadRequest("username already taken".into()));
    }

    let password_hash = hash_password(&payload.password)?;
    let user = create_user(&state.db, &payload.username, &password_hash).await?;

    let token = generate_token(&state, user.id, &user.username)?;

    Ok(Json(LoginResponse {
        token,
        user_id: user.id,
        username: user.username,
    }))
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> AppResult<Json<LoginResponse>> {
    let user = get_user_by_username(&state.db, &payload.username)
        .await?
        .ok_or_else(|| AppError::Unauthorized("invalid credentials".into()))?;

    let valid = verify_password(&user.password_hash, &payload.password)?;
    if !valid {
        return Err(AppError::Unauthorized("invalid credentials".into()));
    }

    let token = generate_token(&state, user.id, &user.username)?;

    Ok(Json(LoginResponse {
        token,
        user_id: user.id,
        username: user.username,
    }))
}

pub async fn me(
    auth_user: AuthUser,
) -> AppResult<Json<MeResponse>> {
    let issued_at = Utc
        .timestamp_opt(auth_user.claims.iat, 0)
        .single()
        .unwrap_or_else(Utc::now);

    Ok(Json(MeResponse {
        user_id: auth_user.user_id,
        username: auth_user.username,
        issued_at,
    }))
}

