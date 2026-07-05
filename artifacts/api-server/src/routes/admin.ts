import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, gamesTable, licenseKeysTable, adminSettingsTable } from "@workspace/db";
import { eq, count, gte } from "drizzle-orm";

const router = Router();

async function requireAdmin(req: any, res: any, next: any) {
  const userId = (req.session as any)?.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user?.isAdmin) return res.status(403).json({ error: "Forbidden" });
  next();
}

async function getOrCreateSettings() {
  const [settings] = await db.select().from(adminSettingsTable);
  if (!settings) {
    const [created] = await db.insert(adminSettingsTable).values({}).returning();
    return created;
  }
  return settings;
}

// GET /api/admin/stats
router.get("/stats", requireAdmin, async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [[{ total: totalUsers }], [{ total: totalKeys }], [{ total: activeKeys }], [{ total: totalGames }], [{ total: recentUsers }]] =
    await Promise.all([
      db.select({ total: count() }).from(usersTable),
      db.select({ total: count() }).from(licenseKeysTable),
      db.select({ total: count() }).from(licenseKeysTable).where(eq(licenseKeysTable.status, "active")),
      db.select({ total: count() }).from(gamesTable),
      db.select({ total: count() }).from(usersTable).where(gte(usersTable.createdAt, thirtyDaysAgo)),
    ]);

  res.json({
    totalUsers: Number(totalUsers),
    totalKeys: Number(totalKeys),
    activeKeys: Number(activeKeys),
    totalGames: Number(totalGames),
    recentUsers: Number(recentUsers),
  });
});

// GET /api/admin/users
router.get("/users", requireAdmin, async (req, res) => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(
    users.map((u) => ({
      id: u.id,
      discordId: u.discordId,
      username: u.username,
      avatar: u.avatar,
      isAdmin: u.isAdmin,
      robloxUsername: u.robloxUsername,
      robloxId: u.robloxId,
      createdAt: u.createdAt.toISOString(),
    }))
  );
});

// GET /api/admin/keys
router.get("/keys", requireAdmin, async (req, res) => {
  const rows = await db
    .select({ key: licenseKeysTable, game: gamesTable, user: usersTable })
    .from(licenseKeysTable)
    .leftJoin(gamesTable, eq(licenseKeysTable.gameId, gamesTable.id))
    .leftJoin(usersTable, eq(licenseKeysTable.userId, usersTable.id))
    .orderBy(licenseKeysTable.createdAt);

  res.json(
    rows.map((r) => ({
      id: r.key.id,
      key: r.key.key,
      gameId: r.key.gameId,
      gameName: r.game?.name ?? null,
      userId: r.key.userId,
      username: r.user?.username ?? null,
      hwid: r.key.hwid,
      status: r.key.status,
      expiresAt: r.key.expiresAt ? r.key.expiresAt.toISOString() : null,
      hwidResetCount: r.key.hwidResetCount,
      hwidLastResetAt: r.key.hwidLastResetAt ? r.key.hwidLastResetAt.toISOString() : null,
      createdAt: r.key.createdAt.toISOString(),
    }))
  );
});

// GET /api/admin/settings
router.get("/settings", requireAdmin, async (req, res) => {
  const settings = await getOrCreateSettings();
  res.json(settings);
});

// PUT /api/admin/settings
router.put("/settings", requireAdmin, async (req, res): Promise<void> => {
  const { defaultDurationDays, defaultGameId, hwidResetLimit, hwidResetCooldownHours, keyPrefix } = req.body as {
    defaultDurationDays?: number | null;
    defaultGameId?: number | null;
    hwidResetLimit?: number;
    hwidResetCooldownHours?: number;
    keyPrefix?: string;
  };

  if (hwidResetLimit !== undefined && (hwidResetLimit < 0 || hwidResetLimit > 100)) {
    res.status(400).json({ error: "hwidResetLimit must be 0–100" });
    return;
  }

  if (keyPrefix !== undefined && (keyPrefix.length < 2 || keyPrefix.length > 20 || !/^[A-Z0-9_-]+$/i.test(keyPrefix))) {
    res.status(400).json({ error: "keyPrefix must be 2–20 alphanumeric characters" });
    return;
  }

  const existing = await getOrCreateSettings();

  const [updated] = await db
    .update(adminSettingsTable)
    .set({
      defaultDurationDays: defaultDurationDays !== undefined ? defaultDurationDays : existing.defaultDurationDays,
      defaultGameId: defaultGameId !== undefined ? defaultGameId : existing.defaultGameId,
      hwidResetLimit: hwidResetLimit !== undefined ? hwidResetLimit : existing.hwidResetLimit,
      hwidResetCooldownHours: hwidResetCooldownHours !== undefined ? hwidResetCooldownHours : existing.hwidResetCooldownHours,
      keyPrefix: keyPrefix !== undefined ? keyPrefix.toUpperCase() : existing.keyPrefix,
      updatedAt: new Date(),
    })
    .where(eq(adminSettingsTable.id, existing.id))
    .returning();

  res.json(updated);
});

export default router;
