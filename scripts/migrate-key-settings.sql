-- Migration: add per-key override columns to license_keys
-- Run this against your Neon database once.

ALTER TABLE license_keys
  ADD COLUMN IF NOT EXISTS key_max_auto_claim_keys   INTEGER,
  ADD COLUMN IF NOT EXISTS key_max_hwid_per_key      INTEGER,
  ADD COLUMN IF NOT EXISTS key_max_roblox_per_key    INTEGER,
  ADD COLUMN IF NOT EXISTS key_hwid_reset_limit      INTEGER,
  ADD COLUMN IF NOT EXISTS key_hwid_reset_cooldown_hours INTEGER;
