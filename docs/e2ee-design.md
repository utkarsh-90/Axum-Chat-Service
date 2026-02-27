# Axum Chat Service – E2EE Design (Phase 2)

This document sketches a future end-to-end encryption (E2EE) model so that the server only sees ciphertext for message contents.

## Goals

- Message bodies are encrypted on the client and decrypted only on clients.
- The server (and Postgres) store ciphertext plus minimal metadata (room_id, user_id, timestamps).
- Existing auth and room membership model stay server-side and unchanged.

## Keys

- Each user has a long-term asymmetric key pair:
  - Algorithm: X25519 (for key agreement) or Ed25519 + X25519.
  - Stored client-side; private key encrypted with a key derived from the user’s password.
- Each room has a symmetric key:
  - Algorithm: AES-256-GCM or XChaCha20-Poly1305.
  - Stored only on clients, never in plaintext on the server.

## Key distribution

- When a user creates a room:
  - Client generates a random room key.
  - Client stores the room key locally.
- When another user joins:
  - Existing member encrypts the room key with the new member’s public key:
    - `encrypted_room_key = Encrypt(new_member_public_key, room_key)`.
  - The encrypted room key is sent via the server to the joining client and stored as a small record (e.g. `room_id`, `recipient_user_id`, `encrypted_room_key`).
- Joining client:
  - Decrypts `encrypted_room_key` with their private key.
  - Caches the room key locally.

## Message encryption

- Sending:
  - Client looks up room key.
  - Generates a random nonce.
  - Computes `ciphertext = AEAD_Encrypt(room_key, nonce, plaintext_message, associated_data)`, where associated_data includes `room_id`, `user_id`, `timestamp`.
  - Sends to server: `{ room_id, user_id, nonce, ciphertext, created_at }`.
- Receiving:
  - Client fetches or receives over WebSocket `{ room_id, user_id, nonce, ciphertext, created_at }`.
  - Uses the stored room key to decrypt.

## Database changes

- Replace `messages.content TEXT` with:
  - `content_ciphertext BYTEA NOT NULL`
  - `nonce BYTEA NOT NULL`
- Optionally add a new table for encrypted room keys:

```sql
CREATE TABLE room_encrypted_keys (
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_key BYTEA NOT NULL,
    PRIMARY KEY (room_id, user_id)
);
```

## Backwards compatibility

- Introduce new columns (`content_ciphertext`, `nonce`) alongside `content`.
- For a migration period:
  - New E2EE-enabled clients write both plaintext and ciphertext.
  - Old clients read plaintext; new clients prefer ciphertext.
- Once all clients are migrated, drop the plaintext `content` column.

## Server responsibilities

- Continue to:
  - Authenticate users with JWT.
  - Enforce room membership and authorization.
  - Route WebSocket messages and persist message metadata.
- Never attempt to decrypt ciphertext; treat message bodies as opaque blobs.

