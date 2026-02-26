use axum::http::HeaderValue;
use axum::Router;
use tower_http::cors::{AllowOrigin, CorsLayer};

use crate::{
    routes::{auth::auth_routes, rooms::room_routes, websocket::websocket_routes},
    state::AppState,
};

pub mod auth;
pub mod rooms;
pub mod websocket;

pub fn create_router(state: AppState) -> Router {
    // CORS: allow frontend dev server (Vite default port).
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::list([
            HeaderValue::try_from("http://localhost:5173").unwrap(),
            HeaderValue::try_from("http://127.0.0.1:5173").unwrap(),
        ]))
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::OPTIONS,
        ])
        .allow_headers([axum::http::header::AUTHORIZATION, axum::http::header::CONTENT_TYPE]);

    let api = Router::new()
        .nest("/auth", auth_routes())
        .nest("/rooms", room_routes());

    let ws = websocket_routes();

    Router::new()
        .nest("/api", api)
        .nest("/ws", ws)
        .layer(cors)
        .with_state(state)
}

