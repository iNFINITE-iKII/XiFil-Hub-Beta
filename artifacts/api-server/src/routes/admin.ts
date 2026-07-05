import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, gamesTable, licenseKeysTable } from "@workspace/db";
import { eq, count, and, gte, sql } from "drizzle-orm";

const router = Router();

async function requireAdmin(req: any, res: any, next: any) {
  const userId = (req.session as any)?.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user?.isAdmin) return res.status(403).json({ error: "Forbidden" });

  next();
}

// GET /api/admin/stats
router.get("/stats", requireAdmin, async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    [{ total: totalUsers }],
    [{ total: totalKeys }],
    [{ total: activeKeys }],
    [{ total: totalGames }],
    [{ total: recentUsers }],
  ] = await Promise.all([
    db.select({ total: count() }).from(usersTable),
    db.select({ total: count() }).from(licenseKeysTable),
    db
      .select({ total: count() })
      .from(licenseKeysTable)
      .where(eq(licenseKeysTable.status, "active")),
    db.select({ total: count() }).from(gamesTable),
    db
      .select({ total: count() })
      .from(usersTable)
      .where(gte(usersTable.createdAt, thirtyDaysAgo)),
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
      createdAt: u.createdAt.toISOString(),
    }))
  );
});

// GET /api/admin/keys
router.get("/keys", requireAdmin, async (req, res) => {
  const rows = await db
    .select({
      key: licenseKeysTable,
      game: gamesTable,
      user: usersTable,
    })
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
      createdAt: r.key.createdAt.toISOString(),
    }))
  );
});

export default router;
