use std::time::{Duration, SystemTime, UNIX_EPOCH};

use chrono::Utc;
use jsonwebtoken::{encode, decode, EncodingKey, DecodingKey, Header, Validation};
use uuid::Uuid;

use crate::{
    error::AppError,
    models::auth::Claims,
    state::AppState,
};

pub fn generate_token(
    state: &AppState,
    user_id: Uuid,
    username: &str,
) -> Result<String, AppError> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| AppError::Internal(e.into()))?;
    let iat = now.as_secs() as i64;
    let exp = (now + Duration::from_secs((state.jwt_exp_hours * 3600) as u64)).as_secs() as i64;

    let claims = Claims {
        sub: user_id,
        username: username.to_string(),
        exp,
        iat,
        iss: (*state.jwt_issuer).clone(),
    };

    let key = EncodingKey::from_secret(state.jwt_secret.as_bytes());
    let token = encode(&Header::default(), &claims, &key)?;
    Ok(token)
}

pub fn validate_token(state: &AppState, token: &str) -> Result<Claims, AppError> {
    let key = DecodingKey::from_secret(state.jwt_secret.as_bytes());
    let mut validation = Validation::default();
    validation.validate_exp = true;
    validation.set_issuer(&[&state.jwt_issuer]);

    let token_data = decode::<Claims>(token, &key, &validation)?;
    let claims = token_data.claims;

    // Basic sanity check on exp
    let now = Utc::now().timestamp();
    if claims.exp < now {
        return Err(AppError::Unauthorized("token expired".into()));
    }

    Ok(claims)
}

