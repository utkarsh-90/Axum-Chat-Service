use axum::{
    extract::State,
    http::HeaderValue,
    routing::get,
    Router,
};
use tower_http::cors::{AllowOrigin, CorsLayer};

use crate::{
    routes::{auth::auth_routes, rooms::room_routes, websocket::websocket_routes},
    state::AppState,
};

pub mod auth;
pub mod rooms;
pub mod websocket;

/// Build CORS layer. If `allowed_origins` is non-empty (e.g. from ALLOWED_ORIGINS env),
/// only those origins are allowed; otherwise localhost/127.0.0.1 are allowed for dev.
fn cors_layer(allowed_origins: &[String]) -> CorsLayer {
    let allow_origin: AllowOrigin = if allowed_origins.is_empty() {
        AllowOrigin::predicate(|origin: &HeaderValue, _| {
            let s = origin.to_str().unwrap_or("");
            s.starts_with("http://localhost:") || s.starts_with("http://127.0.0.1:")
        })
    } else {
        let origins: Vec<HeaderValue> = allowed_origins
            .iter()
            .filter_map(|s| HeaderValue::try_from(s.as_str()).ok())
            .collect();
        AllowOrigin::list(origins)
    };

    CorsLayer::new()
        .allow_origin(allow_origin)
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::OPTIONS,
        ])
        .allow_headers([axum::http::header::AUTHORIZATION, axum::http::header::CONTENT_TYPE])
}

pub fn create_router(state: AppState, allowed_origins: Vec<String>) -> Router {
    let cors = cors_layer(&allowed_origins);

    let api = Router::new()
        .nest("/auth", auth_routes())
        .nest("/rooms", room_routes())
        .route("/health", get(health_handler))
        .route("/health/ready", get(ready_handler));

    let ws = websocket_routes();

    Router::new()
        .route("/", get(root_handler))
        .nest("/api", api)
        .nest("/ws", ws)
        .layer(cors)
        .with_state(state)
}

async fn root_handler() -> &'static str {
    "Axum Chat API. Use the app at http://localhost:5173 — health: GET /api/health"
}

async fn health_handler() -> &'static str {
    "ok"
}

/// Readiness probe: returns 200 only if DB is reachable (for load balancers / k8s).
async fn ready_handler(State(state): State<AppState>) -> (axum::http::StatusCode, &'static str) {
    if sqlx::query("SELECT 1").fetch_one(&state.db).await.is_ok() {
        (axum::http::StatusCode::OK, "ok")
    } else {
        (
            axum::http::StatusCode::SERVICE_UNAVAILABLE,
            "database unreachable",
        )
    }
}

