import { Router } from "express";
import { db } from "@workspace/db";
import { gamesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function formatGame(game: typeof gamesTable.$inferSelect) {
  return {
    id: game.id,
    slug: game.slug,
    name: game.name,
    description: game.description,
    imageUrl: game.imageUrl,
    status: game.status,
    createdAt: game.createdAt.toISOString(),
  };
}

// GET /api/games
router.get("/", async (req, res) => {
  const games = await db.select().from(gamesTable).orderBy(gamesTable.createdAt);
  res.json(games.map(formatGame));
});

// GET /api/games/:slug
router.get("/:slug", async (req, res): Promise<void> => {
  const { slug } = req.params;
  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.slug, slug));

  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  res.json(formatGame(game));
});

export default router;
