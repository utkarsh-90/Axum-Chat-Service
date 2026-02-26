use axum::{extract::FromRequestParts, http::request::Parts};
use uuid::Uuid;

use crate::{
    auth::jwt::validate_token,
    error::AppError,
    models::auth::Claims,
    state::AppState,
};

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub username: String,
    pub claims: Claims,
}

impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync + AsRef<AppState>,
{
    type Rejection = AppError;

    fn from_request_parts(
        parts: &mut Parts,
        state: &S,
    ) -> impl std::future::Future<Output = Result<Self, Self::Rejection>> + Send {
        let app_state: AppState = state.as_ref().clone();

        let auth_header = parts
            .headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|h| h.to_str().ok())
            .map(|s| s.to_owned());

        async move {
            let auth_header = auth_header
                .ok_or_else(|| AppError::Unauthorized("missing Authorization header".into()))?;

            let token = auth_header
                .strip_prefix("Bearer ")
                .ok_or_else(|| AppError::Unauthorized("invalid Authorization header".into()))?;

            let claims = validate_token(&app_state, token)?;

            Ok(AuthUser {
                user_id: claims.sub,
                username: claims.username.clone(),
                claims,
            })
        }
    }
}

