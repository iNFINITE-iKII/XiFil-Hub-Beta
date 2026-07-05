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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLicenseKeySchema = createInsertSchema(licenseKeysTable).omit({ id: true, createdAt: true });
export type InsertLicenseKey = z.infer<typeof insertLicenseKeySchema>;
export type LicenseKey = typeof licenseKeysTable.$inferSelect;
