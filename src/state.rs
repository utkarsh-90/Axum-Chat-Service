use std::{collections::HashMap, sync::Arc};

use sqlx::PgPool;
use tokio::sync::{broadcast, RwLock};
use uuid::Uuid;

use crate::models::message::OutgoingWsMessage;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub rooms: Arc<RwLock<HashMap<Uuid, broadcast::Sender<OutgoingWsMessage>>>>,
    pub jwt_secret: Arc<String>,
    pub jwt_issuer: Arc<String>,
    pub jwt_exp_hours: i64,
}

impl AppState {
    pub fn new(db: PgPool, jwt_secret: String, jwt_issuer: String, jwt_exp_hours: i64) -> Self {
        Self {
            db,
            rooms: Arc::new(RwLock::new(HashMap::new())),
            jwt_secret: Arc::new(jwt_secret),
            jwt_issuer: Arc::new(jwt_issuer),
            jwt_exp_hours,
        }
    }
}

impl AsRef<AppState> for AppState {
    fn as_ref(&self) -> &AppState {
        self
    }
}

