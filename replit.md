# XiFil Hub

Full-stack monorepo: Express API + React frontend (Vite + Tailwind + Shadcn UI) + PostgreSQL via Neon.

## Stack
- **Monorepo:** pnpm workspaces
- **Backend:** Node.js 22+, Express 5, TypeScript
- **Frontend:** React, Vite, Tailwind CSS, Shadcn UI
- **Database:** Neon PostgreSQL + Drizzle ORM
- **Auth:** Discord OAuth (session-based)

## Deployment: Railway + Neon

The project is configured to deploy on Railway via `railway.toml`.

### Railway Environment Variables
Set these in the Railway dashboard under your service → Variables:

| Variable | Required | Notes |
|---|---|---|
| `NEON_DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | Long random string for session signing |
| `DISCORD_CLIENT_ID` | ✅ | From Discord Developer Portal |
| `DISCORD_CLIENT_SECRET` | ✅ | From Discord Developer Portal |
| `NODE_ENV` | ✅ | Set to `production` |
| `APP_URL` | Optional | Your Railway public URL (fallback to `RAILWAY_PUBLIC_DOMAIN`) |
| `LOG_LEVEL` | Optional | Defaults to `info` |
| `PORT` | Auto | Set automatically by Railway — do not override |

### Discord OAuth Setup
In the [Discord Developer Portal](https://discord.com/developers/applications), add this redirect URI:
```
https://<your-railway-domain>/api/auth/discord/callback
```

### Database Migrations
Run migrations with raw SQL (drizzle-kit push requires TTY — not suitable for CI):
```bash
node -e "require('./scripts/migrate.js')"
```
Or apply schema changes manually via Neon console.

## Development (local)
```bash
pnpm install
# Copy .env.example to .env and fill in values
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/xifil-hub run dev
```

## Build
```bash
pnpm run build
```

## Implemented Features (Fase 1)
- Discord OAuth login
- License key management (claim, HWID reset with cooldown, bulk generate, CSV export)
- Roblox account linking (verified via Roblox API)
- Admin panel (key management, settings, HWID force-reset)
- Admin settings singleton (default duration, game ID, HWID reset limit/cooldown, key prefix)

## User Preferences
