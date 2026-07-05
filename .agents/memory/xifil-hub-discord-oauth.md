---
name: XiFil Hub Discord OAuth
description: Discord OAuth2 flow details and security pattern for XiFil Hub
---

## Pattern
- GET /api/auth/discord — generates crypto.randomUUID() state, stores in session.oauthState, redirects to Discord
- GET /api/auth/discord/callback — validates req.query.state === session.oauthState before proceeding; clears oauthState after use
- Uses express-session + connect-pg-simple (table: user_sessions, createTableIfMissing: true)
- SESSION_SECRET required env var; DISCORD_CLIENT_ID + DISCORD_CLIENT_SECRET as secrets

**Why:** Missing state param = login CSRF — attacker can trick user into authenticating as attacker's account.

**How to apply:** Any new OAuth provider must follow the same generate-state → store-in-session → validate-on-callback pattern.
