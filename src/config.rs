//! Centralized configuration from environment.
//! Validates required vars at startup and provides typed access.

use std::net::SocketAddr;

/// Application configuration loaded from environment.
#[derive(Clone)]
pub struct Config {
    pub database_url: String,
    pub database_max_connections: u32,
    pub jwt_secret: String,
    pub jwt_issuer: String,
    pub jwt_exp_hours: i64,
    pub server_addr: SocketAddr,
}

impl Config {
    /// Load config from environment. Panics on missing required vars.
    pub fn from_env() -> Self {
        let database_url = std::env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set (e.g. in .env or environment)");
        let database_max_connections = std::env::var("DATABASE_MAX_CONNECTIONS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(10);
        let jwt_secret = std::env::var("JWT_SECRET")
            .expect("JWT_SECRET must be set for signing authentication tokens");
        let jwt_issuer = std::env::var("JWT_ISSUER").unwrap_or_else(|_| "axum-chat-service".to_string());
        let jwt_exp_hours = std::env::var("JWT_EXP_HOURS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(24);
        let host = std::env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
        let port: u16 = std::env::var("PORT")
            .ok()
            .or_else(|| std::env::var("SERVER_PORT").ok())
            .and_then(|v| v.parse().ok())
            .unwrap_or(8080);
        let server_addr = format!("{host}:{port}")
            .parse()
            .expect("invalid SERVER_HOST/SERVER_PORT combination");

        Self {
            database_url,
            database_max_connections,
            jwt_secret,
            jwt_issuer,
            jwt_exp_hours,
            server_addr,
        }
    }
}
