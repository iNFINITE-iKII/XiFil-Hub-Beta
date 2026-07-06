import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const licenseKeysTable = pgTable("license_keys", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  gameId: integer("game_id").notNull(),
  userId: integer("user_id"),
  hwid: text("hwid"),
  status: text("status").notNull().default("active"),
  expiresAt: timestamp("expires_at"),
  hwidResetCount: integer("hwid_reset_count").notNull().default(0),
  hwidLastResetAt: timestamp("hwid_last_reset_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Per-key overrides — null = inherit from global admin_settings
  keyMaxAutoClaimKeys: integer("key_max_auto_claim_keys"),
  keyMaxHwidPerKey: integer("key_max_hwid_per_key"),
  keyMaxRobloxPerKey: integer("key_max_roblox_per_key"),
  keyHwidResetLimit: integer("key_hwid_reset_limit"),
  keyHwidResetCooldownHours: integer("key_hwid_reset_cooldown_hours"),
});

export const insertLicenseKeySchema = createInsertSchema(licenseKeysTable).omit({ id: true, createdAt: true });
export type InsertLicenseKey = z.infer<typeof insertLicenseKeySchema>;
export type LicenseKey = typeof licenseKeysTable.$inferSelect;
