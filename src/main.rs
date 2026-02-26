use std::{env, net::SocketAddr};

use axum::Router;
use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use tokio::net::TcpListener;
use tracing_subscriber::EnvFilter;

mod auth;
mod db;
mod error;
mod handlers;
mod models;
mod routes;
mod state;
mod websocket;

use crate::routes::create_router;
use crate::state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();

    init_tracing()?;

    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set (e.g. in .env or environment)");
    let max_connections: u32 = env::var("DATABASE_MAX_CONNECTIONS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(10);

    let pool = PgPoolOptions::new()
        .max_connections(max_connections)
        .connect(&database_url)
        .await?;

    // Run migrations on startup to ensure schema is up-to-date.
    sqlx::migrate!("./migrations").run(&pool).await?;

    let jwt_secret =
        env::var("JWT_SECRET").expect("JWT_SECRET must be set for signing authentication tokens");
    let jwt_issuer = env::var("JWT_ISSUER").unwrap_or_else(|_| "axum-chat-service".to_string());
    let jwt_exp_hours: i64 = env::var("JWT_EXP_HOURS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(24);

    let app_state = AppState::new(pool, jwt_secret, jwt_issuer, jwt_exp_hours);

    let app: Router = create_router(app_state);

    let host = env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port: u16 = env::var("SERVER_PORT")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(8080);

    let addr: SocketAddr = format!("{host}:{port}")
        .parse()
        .expect("invalid host/port combination");

    tracing::info!("listening on {addr}");
    let listener = TcpListener::bind(addr).await?;

    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}

fn init_tracing() -> anyhow::Result<()> {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,axum_chat_service=debug"));

    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .init();
    Ok(())
}

