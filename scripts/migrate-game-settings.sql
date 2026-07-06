-- Migration: add loader_name and features columns to games table
-- Run this against your Neon database before deploying

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS loader_name TEXT,
  ADD COLUMN IF NOT EXISTS features    JSONB;
