import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Tracks each Roblox account that has been linked (via DRM validation) to a
// license key. A single key may have multiple linked accounts, up to its
// effective slot limit (keyMaxRobloxPerKey override, or admin_settings.maxRobloxPerKey).
export const linkedRobloxAccountsTable = pgTable(
  "linked_roblox_accounts",
  {
    id: serial("id").primaryKey(),
    licenseKeyId: integer("license_key_id").notNull(),
    robloxUsername: text("roblox_username").notNull(),
    robloxId: text("roblox_id"),
    linkedAt: timestamp("linked_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.licenseKeyId, table.robloxUsername)]
);

export const insertLinkedRobloxAccountSchema = createInsertSchema(linkedRobloxAccountsTable).omit({
  id: true,
  linkedAt: true,
  lastSeenAt: true,
});
export type InsertLinkedRobloxAccount = z.infer<typeof insertLinkedRobloxAccountSchema>;
export type LinkedRobloxAccount = typeof linkedRobloxAccountsTable.$inferSelect;
