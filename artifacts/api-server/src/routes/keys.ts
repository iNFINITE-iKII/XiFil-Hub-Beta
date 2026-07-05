import { Router } from "express";
import { db } from "@workspace/db";
import { licenseKeysTable, gamesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

function generateKeyString(): string {
  const segments = Array.from({ length: 4 }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );
  return `XIFIL-${segments.join("-")}`;
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
    createdAt: key.createdAt.toISOString(),
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

// GET /api/keys - list my keys
router.get("/", requireAuth, async (req, res) => {
  const userId = (req.session as any).userId as number;

  const rows = await db
    .select({
      key: licenseKeysTable,
      game: gamesTable,
    })
    .from(licenseKeysTable)
    .leftJoin(gamesTable, eq(licenseKeysTable.gameId, gamesTable.id))
    .where(eq(licenseKeysTable.userId, userId));

  res.json(rows.map((r) => formatKey(r.key, r.game?.name, null)));
});

// POST /api/keys/generate - generate key (admin)
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

  const [newKey] = await db
    .insert(licenseKeysTable)
    .values({
      key: generateKeyString(),
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

// DELETE /api/keys/:id - revoke key (admin)
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

// POST /api/keys/:id/assign - assign key to user (admin)
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
