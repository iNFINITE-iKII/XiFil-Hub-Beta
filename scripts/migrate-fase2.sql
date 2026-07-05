-- ============================================================
-- Fase 2 Migration — jalankan di Neon SQL console
-- ============================================================

-- 1. Whitelist table
CREATE TABLE IF NOT EXISTS whitelist (
  id          SERIAL PRIMARY KEY,
  discord_id  TEXT NOT NULL UNIQUE,
  notes       TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. New columns di admin_settings
ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS max_auto_claim_keys INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_hwid_per_key    INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_roblox_per_key  INTEGER NOT NULL DEFAULT 1;
