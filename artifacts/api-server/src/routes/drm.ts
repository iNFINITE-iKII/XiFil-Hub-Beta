import { Router } from "express";
import { db } from "@workspace/db";
import { licenseKeysTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { linkRobloxAccount } from "../lib/robloxLink";

const router = Router();

/**
 * POST /api/drm/validate
 * Dipanggil dari dalam Lua script via HttpPost untuk validasi DRM.
 * Endpoint ini PUBLIC — tidak perlu login/session.
 *
 * Body: { key: string, hwid: string, robloxUsername?: string, robloxId?: string | number }
 * Response: { valid: boolean, message: string }
 */
router.post("/validate", async (req, res): Promise<void> => {
  const { key: keyString, hwid, robloxUsername, robloxId } = req.body as {
    key?: string;
    hwid?: string;
    robloxUsername?: string;
    robloxId?: string | number;
  };

  if (!keyString || typeof keyString !== "string") {
    res.status(400).json({ valid: false, message: "Parameter 'key' diperlukan." });
    return;
  }

  if (!hwid || typeof hwid !== "string") {
    res.status(400).json({ valid: false, message: "Parameter 'hwid' diperlukan." });
    return;
  }

  // Cari key di database
  const [licenseKey] = await db
    .select()
    .from(licenseKeysTable)
    .where(eq(licenseKeysTable.key, keyString.trim().toUpperCase()));

  if (!licenseKey) {
    res.json({ valid: false, message: "Key tidak ditemukan." });
    return;
  }

  if (licenseKey.status === "revoked") {
    res.json({ valid: false, message: "Key telah direvoke." });
    return;
  }

  // Cek expiry
  if (licenseKey.expiresAt && licenseKey.expiresAt < new Date()) {
    if (licenseKey.status !== "expired") {
      await db
        .update(licenseKeysTable)
        .set({ status: "expired" })
        .where(eq(licenseKeysTable.id, licenseKey.id));
    }
    res.json({ valid: false, message: "Key sudah kadaluarsa." });
    return;
  }

  if (licenseKey.status === "expired") {
    res.json({ valid: false, message: "Key sudah kadaluarsa." });
    return;
  }

  if (licenseKey.userId === null) {
    res.json({ valid: false, message: "Key belum diklaim oleh user manapun." });
    return;
  }

  // HWID check (atomic first-bind): gunakan conditional UPDATE agar race-condition safe.
  // Jika hwid masih NULL → update atomik WHERE hwid IS NULL.
  // Jika update tidak mempengaruhi baris (sudah di-bind lebih dulu), baca ulang dan bandingkan.
  let boundKey = licenseKey;
  if (licenseKey.hwid === null) {
    const bound = await db
      .update(licenseKeysTable)
      .set({ hwid: hwid.trim() })
      .where(and(eq(licenseKeysTable.id, licenseKey.id), isNull(licenseKeysTable.hwid)))
      .returning();

    if (bound.length === 0) {
      // Baris sudah di-bind oleh request lain bersamaan — baca nilai aktual
      const [fresh] = await db
        .select()
        .from(licenseKeysTable)
        .where(eq(licenseKeysTable.id, licenseKey.id));
      if (!fresh || fresh.hwid !== hwid.trim()) {
        res.json({ valid: false, message: "HWID tidak cocok. Hubungi admin untuk reset." });
        return;
      }
      boundKey = fresh;
    } else {
      boundKey = bound[0];
    }
  } else if (licenseKey.hwid !== hwid.trim()) {
    res.json({ valid: false, message: "HWID tidak cocok. Hubungi admin untuk reset." });
    return;
  }

  // Auto-link akun Roblox, dengan enforcement slot maksimal per key.
  if (robloxUsername && typeof robloxUsername === "string") {
    const linkResult = await linkRobloxAccount(boundKey, robloxUsername, robloxId ?? null);
    if (!linkResult.ok) {
      res.json({ valid: false, message: linkResult.message });
      return;
    }
  }

  res.json({ valid: true, message: "DRM valid." });
});

export default router;
