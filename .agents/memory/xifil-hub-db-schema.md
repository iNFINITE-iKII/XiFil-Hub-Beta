---
name: XiFil Hub DB Schema
description: Database tables and Neon/Replit DB setup decision for XiFil Hub
---

## Tables
- users: id, discord_id (unique), username, avatar, is_admin, created_at
- games: id, slug (unique), name, description, image_url, status, created_at
- license_keys: id, key (unique), game_id, user_id, hwid, status, expires_at, created_at
- user_sessions: managed by connect-pg-simple (createTableIfMissing: true)

## DB Decision
User requested Neon but DATABASE_URL is Replit-runtime-managed (points to built-in Postgres in dev).
**Why:** Simpler — dev works immediately, prod can be pointed at Neon by setting DATABASE_URL in deployment env.
**How to apply:** If user wants Neon in prod, set DATABASE_URL = Neon connection string in deployment settings (not in dev secrets).

## License key format
XIFIL-{4 hex segments} e.g. XIFIL-A1B2C3D4-E5F6G7H8-...
HWID binding: first use binds HWID, subsequent uses must match; status: active/expired/revoked
