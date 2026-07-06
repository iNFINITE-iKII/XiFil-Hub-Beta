---
name: XiFil Hub Fase 1 & 2 features
description: Summary of all implemented routes and pages across Fase 1 and Fase 2.
---

## Fase 1 Routes (API)
- `GET /api/auth/me` — returns user + `isWhitelisted` (added Fase 2)
- `POST /api/auth/discord`, `GET /api/auth/discord/callback` — OAuth
- `POST /api/auth/logout`
- `POST /api/auth/roblox` — **admin-only** (restricted in Fase 2); verifies via Roblox API
- `GET /api/admin/users`, `GET /api/admin/users/:id`, `POST /api/admin/users/:id/reset-roblox`
- `GET /api/admin/keys`, `POST /api/admin/keys/revoke/:id`, `GET /api/admin/stats`
- `GET /api/admin/settings`, `PUT /api/admin/settings` — includes maxAutoClaimKeys/maxHwidPerKey/maxRobloxPerKey (Fase 2)
- `POST /api/admin/users/:id/set-roblox` (Fase 2)
- `GET/POST /api/admin/whitelist`, `DELETE /api/admin/whitelist/:id` (Fase 2)
- `GET /api/games`, `POST /api/games`, `PUT /api/games/:id`, `DELETE /api/games/:id`
- `GET /api/keys/my`, `POST /api/keys/claim`, `POST /api/keys/my-hwid-reset`
- `POST /api/keys/whitelist-redeem` (Fase 2) — atomic via DB transaction + FOR UPDATE
- `POST /api/keys/generate`, `POST /api/keys/bulk-generate`, `GET /api/keys/export`
- `POST /api/keys/:id/reset-hwid` — admin; supports `clearRoblox` body param
- `POST /api/drm/validate` — public; atomic HWID bind + first-link Roblox auto-link
- `GET /api/loader/:slug` — returns Lua loadstring

## Fase 2 Pages (Frontend)
- `profile.tsx` — Roblox read-only display (no edit form); avatar from roblox.com; admin contact note
- `admin.tsx` — search for users + keys; Whitelist tab (CRUD); new settings cards (whitelist policy, per-key limits); set-roblox in user detail modal
- `keys.tsx` — "Redeem" button shown only when `user.isWhitelisted === true`

## Key rules
- Roblox linking: auto via DRM on first valid request; admin can override via set-roblox; users cannot self-link
- Whitelist redeem quota enforcement is atomic (DB transaction + FOR UPDATE aggregate) — prevents race-condition over-claim
- `maxAutoClaimKeys = 0` means redeem disabled; frontend correctly preserves 0 via `Number.isNaN()` guard (not `|| 1`)

## Per-key settings (added later)
- `license_keys` table has 5 nullable override columns: `key_max_auto_claim_keys`, `key_max_hwid_per_key`, `key_max_roblox_per_key`, `key_hwid_reset_limit`, `key_hwid_reset_cooldown_hours`
- Migration SQL in `scripts/migrate-key-settings.sql` — must be run manually against Neon
- `PATCH /api/keys/:id/settings` — admin can set overrides per key; null = inherit global
- `GET /api/admin/keys` returns all 5 override fields so the frontend dialog can prefill correctly
- `my-hwid-reset` uses per-key limit/cooldown with fallback to global settings
- whitelist-redeem transaction uses highest per-key maxAutoClaimKeys across user's existing keys (or global)
- `GET /api/admin/users/search?q=` — searches logged-in users by username/discordId (ilike), returns up to 10; used by whitelist add combobox
- Whitelist add UI: search-as-you-type combobox (debounced 300ms); raw Discord ID still works if no match
