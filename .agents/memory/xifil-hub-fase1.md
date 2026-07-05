---
name: XiFil Hub Fase 1 Features
description: Summary of Fase 1 features implemented — DB changes, API routes, frontend pages.
---

## DB Changes (applied via raw SQL to Neon)
- `users`: added `roblox_username`, `roblox_id`
- `license_keys`: added `hwid_reset_count` (default 0), `hwid_last_reset_at`
- New table: `admin_settings` (singleton row id=1) — `default_duration_days`, `default_game_id`, `hwid_reset_limit`, `hwid_reset_cooldown_hours`, `key_prefix`

## API Routes Added
- `POST /api/keys/claim` — user claims unassigned key by key string
- `POST /api/keys/my-hwid-reset` — user self-resets HWID (enforces limit + cooldown from admin_settings)
- `POST /api/keys/bulk-generate` — admin generates 1–500 keys at once
- `GET /api/keys/export` — admin downloads all keys as CSV
- `POST /api/keys/:id/reset-hwid` — admin force-resets HWID (no limit/cooldown)
- `GET /api/admin/settings` — get admin_settings singleton
- `PUT /api/admin/settings` — update admin_settings
- `POST /api/auth/roblox` — link Roblox username (verified via Roblox API) to current user

## Frontend Pages Added/Updated
- `keys.tsx` — claim key modal, HWID reset button with cooldown display
- `admin.tsx` — bulk generate modal, Export CSV button, HWID reset per key, Settings tab
- `dashboard.tsx` — expiry warning banner (≤3 days), Roblox account status card
- `profile.tsx` — NEW: Roblox account link/update page
- `layout.tsx` — Profile nav link added to sidebar

**Why:** drizzle-kit push prompts interactively when new tables exist; always use raw SQL node script for CI/non-TTY migrations.
