import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const whitelistTable = pgTable("whitelist", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull().unique(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Whitelist = typeof whitelistTable.$inferSelect;
