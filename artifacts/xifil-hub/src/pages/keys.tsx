import React, { useState } from "react";
import { Redirect } from "wouter";
import { useGetMe, useListMyKeys, getListMyKeysQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Copy, Search, KeyRound, Plus, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function getApiUrl(path: string) {
  return `${BASE}${path}`;
}

export default function KeysPage() {
  const queryClient = useQueryClient();
  const { data: user, isLoading: isUserLoading, error: userError } = useGetMe();
  const { data: keys, isLoading: isKeysLoading } = useListMyKeys({ query: { enabled: !!user, queryKey: getListMyKeysQueryKey() } });

  const [search, setSearch] = useState("");
  const [claimInput, setClaimInput] = useState("");
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [isClaimOpen, setIsClaimOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const whitelistRedeemMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl("/api/keys/whitelist-redeem"), {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Redeem gagal");
      return data;
    },
    onSuccess: (data) => {
      setClaimSuccess(`Key "${data.key}" untuk "${data.gameName}" berhasil di-redeem!`);
      queryClient.invalidateQueries({ queryKey: getListMyKeysQueryKey() });
    },
    onError: (err: Error) => {
      setClaimError(err.message);
    },
  });

  const claimMutation = useMutation({
    mutationFn: async (keyString: string) => {
      const res = await fetch(getApiUrl("/api/keys/claim"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyString }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to claim key");
      return data;
    },
    onSuccess: (data) => {
      setClaimSuccess(`Key for "${data.gameName}" successfully claimed!`);
      setClaimInput("");
      setClaimError(null);
      queryClient.invalidateQueries({ queryKey: getListMyKeysQueryKey() });
    },
    onError: (err: Error) => {
      setClaimError(err.message);
    },
  });

  const hwidResetMutation = useMutation({
    mutationFn: async (keyId: number) => {
      const res = await fetch(getApiUrl("/api/keys/my-hwid-reset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListMyKeysQueryKey() });
    },
  });

  const [robloxResetError, setRobloxResetError] = useState<string | null>(null);
  const robloxResetMutation = useMutation({
    mutationFn: async (keyId: number) => {
      const res = await fetch(getApiUrl("/api/keys/my-roblox-reset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      return data;
    },
    onSuccess: () => {
      setRobloxResetError(null);
      queryClient.invalidateQueries({ queryKey: getListMyKeysQueryKey() });
    },
    onError: (err: Error) => {
      setRobloxResetError(err.message);
    },
  });

  if (isUserLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary"><Loader2 className="animate-spin w-8 h-8" /></div>;
  if (userError || !user) return <Redirect to="/" />;

  const filteredKeys = keys?.filter(k =>
    k.key.toLowerCase().includes(search.toLowerCase()) ||
    (k.gameName && k.gameName.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const maskHwid = (hwid: string | null | undefined) => {
    if (!hwid) return "UNBOUND";
    if (hwid.length <= 8) return hwid;
    return `${hwid.substring(0, 4)}...${hwid.substring(hwid.length - 4)}`;
  };

  const getExpiryWarning = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return "expired";
    if (days <= 3) return `expires in ${days}d`;
    return null;
  };

  const formatCooldown = (lastResetAt: string | null | undefined, cooldownHours = 168) => {
    if (!lastResetAt) return null;
    const nextReset = new Date(new Date(lastResetAt).getTime() + cooldownHours * 3600000);
    if (Date.now() >= nextReset.getTime()) return null;
    const diff = nextReset.getTime() - Date.now();
    const h = Math.ceil(diff / 3600000);
    return h > 24 ? `${Math.ceil(h / 24)}d` : `${h}h`;
  };

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-primary"></div>
              <h1 className="text-3xl font-bold font-mono tracking-tight text-foreground uppercase">License Management</h1>
            </div>
            <p className="text-sm text-muted-foreground font-mono">View and manage all active hardware entitlements.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-56">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search keys..."
                className="pl-9 font-mono text-xs rounded-none border-border bg-background focus-visible:ring-primary focus-visible:border-primary h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {(user as any).isWhitelisted && (
              <Button
                variant="outline"
                onClick={() => { setClaimError(null); setClaimSuccess(null); whitelistRedeemMutation.mutate(); }}
                disabled={whitelistRedeemMutation.isPending}
                className="font-mono text-xs uppercase tracking-wider rounded-none h-9 shrink-0 border-primary text-primary hover:bg-primary hover:text-primary-foreground gap-1.5"
                title="Kamu ada di whitelist — redeem key otomatis"
              >
                {whitelistRedeemMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Redeem
              </Button>
            )}
            <Button
              onClick={() => { setIsClaimOpen(true); setClaimError(null); setClaimSuccess(null); }}
              className="font-mono text-xs uppercase tracking-wider rounded-none h-9 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Claim Key
            </Button>
          </div>
        </div>

        {robloxResetError && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="text-xs font-mono">{robloxResetError}</p>
          </div>
        )}

        {(keys ?? []).some((k) => ((k as any).robloxSlotsUsed ?? 0) >= ((k as any).robloxSlotsMax ?? 1)) && (
          <div className="flex items-start gap-3 border border-orange-500/40 bg-orange-500/10 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-mono font-bold uppercase text-orange-500">Slot Maksimal Akun Roblox Full</p>
              <p className="text-[11px] font-mono text-muted-foreground mt-1 leading-relaxed">
                Salah satu key kamu sudah mencapai batas akun Roblox yang bisa dipakai. Reset slot di key terkait, atau hubungi admin untuk menambah slot.
              </p>
            </div>
          </div>
        )}

        <Card className="border-border bg-card shadow-none rounded-sm overflow-hidden">
          <CardHeader className="bg-secondary/30 border-b border-border py-4 px-6">
            <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" />
              Credentials Registry
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isKeysLoading ? (
              <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>
            ) : filteredKeys.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
                <KeyRound className="w-8 h-8 opacity-20 mb-2" />
                <p className="font-mono text-sm uppercase text-foreground">Zero Results</p>
                <p className="font-mono text-xs">No keys found. Claim a key using the button above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border bg-secondary/10 hover:bg-secondary/10">
                      <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10 px-6">License String</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10">Target Module</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10">Status</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10">HWID Lock</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10">Slot Roblox</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10">Expiration</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10 text-right px-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredKeys.map((key) => {
                      const expiryWarn = getExpiryWarning(key.expiresAt);
                      const cooldownLeft = formatCooldown((key as any).hwidLastResetAt);
                      const resetCount = (key as any).hwidResetCount ?? 0;
                      const canReset = key.hwid && key.status === "active" && !cooldownLeft;
                      return (
                        <TableRow key={key.id} className="border-border hover:bg-secondary/30 transition-colors">
                          <TableCell className="px-6">
                            <div className="flex items-center gap-2">
                              <code className="bg-background px-2 py-1 text-xs font-mono border border-border text-foreground max-w-[150px] md:max-w-none truncate">
                                {key.key}
                              </code>
                              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-none hover:bg-primary/20 hover:text-primary shrink-0" onClick={() => copyToClipboard(key.key, key.id)}>
                                {copiedId === key.id ? <CheckCircle2 className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-sm text-foreground">{key.gameName || `Module_#${key.gameId}`}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`rounded-none font-mono text-[9px] uppercase px-1.5 py-0 border ${
                                key.status === "active" ? "border-primary text-primary bg-primary/10" :
                                key.status === "revoked" ? "border-destructive text-destructive bg-destructive/10" :
                                "border-muted text-muted-foreground"
                              }`}
                            >
                              {key.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground tracking-wider">
                            {maskHwid(key.hwid)}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const linked = (key as any).linkedRobloxAccounts ?? [];
                              const used = (key as any).robloxSlotsUsed ?? linked.length;
                              const max = (key as any).robloxSlotsMax ?? 1;
                              const isFull = used >= max;
                              return (
                                <div className="flex flex-col gap-1">
                                  <span className={`font-mono text-xs ${isFull ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                                    {used}/{max} {isFull && "(FULL)"}
                                  </span>
                                  {linked.length > 0 && (
                                    <div className="flex flex-col gap-0.5">
                                      {linked.map((acc: any) => (
                                        <span key={acc.robloxUsername} className="text-[10px] font-mono text-foreground/80 truncate max-w-[140px]">
                                          {acc.robloxUsername}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono text-xs text-muted-foreground">
                                {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : "LIFETIME"}
                              </span>
                              {expiryWarn && (
                                <span className={`font-mono text-[9px] uppercase ${expiryWarn === "expired" ? "text-destructive" : "text-yellow-500"}`}>
                                  ⚠ {expiryWarn}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-6">
                            <div className="flex flex-col items-end gap-1.5">
                              {key.hwid && key.status === "active" && (
                                <div className="flex items-center justify-end gap-1.5">
                                  {cooldownLeft ? (
                                    <span className="text-[9px] font-mono text-muted-foreground uppercase">cooldown: {cooldownLeft}</span>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-[10px] font-mono uppercase border-border hover:border-primary hover:text-primary rounded-none gap-1"
                                      onClick={() => hwidResetMutation.mutate(key.id)}
                                      disabled={hwidResetMutation.isPending}
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      Reset HWID
                                    </Button>
                                  )}
                                  {resetCount > 0 && (
                                    <span className="text-[9px] font-mono text-muted-foreground">({resetCount}x)</span>
                                  )}
                                </div>
                              )}
                              {(() => {
                                const linked = (key as any).linkedRobloxAccounts ?? [];
                                if (linked.length === 0 || key.status !== "active") return null;
                                const robloxCooldownLeft = formatCooldown((key as any).robloxLastResetAt, (key as any).keyRobloxResetCooldownHours ?? 168);
                                const robloxResetCount = (key as any).robloxResetCount ?? 0;
                                return (
                                  <div className="flex items-center justify-end gap-1.5">
                                    {robloxCooldownLeft ? (
                                      <span className="text-[9px] font-mono text-muted-foreground uppercase">cooldown: {robloxCooldownLeft}</span>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[10px] font-mono uppercase border-border hover:border-orange-500 hover:text-orange-500 rounded-none gap-1"
                                        onClick={() => robloxResetMutation.mutate(key.id)}
                                        disabled={robloxResetMutation.isPending}
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        Reset Slot Roblox
                                      </Button>
                                    )}
                                    {robloxResetCount > 0 && (
                                      <span className="text-[9px] font-mono text-muted-foreground">({robloxResetCount}x)</span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={isClaimOpen} onOpenChange={setIsClaimOpen}>
        <DialogContent className="border-border bg-background rounded-sm shadow-2xl p-0 overflow-hidden sm:max-w-md">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
          <DialogHeader className="p-6 pb-4 border-b border-border bg-secondary/30">
            <DialogTitle className="font-mono uppercase tracking-wider text-foreground">Claim License Key</DialogTitle>
            <DialogDescription className="font-mono text-xs mt-2 text-muted-foreground">Enter a valid license key string to link it to your account.</DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">License String</Label>
              <Input
                className="rounded-none border-border bg-secondary/50 font-mono text-xs focus-visible:ring-0 focus-visible:border-primary transition-colors h-10 uppercase"
                placeholder="XIFIL-XXXX-XXXX-XXXX-XXXX"
                value={claimInput}
                onChange={(e) => { setClaimInput(e.target.value.toUpperCase()); setClaimError(null); setClaimSuccess(null); }}
                onKeyDown={(e) => { if (e.key === "Enter" && claimInput.trim()) claimMutation.mutate(claimInput.trim()); }}
              />
            </div>
            {claimError && (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-xs font-mono">{claimError}</p>
              </div>
            )}
            {claimSuccess && (
              <div className="flex items-center gap-2 text-primary bg-primary/10 border border-primary/20 px-3 py-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <p className="text-xs font-mono">{claimSuccess}</p>
              </div>
            )}
            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-none font-mono text-xs uppercase border-border hover:bg-secondary h-9" onClick={() => setIsClaimOpen(false)}>Cancel</Button>
              <Button
                className="rounded-none font-mono text-xs uppercase h-9"
                onClick={() => claimMutation.mutate(claimInput.trim())}
                disabled={claimMutation.isPending || !claimInput.trim()}
              >
                {claimMutation.isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                Claim
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
