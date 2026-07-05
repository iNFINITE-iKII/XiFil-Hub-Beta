import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const adminSettingsTable = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  defaultDurationDays: integer("default_duration_days"),
  defaultGameId: integer("default_game_id"),
  hwidResetLimit: integer("hwid_reset_limit").notNull().default(1),
  hwidResetCooldownHours: integer("hwid_reset_cooldown_hours").notNull().default(168),
  keyPrefix: text("key_prefix").notNull().default("XIFIL"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AdminSettings = typeof adminSettingsTable.$inferSelect;
