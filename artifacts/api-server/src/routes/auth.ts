import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, whitelistTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const DISCORD_CLIENT_ID = process.env["DISCORD_CLIENT_ID"];
const DISCORD_CLIENT_SECRET = process.env["DISCORD_CLIENT_SECRET"];

function getRedirectUri(req: any): string {
  if (process.env["APP_URL"]) return `${process.env["APP_URL"]}/api/auth/discord/callback`;
  if (process.env["RAILWAY_PUBLIC_DOMAIN"]) return `https://${process.env["RAILWAY_PUBLIC_DOMAIN"]}/api/auth/discord/callback`;
  if (process.env["REPLIT_DEV_DOMAIN"]) return `https://${process.env["REPLIT_DEV_DOMAIN"]}/api/auth/discord/callback`;
  return `${req.protocol}://${req.hostname}/api/auth/discord/callback`;
}

// GET /api/auth/discord
router.get("/discord", (req, res): void => {
  if (!DISCORD_CLIENT_ID) {
    res.status(503).json({ error: "Discord auth not configured. Set DISCORD_CLIENT_ID." });
    return;
  }
  const state = crypto.randomUUID();
  (req.session as any).oauthState = state;
  req.session.save((err) => {
    if (err) { res.status(500).json({ error: "Session save failed" }); return; }
    const redirectUri = encodeURIComponent(getRedirectUri(req));
    const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=identify&state=${state}`;
    res.redirect(url);
  });
});

// GET /api/auth/discord/callback
router.get("/discord/callback", async (req, res) => {
  const { code, state } = req.query;
  const sessionState = (req.session as any).oauthState;
  if (!state || !sessionState || state !== sessionState) { res.redirect("/?error=invalid_state"); return; }
  (req.session as any).oauthState = undefined;
  if (!code || typeof code !== "string") { res.redirect("/?error=missing_code"); return; }
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) { res.redirect("/?error=not_configured"); return; }

  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: getRedirectUri(req),
      }),
    });
    if (!tokenRes.ok) { req.log.error({ status: tokenRes.status }, "Discord token exchange failed"); res.redirect("/?error=token_failed"); return; }

    const tokenData = await tokenRes.json() as { access_token: string };
    const userRes = await fetch("https://discord.com/api/users/@me", { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
    if (!userRes.ok) { res.redirect("/?error=user_fetch_failed"); return; }

    const discordUser = await userRes.json() as { id: string; username: string; avatar: string | null };

    const [user] = await db
      .insert(usersTable)
      .values({ discordId: discordUser.id, username: discordUser.username, avatar: discordUser.avatar })
      .onConflictDoUpdate({
        target: usersTable.discordId,
        set: { username: discordUser.username, avatar: discordUser.avatar },
      })
      .returning();

    (req.session as any).userId = user.id;
    req.session.save((saveErr) => {
      if (saveErr) { req.log.error({ saveErr }, "Session save failed after OAuth"); res.redirect("/?error=session_failed"); return; }
      res.redirect("/dashboard");
    });
  } catch (err) {
    req.log.error({ err }, "Discord OAuth error");
    res.redirect("/?error=oauth_error");
  }
});

// GET /api/auth/me
router.get("/me", async (req, res): Promise<void> => {
  const userId = (req.session as any)?.userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { (req.session as any).userId = undefined; res.status(401).json({ error: "User not found" }); return; }

  // Cek apakah user ada di whitelist
  const [whitelisted] = await db.select().from(whitelistTable).where(eq(whitelistTable.discordId, user.discordId));

  res.json({
    id: user.id,
    discordId: user.discordId,
    username: user.username,
    avatar: user.avatar,
    isAdmin: user.isAdmin,
    robloxUsername: user.robloxUsername,
    robloxId: user.robloxId,
    createdAt: user.createdAt.toISOString(),
    isWhitelisted: !!whitelisted,
  });
});

// POST /api/auth/roblox — set Roblox account (ADMIN ONLY)
// User biasa tidak bisa mengubah Roblox sendiri; hanya via DRM auto-link pertama kali
router.post("/roblox", async (req, res): Promise<void> => {
  const userId = (req.session as any)?.userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  // Hanya admin yang boleh set manual
  const [caller] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!caller?.isAdmin) {
    res.status(403).json({ error: "Hanya admin yang dapat mengubah akun Roblox. Akun Roblox terhubung otomatis saat DRM valid pertama kali." });
    return;
  }

  const { robloxUsername, targetUserId } = req.body as { robloxUsername: string; targetUserId?: number };
  const applyToId = targetUserId ?? userId;

  if (!robloxUsername || typeof robloxUsername !== "string") {
    res.status(400).json({ error: "robloxUsername is required" });
    return;
  }

  const trimmed = robloxUsername.trim();
  if (trimmed.length < 3 || trimmed.length > 20) {
    res.status(400).json({ error: "Roblox username must be 3–20 characters" });
    return;
  }

  // Verify via Roblox API
  try {
    const robloxRes = await fetch(`https://users.roblox.com/v1/usernames/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [trimmed], excludeBannedUsers: true }),
    });
    if (robloxRes.ok) {
      const data = await robloxRes.json() as { data: Array<{ id: number; name: string }> };
      const found = data.data?.[0];
      if (!found) { res.status(404).json({ error: "Roblox username not found" }); return; }

      await db.update(usersTable).set({ robloxUsername: found.name, robloxId: String(found.id) }).where(eq(usersTable.id, applyToId));
      res.json({ robloxUsername: found.name, robloxId: String(found.id) });
      return;
    }
  } catch (_) {}

  // Fallback: explicitly clear robloxId to avoid stale pairings
  const [fallbackUser] = await db.update(usersTable).set({ robloxUsername: trimmed, robloxId: null }).where(eq(usersTable.id, applyToId)).returning();
  if (!fallbackUser) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ robloxUsername: trimmed, robloxId: null });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => { res.json({ message: "Logged out successfully" }); });
});

export default router;
