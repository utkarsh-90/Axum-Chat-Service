use axum::{
    routing::{get, post},
    Router,
};

use crate::{
    handlers::room_handlers::{
        create_room_handler, join_room_handler, list_room_messages_handler,
        list_rooms_handler,
    },
    state::AppState,
};

pub fn room_routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_rooms_handler).post(create_room_handler))
        .route("/{room_id}/join", post(join_room_handler))
        .route("/{room_id}/messages", get(list_room_messages_handler))
}

