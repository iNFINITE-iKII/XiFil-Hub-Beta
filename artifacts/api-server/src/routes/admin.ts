import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, gamesTable, licenseKeysTable, adminSettingsTable, whitelistTable } from "@workspace/db";
import { eq, count, gte, or, ilike, sql } from "drizzle-orm";

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

// GET /api/admin/users/search?q=... — search logged-in users by username or Discord ID
router.get("/users/search", requireAdmin, async (req, res): Promise<void> => {
  const q = String(req.query.q ?? "").trim();
  if (!q) { res.json([]); return; }

  const users = await db
    .select()
    .from(usersTable)
    .where(or(ilike(usersTable.username, `%${q}%`), ilike(usersTable.discordId, `%${q}%`)))
    .limit(10);

  res.json(
    users.map((u) => ({
      id: u.id,
      discordId: u.discordId,
      username: u.username,
      avatar: u.avatar,
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
      // Per-key overrides
      keyMaxAutoClaimKeys: r.key.keyMaxAutoClaimKeys ?? null,
      keyMaxHwidPerKey: r.key.keyMaxHwidPerKey ?? null,
      keyMaxRobloxPerKey: r.key.keyMaxRobloxPerKey ?? null,
      keyHwidResetLimit: r.key.keyHwidResetLimit ?? null,
      keyHwidResetCooldownHours: r.key.keyHwidResetCooldownHours ?? null,
    }))
  );
});

// GET /api/admin/users/:id — full detail satu user beserta semua key-nya
router.get("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const keyRows = await db
    .select({ key: licenseKeysTable, game: gamesTable })
    .from(licenseKeysTable)
    .leftJoin(gamesTable, eq(licenseKeysTable.gameId, gamesTable.id))
    .where(eq(licenseKeysTable.userId, id))
    .orderBy(licenseKeysTable.createdAt);

  res.json({
    id: user.id,
    discordId: user.discordId,
    username: user.username,
    avatar: user.avatar,
    isAdmin: user.isAdmin,
    robloxUsername: user.robloxUsername,
    robloxId: user.robloxId,
    createdAt: user.createdAt.toISOString(),
    keys: keyRows.map((r) => ({
      id: r.key.id,
      key: r.key.key,
      gameId: r.key.gameId,
      gameName: r.game?.name ?? null,
      hwid: r.key.hwid,
      status: r.key.status,
      expiresAt: r.key.expiresAt ? r.key.expiresAt.toISOString() : null,
      hwidResetCount: r.key.hwidResetCount,
      hwidLastResetAt: r.key.hwidLastResetAt ? r.key.hwidLastResetAt.toISOString() : null,
      createdAt: r.key.createdAt.toISOString(),
    })),
  });
});

// POST /api/admin/users/:id/reset-roblox — hapus link Roblox seorang user
router.post("/users/:id/reset-roblox", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ robloxUsername: null, robloxId: null })
    .where(eq(usersTable.id, id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ message: "Roblox account unlinked" });
});

// POST /api/admin/users/:id/set-roblox — admin mengubah link Roblox user
router.post("/users/:id/set-roblox", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const { robloxUsername } = req.body as { robloxUsername: string };
  if (!robloxUsername || typeof robloxUsername !== "string") {
    res.status(400).json({ error: "robloxUsername is required" });
    return;
  }

  const trimmed = robloxUsername.trim();
  if (trimmed.length < 3 || trimmed.length > 20) {
    res.status(400).json({ error: "Roblox username harus 3–20 karakter" });
    return;
  }

  // Verifikasi via Roblox API
  try {
    const rblxRes = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [trimmed], excludeBannedUsers: true }),
    });
    if (rblxRes.ok) {
      const data = await rblxRes.json() as { data: Array<{ id: number; name: string }> };
      const found = data.data?.[0];
      if (!found) { res.status(404).json({ error: "Username Roblox tidak ditemukan" }); return; }
      const [user] = await db.update(usersTable).set({ robloxUsername: found.name, robloxId: String(found.id) }).where(eq(usersTable.id, id)).returning();
      if (!user) { res.status(404).json({ error: "User not found" }); return; }
      res.json({ robloxUsername: found.name, robloxId: String(found.id) });
      return;
    }
  } catch (_) {}

  const [user] = await db.update(usersTable).set({ robloxUsername: trimmed, robloxId: null }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ robloxUsername: trimmed, robloxId: null });
});

// ── Whitelist ────────────────────────────────────────────────────────────────

// GET /api/admin/whitelist
router.get("/whitelist", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(whitelistTable).orderBy(whitelistTable.createdAt);
  res.json(rows);
});

// POST /api/admin/whitelist
router.post("/whitelist", requireAdmin, async (req, res): Promise<void> => {
  const { discordId, notes } = req.body as { discordId: string; notes?: string };
  if (!discordId || typeof discordId !== "string") {
    res.status(400).json({ error: "discordId is required" });
    return;
  }

  const trimmed = discordId.trim();
  if (!/^\d{17,19}$/.test(trimmed)) {
    res.status(400).json({ error: "discordId harus berupa ID numerik Discord (17–19 digit)" });
    return;
  }

  try {
    const [row] = await db.insert(whitelistTable).values({ discordId: trimmed, notes: notes?.trim() || null }).returning();
    res.status(201).json(row);
  } catch (e: any) {
    if (e.code === "23505") {
      res.status(409).json({ error: "Discord ID sudah ada di whitelist" });
    } else {
      throw e;
    }
  }
});

// DELETE /api/admin/whitelist/:id
router.delete("/whitelist/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [deleted] = await db.delete(whitelistTable).where(eq(whitelistTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ message: "Removed from whitelist" });
});

// GET /api/admin/settings
router.get("/settings", requireAdmin, async (req, res) => {
  const settings = await getOrCreateSettings();
  res.json(settings);
});

// PUT /api/admin/settings
router.put("/settings", requireAdmin, async (req, res): Promise<void> => {
  const { defaultDurationDays, defaultGameId, hwidResetLimit, hwidResetCooldownHours, keyPrefix, maxAutoClaimKeys, maxHwidPerKey, maxRobloxPerKey } = req.body as {
    defaultDurationDays?: number | null;
    defaultGameId?: number | null;
    hwidResetLimit?: number;
    hwidResetCooldownHours?: number;
    keyPrefix?: string;
    maxAutoClaimKeys?: number;
    maxHwidPerKey?: number;
    maxRobloxPerKey?: number;
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
      maxAutoClaimKeys: maxAutoClaimKeys !== undefined ? Math.max(0, maxAutoClaimKeys) : existing.maxAutoClaimKeys,
      maxHwidPerKey: maxHwidPerKey !== undefined ? Math.max(1, maxHwidPerKey) : existing.maxHwidPerKey,
      maxRobloxPerKey: maxRobloxPerKey !== undefined ? Math.max(1, maxRobloxPerKey) : existing.maxRobloxPerKey,
      updatedAt: new Date(),
    })
    .where(eq(adminSettingsTable.id, existing.id))
    .returning();

  res.json(updated);
});

// PATCH /api/admin/games/:id — edit game settings (name, slug, imageUrl, loaderName, description, features, status)
router.patch("/games/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { name, slug, description, imageUrl, loaderName, features, status } = req.body as {
    name?: string; slug?: string; description?: string; imageUrl?: string;
    loaderName?: string; features?: string[]; status?: string;
  };

  const patch: Record<string, unknown> = {};

  if (name !== undefined) {
    const trimmed = String(name).trim().slice(0, 100);
    if (!trimmed) { res.status(400).json({ error: "Name cannot be empty" }); return; }
    patch.name = trimmed;
  }
  if (slug !== undefined) {
    const cleaned = String(slug).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 60);
    if (!cleaned) { res.status(400).json({ error: "Slug cannot be empty" }); return; }
    // Check for duplicate slug (excluding current game)
    const [existing] = await db.select({ id: gamesTable.id }).from(gamesTable).where(eq(gamesTable.slug, cleaned));
    if (existing && existing.id !== id) { res.status(409).json({ error: "Slug already in use by another game" }); return; }
    patch.slug = cleaned;
  }
  if (description !== undefined) patch.description = description ? String(description).slice(0, 2000) : null;
  if (imageUrl !== undefined) patch.imageUrl = imageUrl ? String(imageUrl).slice(0, 500) : null;
  if (loaderName !== undefined) patch.loaderName = loaderName ? String(loaderName).slice(0, 100) : null;
  if (features !== undefined) {
    patch.features = Array.isArray(features)
      ? features.slice(0, 30).map(f => String(f).slice(0, 300)).filter(Boolean)
      : null;
  }
  if (status !== undefined) {
    if (!["active", "inactive"].includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
    patch.status = status;
  }

  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "No fields provided" }); return; }

  const [updated] = await db.update(gamesTable).set(patch).where(eq(gamesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Game not found" }); return; }

  res.json({
    id: updated.id,
    slug: updated.slug,
    name: updated.name,
    description: updated.description,
    imageUrl: updated.imageUrl,
    loaderName: updated.loaderName ?? null,
    features: (updated.features as string[] | null) ?? [],
    status: updated.status,
    createdAt: updated.createdAt.toISOString(),
  });
});

export default router;
