use axum::{
    routing::get,
    Router,
};

use crate::{state::AppState, websocket::room::room_ws_handler};

pub fn websocket_routes() -> Router<AppState> {
    Router::new().route("/rooms/{room_id}", get(room_ws_handler))
}

