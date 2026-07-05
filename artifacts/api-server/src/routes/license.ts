import { Router } from "express";
import { db } from "@workspace/db";
import { licenseKeysTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/license/check?key=...&hwid=...
// Called by Lua scripts to verify license keys
router.get("/check", async (req, res): Promise<void> => {
  const { key, hwid } = req.query as { key?: string; hwid?: string };

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
  if (!licenseKey.hwid) {
    // First use — bind HWID
    await db
      .update(licenseKeysTable)
      .set({ hwid })
      .where(eq(licenseKeysTable.id, licenseKey.id));
    res.json({ status: "success", message: "Key valid. HWID terdaftar." });
    return;
  }

  if (licenseKey.hwid !== hwid) {
    res.json({ status: "error", message: "HWID tidak cocok. Key sudah terdaftar di perangkat lain." });
    return;
  }

  res.json({ status: "success", message: "Key valid." });
});

export default router;
