import { Router } from "express";
import { db } from "@workspace/db";
import { licenseKeysTable, gamesTable, usersTable, adminSettingsTable, whitelistTable } from "@workspace/db";
import { eq, and, inArray, count } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

function generateKeyString(prefix = "XIFIL"): string {
  const segments = Array.from({ length: 4 }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );
  return `${prefix}-${segments.join("-")}`;
}

function formatKey(
  key: typeof licenseKeysTable.$inferSelect,
  gameName?: string | null,
  username?: string | null
) {
  return {
    id: key.id,
    key: key.key,
    gameId: key.gameId,
    gameName: gameName ?? null,
    userId: key.userId,
    username: username ?? null,
    hwid: key.hwid,
    status: key.status,
    expiresAt: key.expiresAt ? key.expiresAt.toISOString() : null,
    hwidResetCount: key.hwidResetCount,
    hwidLastResetAt: key.hwidLastResetAt ? key.hwidLastResetAt.toISOString() : null,
    createdAt: key.createdAt.toISOString(),
    // Per-key overrides (null = inherit from global admin_settings)
    keyMaxAutoClaimKeys: key.keyMaxAutoClaimKeys ?? null,
    keyMaxHwidPerKey: key.keyMaxHwidPerKey ?? null,
    keyMaxRobloxPerKey: key.keyMaxRobloxPerKey ?? null,
    keyHwidResetLimit: key.keyHwidResetLimit ?? null,
    keyHwidResetCooldownHours: key.keyHwidResetCooldownHours ?? null,
  };
}

function requireAuth(req: any, res: any, next: any) {
  if (!(req.session as any)?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

async function requireAdmin(req: any, res: any, next: any) {
  const userId = (req.session as any)?.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user?.isAdmin) return res.status(403).json({ error: "Forbidden" });
  next();
}

async function getSettings() {
  const [settings] = await db.select().from(adminSettingsTable);
  if (!settings) {
    const [created] = await db.insert(adminSettingsTable).values({}).returning();
    return created;
  }
  return settings;
}

// GET /api/keys — list my keys
router.get("/", requireAuth, async (req, res) => {
  const userId = (req.session as any).userId as number;
  const rows = await db
    .select({ key: licenseKeysTable, game: gamesTable })
    .from(licenseKeysTable)
    .leftJoin(gamesTable, eq(licenseKeysTable.gameId, gamesTable.id))
    .where(eq(licenseKeysTable.userId, userId));
  res.json(rows.map((r) => formatKey(r.key, r.game?.name, null)));
});

// POST /api/keys/claim — user claims a key by entering the key string
router.post("/claim", requireAuth, async (req, res): Promise<void> => {
  const userId = (req.session as any).userId as number;
  const { key: keyString } = req.body as { key: string };

  if (!keyString || typeof keyString !== "string") {
    res.status(400).json({ error: "Key string is required" });
    return;
  }

  const [licenseKey] = await db
    .select()
    .from(licenseKeysTable)
    .where(eq(licenseKeysTable.key, keyString.trim().toUpperCase()));

  if (!licenseKey) {
    res.status(404).json({ error: "Key not found" });
    return;
  }

  if (licenseKey.status === "revoked" || licenseKey.status === "expired") {
    res.status(400).json({ error: `Key is ${licenseKey.status}` });
    return;
  }

  if (licenseKey.userId !== null && licenseKey.userId !== userId) {
    res.status(400).json({ error: "Key already claimed by another user" });
    return;
  }

  if (licenseKey.userId === userId) {
    res.status(400).json({ error: "You already own this key" });
    return;
  }

  const [updated] = await db
    .update(licenseKeysTable)
    .set({ userId })
    .where(eq(licenseKeysTable.id, licenseKey.id))
    .returning();

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, updated.gameId));
  res.status(200).json(formatKey(updated, game?.name, null));
});

// POST /api/keys/my-hwid-reset — user resets their own HWID (with cooldown)
router.post("/my-hwid-reset", requireAuth, async (req, res): Promise<void> => {
  const userId = (req.session as any).userId as number;
  const { keyId } = req.body as { keyId: number };

  if (!keyId) {
    res.status(400).json({ error: "keyId is required" });
    return;
  }

  const [licenseKey] = await db
    .select()
    .from(licenseKeysTable)
    .where(and(eq(licenseKeysTable.id, keyId), eq(licenseKeysTable.userId, userId)));

  if (!licenseKey) {
    res.status(404).json({ error: "Key not found or not owned by you" });
    return;
  }

  if (licenseKey.status !== "active") {
    res.status(400).json({ error: "Only active keys can be reset" });
    return;
  }

  const settings = await getSettings();
  // Per-key override takes priority over global setting
  const resetLimit = licenseKey.keyHwidResetLimit ?? settings.hwidResetLimit;
  const cooldownHours = licenseKey.keyHwidResetCooldownHours ?? settings.hwidResetCooldownHours;

  if (licenseKey.hwidResetCount >= resetLimit) {
    res.status(400).json({ error: `HWID reset limit reached (${resetLimit} resets allowed)` });
    return;
  }

  if (licenseKey.hwidLastResetAt) {
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const nextResetAt = new Date(licenseKey.hwidLastResetAt.getTime() + cooldownMs);
    if (new Date() < nextResetAt) {
      res.status(429).json({
        error: "Cooldown active",
        nextResetAt: nextResetAt.toISOString(),
      });
      return;
    }
  }

  const [updated] = await db
    .update(licenseKeysTable)
    .set({
      hwid: null,
      hwidResetCount: licenseKey.hwidResetCount + 1,
      hwidLastResetAt: new Date(),
    })
    .where(eq(licenseKeysTable.id, keyId))
    .returning();

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, updated.gameId));
  res.json(formatKey(updated, game?.name, null));
});

// POST /api/keys/whitelist-redeem — user yang di-whitelist auto-klaim key baru
router.post("/whitelist-redeem", requireAuth, async (req, res): Promise<void> => {
  const userId = (req.session as any).userId as number;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  // Cek whitelist by discordId
  const [whitelisted] = await db.select().from(whitelistTable).where(eq(whitelistTable.discordId, user.discordId));
  if (!whitelisted) {
    res.status(403).json({ error: "Kamu tidak ada di whitelist" });
    return;
  }

  const settings = await getSettings();

  // Harus ada default game sebelum masuk transaction
  if (!settings.defaultGameId) {
    res.status(503).json({ error: "Admin belum mengatur default module. Hubungi admin." });
    return;
  }

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, settings.defaultGameId));
  if (!game) {
    res.status(503).json({ error: "Default module tidak ditemukan. Hubungi admin." });
    return;
  }

  let expiresAt: Date | null = null;
  if (settings.defaultDurationDays) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + settings.defaultDurationDays);
  }

  // Cek kuota + insert secara atomik dalam satu transaksi untuk mencegah race condition
  let newKey: any;
  try {
    newKey = await db.transaction(async (tx: any) => {
      const existingKeys = await tx
        .select()
        .from(licenseKeysTable)
        .where(eq(licenseKeysTable.userId, userId))
        .for("update"); // row-level lock

      // Per-key override: use the highest maxAutoClaimKeys from existing keys, or fall back to global
      let perKeyMax: number | null = null;
      for (const k of existingKeys) {
        if (k.keyMaxAutoClaimKeys != null) {
          perKeyMax = perKeyMax == null ? k.keyMaxAutoClaimKeys : Math.max(perKeyMax, k.keyMaxAutoClaimKeys);
        }
      }
      const effectiveMax = perKeyMax ?? settings.maxAutoClaimKeys;

      if (existingKeys.length >= effectiveMax) {
        throw Object.assign(new Error(`Batas auto-klaim tercapai (maks ${effectiveMax} key)`), { status: 400 });
      }
      const [key] = await tx
        .insert(licenseKeysTable)
        .values({ key: generateKeyString(settings.keyPrefix), gameId: settings.defaultGameId!, userId, expiresAt, status: "active" })
        .returning();
      return key;
    });
  } catch (err: any) {
    if (err.status === 400) { res.status(400).json({ error: err.message }); return; }
    throw err;
  }

  res.status(201).json(formatKey(newKey, game.name, user.username));
});

// POST /api/keys/generate — generate single key (admin)
router.post("/generate", requireAdmin, async (req, res): Promise<void> => {
  const { gameId, userId, expiresAt } = req.body as {
    gameId: number;
    userId?: number | null;
    expiresAt?: string | null;
  };

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, gameId));
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  const settings = await getSettings();

  const [newKey] = await db
    .insert(licenseKeysTable)
    .values({
      key: generateKeyString(settings.keyPrefix),
      gameId,
      userId: userId ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      status: "active",
    })
    .returning();

  let username: string | null = null;
  if (newKey.userId) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, newKey.userId));
    username = user?.username ?? null;
  }

  res.status(201).json(formatKey(newKey, game.name, username));
});

// POST /api/keys/bulk-generate — generate multiple keys (admin)
router.post("/bulk-generate", requireAdmin, async (req, res): Promise<void> => {
  const { gameId, count, expiresAt } = req.body as {
    gameId: number;
    count: number;
    expiresAt?: string | null;
  };

  if (!gameId || !count || count < 1 || count > 500) {
    res.status(400).json({ error: "gameId and count (1–500) are required" });
    return;
  }

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, gameId));
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  const settings = await getSettings();
  const expiry = expiresAt ? new Date(expiresAt) : null;

  const values = Array.from({ length: count }, () => ({
    key: generateKeyString(settings.keyPrefix),
    gameId,
    userId: null,
    expiresAt: expiry,
    status: "active",
  }));

  const newKeys = await db.insert(licenseKeysTable).values(values).returning();
  res.status(201).json({ count: newKeys.length, keys: newKeys.map((k) => formatKey(k, game.name, null)) });
});

// GET /api/keys/export — export all keys as CSV (admin)
router.get("/export", requireAdmin, async (req, res) => {
  const rows = await db
    .select({ key: licenseKeysTable, game: gamesTable, user: usersTable })
    .from(licenseKeysTable)
    .leftJoin(gamesTable, eq(licenseKeysTable.gameId, gamesTable.id))
    .leftJoin(usersTable, eq(licenseKeysTable.userId, usersTable.id));

  const lines = [
    "id,key,game,owner,status,hwid,expires_at,hwid_reset_count,created_at",
    ...rows.map((r) =>
      [
        r.key.id,
        r.key.key,
        r.game?.name ?? "",
        r.user?.username ?? "",
        r.key.status,
        r.key.hwid ?? "",
        r.key.expiresAt ? r.key.expiresAt.toISOString() : "lifetime",
        r.key.hwidResetCount,
        r.key.createdAt.toISOString(),
      ].join(",")
    ),
  ];

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="xifil-keys-${Date.now()}.csv"`);
  res.send(lines.join("\n"));
});

// PATCH /api/keys/:id/settings — admin updates per-key override settings
router.patch("/:id/settings", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid key ID" }); return; }

  const { keyMaxAutoClaimKeys, keyMaxHwidPerKey, keyMaxRobloxPerKey, keyHwidResetLimit, keyHwidResetCooldownHours } = req.body as {
    keyMaxAutoClaimKeys?: number | null;
    keyMaxHwidPerKey?: number | null;
    keyMaxRobloxPerKey?: number | null;
    keyHwidResetLimit?: number | null;
    keyHwidResetCooldownHours?: number | null;
  };

  // Validate numeric fields if provided (not null)
  const validate = (v: number | null | undefined, min: number, max: number, name: string): string | null => {
    if (v == null) return null;
    if (!Number.isInteger(v) || v < min || v > max) return `${name} must be an integer between ${min} and ${max}`;
    return null;
  };
  const errs = [
    validate(keyMaxAutoClaimKeys, 0, 1000, "keyMaxAutoClaimKeys"),
    validate(keyMaxHwidPerKey, 1, 100, "keyMaxHwidPerKey"),
    validate(keyMaxRobloxPerKey, 1, 100, "keyMaxRobloxPerKey"),
    validate(keyHwidResetLimit, 0, 100, "keyHwidResetLimit"),
    validate(keyHwidResetCooldownHours, 0, 87600, "keyHwidResetCooldownHours"),
  ].filter(Boolean);
  if (errs.length) { res.status(400).json({ error: errs.join("; ") }); return; }

  const [existing] = await db.select().from(licenseKeysTable).where(eq(licenseKeysTable.id, id));
  if (!existing) { res.status(404).json({ error: "Key not found" }); return; }

  const [updated] = await db
    .update(licenseKeysTable)
    .set({
      keyMaxAutoClaimKeys: keyMaxAutoClaimKeys !== undefined ? keyMaxAutoClaimKeys : existing.keyMaxAutoClaimKeys,
      keyMaxHwidPerKey: keyMaxHwidPerKey !== undefined ? keyMaxHwidPerKey : existing.keyMaxHwidPerKey,
      keyMaxRobloxPerKey: keyMaxRobloxPerKey !== undefined ? keyMaxRobloxPerKey : existing.keyMaxRobloxPerKey,
      keyHwidResetLimit: keyHwidResetLimit !== undefined ? keyHwidResetLimit : existing.keyHwidResetLimit,
      keyHwidResetCooldownHours: keyHwidResetCooldownHours !== undefined ? keyHwidResetCooldownHours : existing.keyHwidResetCooldownHours,
    })
    .where(eq(licenseKeysTable.id, id))
    .returning();

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, updated.gameId));
  let username: string | null = null;
  if (updated.userId) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId));
    username = user?.username ?? null;
  }
  res.json(formatKey(updated, game?.name, username));
});

// POST /api/keys/:id/reset-hwid — admin resets HWID for any key
// Optional body: { clearRoblox?: boolean } — jika true, juga hapus link Roblox pemilik key
router.post("/:id/reset-hwid", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { clearRoblox } = req.body as { clearRoblox?: boolean };

  const [updated] = await db
    .update(licenseKeysTable)
    .set({ hwid: null, hwidResetCount: 0, hwidLastResetAt: null })
    .where(eq(licenseKeysTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Key not found" });
    return;
  }

  // Jika diminta, hapus juga link Roblox pemilik key
  if (clearRoblox && updated.userId) {
    await db
      .update(usersTable)
      .set({ robloxUsername: null, robloxId: null })
      .where(eq(usersTable.id, updated.userId));
  }

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, updated.gameId));
  res.json(formatKey(updated, game?.name, null));
});

// DELETE /api/keys/:id — revoke key (admin)
router.delete("/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [key] = await db
    .update(licenseKeysTable)
    .set({ status: "revoked" })
    .where(eq(licenseKeysTable.id, id))
    .returning();

  if (!key) {
    res.status(404).json({ error: "Key not found" });
    return;
  }

  res.json({ message: "Key revoked successfully" });
});

// POST /api/keys/:id/assign — assign key to user (admin)
router.post("/:id/assign", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { userId } = req.body as { userId: number };

  const [key] = await db
    .update(licenseKeysTable)
    .set({ userId })
    .where(eq(licenseKeysTable.id, id))
    .returning();

  if (!key) {
    res.status(404).json({ error: "Key not found" });
    return;
  }

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, key.gameId));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  res.json(formatKey(key, game?.name, user?.username));
});

export default router;
