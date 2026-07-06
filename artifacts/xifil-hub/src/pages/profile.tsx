import React from "react";
import { Redirect } from "wouter";
import { useGetMe, useListMyKeys } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, ExternalLink, LinkIcon, ShieldOff, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const { data: user, isLoading } = useGetMe();
  const { data: keys } = useListMyKeys({ query: { enabled: !!user } });

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary"><Loader2 className="animate-spin w-8 h-8" /></div>;
  if (!user) return <Redirect to="/" />;

  const robloxLinked = (user as any).robloxUsername;
  const robloxId = (user as any).robloxId;

  const keysWithRoblox = (keys ?? []).filter((k: any) => (k.linkedRobloxAccounts ?? []).length > 0);
  const anyFull = (keys ?? []).some((k: any) => (k.robloxSlotsUsed ?? 0) >= (k.robloxSlotsMax ?? 1));

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 max-w-2xl"
      >
        <div className="flex flex-col gap-2 border-b border-border pb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-primary"></div>
            <h1 className="text-3xl font-bold font-mono tracking-tight text-foreground uppercase">Profile</h1>
          </div>
          <p className="text-sm text-muted-foreground font-mono">Manage your operator identity and linked accounts.</p>
        </div>

        {/* Discord Identity */}
        <Card className="border-border bg-card shadow-none rounded-sm">
          <CardHeader className="border-b border-border bg-secondary/30 py-4">
            <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Discord Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <img
                src={user.avatar
                  ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`
                  : `https://cdn.discordapp.com/embed/avatars/0.png`}
                alt={user.username}
                className="w-14 h-14 border border-border"
              />
              <div>
                <p className="text-lg font-bold font-mono text-foreground">{user.username}</p>
                <p className="text-xs font-mono text-muted-foreground">Discord ID: {user.discordId}</p>
                <div className="mt-1.5">
                  {user.isAdmin
                    ? <Badge variant="outline" className="rounded-none border-primary text-primary bg-primary/10 font-mono text-[9px] uppercase px-1.5 py-0">SYS_ADMIN</Badge>
                    : <Badge variant="outline" className="rounded-none border-muted text-muted-foreground font-mono text-[9px] uppercase px-1.5 py-0">USER</Badge>
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roblox Account */}
        <Card className="border-border bg-card shadow-none rounded-sm">
          <CardHeader className="border-b border-border bg-secondary/30 py-4">
            <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-primary" /> Roblox Account
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {robloxLinked ? (
              <>
                <div className="flex items-start gap-4">
                  {/* Avatar dari Roblox */}
                  {robloxId && (
                    <img
                      src={`https://www.roblox.com/headshot-thumbnail/image?userId=${robloxId}&width=100&height=100&format=png`}
                      alt={robloxLinked}
                      className="w-16 h-16 border border-border rounded-sm bg-secondary/30"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-bold font-mono text-foreground text-lg">{robloxLinked}</p>
                    {robloxId && (
                      <p className="text-xs font-mono text-muted-foreground">Roblox ID: {robloxId}</p>
                    )}
                    {robloxId && (
                      <a
                        href={`https://www.roblox.com/users/${robloxId}/profile`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-primary hover:underline mt-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Lihat Profil Roblox
                      </a>
                    )}
                  </div>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                    Akun Roblox terhubung otomatis saat DRM berhasil divalidasi di game. Untuk mengubah, hubungi admin.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                <ShieldOff className="w-10 h-10 text-muted-foreground/40" />
                <div>
                  <p className="font-mono text-sm text-muted-foreground font-bold uppercase tracking-wider">Belum Terhubung</p>
                  <p className="text-[11px] font-mono text-muted-foreground/70 mt-2 max-w-xs leading-relaxed">
                    Akun Roblox akan terhubung otomatis saat kamu memainkan game dengan key aktif dan DRM berhasil divalidasi.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Slot full notification */}
        {anyFull && (
          <div className="flex items-start gap-3 border border-orange-500/40 bg-orange-500/10 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-mono font-bold uppercase text-orange-500">Slot Maksimal Akun Roblox Full</p>
              <p className="text-[11px] font-mono text-muted-foreground mt-1 leading-relaxed">
                Salah satu key kamu sudah mencapai batas jumlah akun Roblox yang bisa dipakai. Reset slot lewat halaman License Management, atau hubungi admin untuk menambah slot.
              </p>
            </div>
          </div>
        )}

        {/* Linked Roblox Accounts per key */}
        {keysWithRoblox.length > 0 && (
          <Card className="border-border bg-card shadow-none rounded-sm">
            <CardHeader className="border-b border-border bg-secondary/30 py-4">
              <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-primary" /> Akun Roblox per Key
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {keysWithRoblox.map((k: any) => {
                const used = k.robloxSlotsUsed ?? (k.linkedRobloxAccounts ?? []).length;
                const max = k.robloxSlotsMax ?? 1;
                const isFull = used >= max;
                return (
                  <div key={k.id} className="border border-border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-xs text-foreground font-bold truncate">{k.gameName || `Module_#${k.gameId}`} — <span className="text-muted-foreground">{k.key}</span></p>
                      <span className={`font-mono text-[10px] uppercase px-1.5 py-0.5 border ${isFull ? "border-destructive text-destructive bg-destructive/10" : "border-primary/40 text-primary bg-primary/10"}`}>
                        {used}/{max} slot
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(k.linkedRobloxAccounts ?? []).map((acc: any) => (
                        <Badge key={acc.robloxUsername} variant="outline" className="rounded-none border-border font-mono text-[10px] px-2 py-0.5">
                          {acc.robloxUsername}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </motion.div>
    </AppLayout>
  );
}
