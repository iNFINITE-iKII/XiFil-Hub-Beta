import { db } from "@workspace/db";
import {
  usersTable,
  adminSettingsTable,
  linkedRobloxAccountsTable,
  type LicenseKey,
} from "@workspace/db";
import { eq, and, count, isNull } from "drizzle-orm";

export type RobloxLinkResult =
  | { ok: true }
  | { ok: false; message: string; reason: "slot_full" };

/**
 * Menghubungkan akun Roblox ke sebuah license key, dengan enforcement
 * jumlah slot maksimal (per-key override > global admin_settings).
 *
 * - Jika akun Roblox ini sudah pernah dihubungkan ke key ini → hanya update lastSeenAt.
 * - Jika belum, dan slot masih tersedia → catat sebagai akun baru.
 * - Jika belum, dan slot sudah penuh → tolak dengan pesan "Slot maksimal akun Full".
 *
 * Juga mengisi `users.roblox_username` / `roblox_id` sebagai identitas utama
 * (hanya saat masih kosong) untuk kompatibilitas tampilan lama.
 */
export async function linkRobloxAccount(
  licenseKey: LicenseKey,
  robloxUsername: string,
  robloxId: string | number | null | undefined
): Promise<RobloxLinkResult> {
  const username = robloxUsername.trim();
  if (!username) return { ok: true };
  const robloxIdStr = robloxId != null ? String(robloxId) : null;

  const [existingLink] = await db
    .select()
    .from(linkedRobloxAccountsTable)
    .where(
      and(
        eq(linkedRobloxAccountsTable.licenseKeyId, licenseKey.id),
        eq(linkedRobloxAccountsTable.robloxUsername, username)
      )
    );

  if (existingLink) {
    await db
      .update(linkedRobloxAccountsTable)
      .set({ lastSeenAt: new Date(), robloxId: robloxIdStr ?? existingLink.robloxId })
      .where(eq(linkedRobloxAccountsTable.id, existingLink.id));
    return { ok: true };
  }

  const [{ value: currentCount }] = await db
    .select({ value: count() })
    .from(linkedRobloxAccountsTable)
    .where(eq(linkedRobloxAccountsTable.licenseKeyId, licenseKey.id));

  const [settings] = await db.select().from(adminSettingsTable);
  const maxSlots = licenseKey.keyMaxRobloxPerKey ?? settings?.maxRobloxPerKey ?? 1;

  if (currentCount >= maxSlots) {
    return {
      ok: false,
      reason: "slot_full",
      message: `Slot maksimal akun Roblox Full (${currentCount}/${maxSlots}). Reset slot di halaman My Keys, atau hubungi admin untuk menambah jumlah slot.`,
    };
  }

  // Insert atomik dengan unique constraint (licenseKeyId, robloxUsername) sebagai pengaman race-condition.
  try {
    await db.insert(linkedRobloxAccountsTable).values({
      licenseKeyId: licenseKey.id,
      robloxUsername: username,
      robloxId: robloxIdStr,
    });
  } catch {
    // Sudah ter-insert oleh request paralel lain — anggap berhasil.
  }

  // Identitas utama di profil (kompat lama): isi hanya jika masih kosong.
  if (licenseKey.userId) {
    await db
      .update(usersTable)
      .set({ robloxUsername: username, robloxId: robloxIdStr })
      .where(and(eq(usersTable.id, licenseKey.userId), isNull(usersTable.robloxUsername)));
  }

  return { ok: true };
}
