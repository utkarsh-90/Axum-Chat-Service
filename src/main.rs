use axum::Router;
use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use tokio::net::TcpListener;
use tracing_subscriber::EnvFilter;

mod config;
mod auth;
mod db;
mod error;
mod handlers;
mod models;
mod routes;
mod state;
mod websocket;

use crate::config::Config;
use crate::routes::create_router;
use crate::state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();
    init_tracing()?;

    let config = Config::from_env();

    let pool = PgPoolOptions::new()
        .max_connections(config.database_max_connections)
        .connect(&config.database_url)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    let app_state = AppState::new(
        pool,
        config.jwt_secret,
        config.jwt_issuer,
        config.jwt_exp_hours,
    );

    let allowed_origins: Vec<String> = std::env::var("ALLOWED_ORIGINS")
        .ok()
        .map(|s| s.split(',').map(|o| o.trim().to_string()).filter(|o| !o.is_empty()).collect())
        .unwrap_or_default();

    let app: Router = create_router(app_state, allowed_origins);

    tracing::info!("listening on {}", config.server_addr);
    let listener = TcpListener::bind(config.server_addr).await?;

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

