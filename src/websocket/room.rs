use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, Query, State,
    },
    response::IntoResponse,
};
use chrono::Utc;
use serde::Deserialize;
use tokio::sync::broadcast;
use uuid::Uuid;

use crate::{
    auth::{extractor::AuthUser, jwt::validate_token},
    db::{
        messages::{create_message, list_recent_messages_with_usernames},
        rooms::get_room_if_member,
    },
    error::AppError,
    models::message::{
        IncomingWsMessage, OutgoingWsMessage, WsMessageKind, MAX_MESSAGE_LEN,
    },
    state::AppState,
};

/// Query params for WebSocket connect (browsers cannot set Authorization header on WS).
#[derive(Debug, Deserialize)]
pub struct WsConnectQuery {
    pub token: Option<String>,
}

pub async fn room_ws_handler(
    ws: WebSocketUpgrade,
    Path(room_id): Path<Uuid>,
    State(state): State<AppState>,
    Query(q): Query<WsConnectQuery>,
) -> Result<impl IntoResponse, AppError> {
    let token = q
        .token
        .as_deref()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::Unauthorized("missing token (use ?token=JWT)".into()))?;
    let claims = validate_token(&state, token)?;
    let auth = AuthUser {
        user_id: claims.sub,
        username: claims.username.clone(),
        claims,
    };
    Ok(ws.on_upgrade(move |socket| handle_socket(socket, state, room_id, auth)))
}

async fn handle_socket(
    mut socket: WebSocket,
    state: AppState,
    room_id: Uuid,
    auth: AuthUser,
) {
    // Ensure room exists and user is a member.
    if let Err(e) = ensure_room_exists(&state, room_id).await {
        tracing::warn!("refusing WS connection for missing room: {e}");
        let _ = socket.send(Message::Close(None)).await;
        return;
    }
    if get_room_if_member(&state.db, room_id, auth.user_id)
        .await
        .ok()
        .flatten()
        .is_none()
    {
        tracing::warn!("refusing WS connection: user {} not a member of room {}", auth.user_id, room_id);
        let _ = socket.send(Message::Close(None)).await;
        return;
    }

    // Get or create broadcast channel for this room.
    let tx = {
        let mut rooms = state.rooms.write().await;
        rooms
            .entry(room_id)
            .or_insert_with(|| {
                let (tx, _rx) = broadcast::channel(100);
                tx
            })
            .clone()
    };
    let mut rx = tx.subscribe();

    // Send last 50 messages as history (with usernames).
    if let Err(err) = send_recent_history(&state, room_id, &mut socket).await {
        tracing::warn!("failed to send history to ws client: {err}");
    }

    // Broadcast "user joined" system message.
    let _ = tx.send(OutgoingWsMessage {
        id: Uuid::nil(),
        room_id,
        user_id: Uuid::nil(),
        username: auth.username.clone(),
        content: "joined the room".to_string(),
        created_at: Utc::now(),
        kind: WsMessageKind::System,
    });

    let username_on_leave = auth.username.clone();

    loop {
        tokio::select! {
            maybe_msg = socket.recv() => {
                match maybe_msg {
                    Some(Ok(msg)) => {
                        if let Err(e) = handle_incoming_message(&state, room_id, &auth, msg, &tx).await {
                            tracing::warn!("error handling incoming ws message: {e}");
                        }
                    }
                    Some(Err(err)) => {
                        tracing::warn!("websocket receive error: {err}");
                        send_leave_system_message(&tx, room_id, &username_on_leave);
                        break;
                    }
                    None => {
                        send_leave_system_message(&tx, room_id, &username_on_leave);
                        break;
                    }
                }
            }
            broadcast_msg = rx.recv() => {
                match broadcast_msg {
                    Ok(outgoing) => {
                        let json: String = match serde_json::to_string(&outgoing) {
                            Ok(j) => j,
                            Err(err) => {
                                tracing::error!("failed to serialize outgoing ws message: {err}");
                                continue;
                            }
                        };
                        if socket.send(Message::Text(json.into())).await.is_err() {
                            send_leave_system_message(&tx, room_id, &username_on_leave);
                            break;
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(skipped)) => {
                        tracing::warn!("websocket client lagged; skipped {skipped} messages");
                        continue;
                    }
                    Err(broadcast::error::RecvError::Closed) => {
                        send_leave_system_message(&tx, room_id, &username_on_leave);
                        break;
                    }
                }
            }
        }
    }
}

async fn ensure_room_exists(state: &AppState, room_id: Uuid) -> Result<(), AppError> {
    let room = sqlx::query_scalar::<_, Uuid>(
        r#"SELECT id FROM rooms WHERE id = $1"#,
    )
    .bind(room_id)
    .fetch_optional(&state.db)
    .await?;

    if room.is_none() {
        return Err(AppError::NotFound("room not found".into()));
    }

    Ok(())
}

fn send_leave_system_message(
    tx: &broadcast::Sender<OutgoingWsMessage>,
    room_id: Uuid,
    username: &str,
) {
    let _ = tx.send(OutgoingWsMessage {
        id: Uuid::nil(),
        room_id,
        user_id: Uuid::nil(),
        username: username.to_string(),
        content: "left the room".to_string(),
        created_at: Utc::now(),
        kind: WsMessageKind::System,
    });
}

async fn send_recent_history(
    state: &AppState,
    room_id: Uuid,
    socket: &mut WebSocket,
) -> Result<(), AppError> {
    let messages = list_recent_messages_with_usernames(&state.db, room_id, 50).await?;

    for m in messages.into_iter().rev() {
        let outgoing = OutgoingWsMessage {
            id: m.id,
            room_id: m.room_id,
            user_id: m.user_id,
            username: m.username,
            content: m.content,
            created_at: m.created_at,
            kind: WsMessageKind::History,
        };
        let json: String = serde_json::to_string(&outgoing)
            .map_err(|e| AppError::Internal(e.into()))?;
        socket.send(Message::Text(json.into())).await.ok();
    }

    Ok(())
}

async fn handle_incoming_message(
    state: &AppState,
    room_id: Uuid,
    auth: &AuthUser,
    msg: Message,
    tx: &broadcast::Sender<OutgoingWsMessage>,
) -> Result<(), AppError> {
    let content = match msg {
        Message::Text(text) => {
            let text = text.to_string();
            // Try to parse as JSON payload first, fall back to raw text.
            if let Ok(parsed) = serde_json::from_str::<IncomingWsMessage>(&text) {
                parsed.content
            } else {
                text
            }
        }
        Message::Binary(_) => {
            // For simplicity, ignore binary frames.
            return Ok(());
        }
        Message::Close(_) => {
            return Ok(());
        }
        Message::Ping(_) | Message::Pong(_) => {
            return Ok(());
        }
    };

    if content.trim().is_empty() {
        return Ok(());
    }
    if content.len() > MAX_MESSAGE_LEN {
        return Ok(());
    }

    // Enforce that the sender is a member of the room.
    let is_member = get_room_if_member(&state.db, room_id, auth.user_id)
        .await?
        .is_some();
    if !is_member {
        return Err(AppError::Forbidden("not a member of this room".into()));
    }

    let message = create_message(&state.db, room_id, auth.user_id, &content).await?;

    let outgoing = OutgoingWsMessage {
        id: message.id,
        room_id: message.room_id,
        user_id: message.user_id,
        username: auth.username.clone(),
        content: message.content,
        created_at: message.created_at,
        kind: WsMessageKind::Message,
    };

    let _ = tx.send(outgoing);

    Ok(())
}

