use axum::{
    routing::post,
    Router,
};

use crate::state::AppState;

use crate::handlers::auth_handlers::{login, me, register};

pub fn auth_routes() -> Router<AppState> {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/me", post(me))
}

