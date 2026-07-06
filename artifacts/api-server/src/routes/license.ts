import { Router } from "express";
import { db } from "@workspace/db";
import { licenseKeysTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { linkRobloxAccount } from "../lib/robloxLink";

const router = Router();

// GET /api/license/check?key=...&hwid=...&robloxUsername=...&robloxId=...
// Called by Lua scripts to verify license keys
router.get("/check", async (req, res): Promise<void> => {
  const { key, hwid, robloxUsername, robloxId } = req.query as {
    key?: string;
    hwid?: string;
    robloxUsername?: string;
    robloxId?: string;
  };

  if (!key || !hwid) {
    res.json({ status: "error", message: "Key dan HWID diperlukan." });
    return;
  }

  const [licenseKey] = await db
    .select()
    .from(licenseKeysTable)
    .where(eq(licenseKeysTable.key, key));

  if (!licenseKey) {
    res.json({ status: "error", message: "Key tidak ditemukan." });
    return;
  }

  if (licenseKey.status === "revoked") {
    res.json({ status: "error", message: "Key telah direvoke." });
    return;
  }

  if (licenseKey.status === "expired") {
    res.json({ status: "error", message: "Key telah kadaluarsa." });
    return;
  }

  // Check expiry
  if (licenseKey.expiresAt && new Date() > licenseKey.expiresAt) {
    await db
      .update(licenseKeysTable)
      .set({ status: "expired" })
      .where(eq(licenseKeysTable.id, licenseKey.id));
    res.json({ status: "error", message: "Key telah kadaluarsa." });
    return;
  }

  // HWID binding
  let boundKey = licenseKey;
  if (!licenseKey.hwid) {
    // First use — bind HWID
    const [updated] = await db
      .update(licenseKeysTable)
      .set({ hwid })
      .where(eq(licenseKeysTable.id, licenseKey.id))
      .returning();
    boundKey = updated;
  } else if (licenseKey.hwid !== hwid) {
    res.json({ status: "error", message: "HWID tidak cocok. Key sudah terdaftar di perangkat lain." });
    return;
  }

  // Auto-link akun Roblox yang sedang bermain, dengan enforcement slot maksimal.
  if (robloxUsername && typeof robloxUsername === "string") {
    const linkResult = await linkRobloxAccount(boundKey, robloxUsername, robloxId ?? null);
    if (!linkResult.ok) {
      res.json({ status: "error", message: linkResult.message });
      return;
    }
  }

  res.json({ status: "success", message: "Key valid." });
});

export default router;
