import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const adminSettingsTable = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  defaultDurationDays: integer("default_duration_days"),
  defaultGameId: integer("default_game_id"),
  hwidResetLimit: integer("hwid_reset_limit").notNull().default(1),
  hwidResetCooldownHours: integer("hwid_reset_cooldown_hours").notNull().default(168),
  robloxResetLimit: integer("roblox_reset_limit").notNull().default(1),
  robloxResetCooldownHours: integer("roblox_reset_cooldown_hours").notNull().default(168),
  keyPrefix: text("key_prefix").notNull().default("XIFIL"),
  // Whitelist auto-claim
  maxAutoClaimKeys: integer("max_auto_claim_keys").notNull().default(1),
  // Per-key limits
  maxHwidPerKey: integer("max_hwid_per_key").notNull().default(1),
  maxRobloxPerKey: integer("max_roblox_per_key").notNull().default(1),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AdminSettings = typeof adminSettingsTable.$inferSelect;
