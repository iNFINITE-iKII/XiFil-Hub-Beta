import React, { useState, useEffect } from "react";
import { Redirect } from "wouter";
import {
  useGetMe,
  useGetAdminStats,
  useListAdminUsers,
  useListAdminKeys,
  useListGames,
  useGenerateKey,
  useRevokeKey,
  getGetAdminStatsQueryKey,
  getListAdminKeysQueryKey,
  getListAdminUsersQueryKey,
  getListGamesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, ShieldAlert, Users, KeyRound, Activity, Terminal, Download, Layers, RotateCcw, Settings, CheckCircle2, Eye, UserX, Copy, Search } from "lucide-react";
import { motion } from "framer-motion";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
function apiUrl(path: string) { return `${BASE}${path}`; }

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { data: user, isLoading: isUserLoading } = useGetMe();

  const [activeTab, setActiveTab] = useState("overview");
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [formData, setFormData] = useState({ gameId: "", userId: "", days: "" });
  const [bulkData, setBulkData] = useState({ gameId: "", count: "10", days: "" });
  const [bulkResult, setBulkResult] = useState<{ count: number } | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [copiedHwid, setCopiedHwid] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [keySearch, setKeySearch] = useState("");
  const [wlInput, setWlInput] = useState({ discordId: "", notes: "" });
  const [wlSearchQuery, setWlSearchQuery] = useState("");
  const [wlSearchDebounced, setWlSearchDebounced] = useState("");
  const [wlSearchOpen, setWlSearchOpen] = useState(false);
  const [wlSelectedUser, setWlSelectedUser] = useState<{ id: number; discordId: string; username: string; avatar: string | null } | null>(null);
  const [isKeySettingsOpen, setIsKeySettingsOpen] = useState(false);
  const [selectedKeyForSettings, setSelectedKeyForSettings] = useState<any | null>(null);
  const [keySettingsForm, setKeySettingsForm] = useState({
    keyMaxAutoClaimKeys: "",
    keyMaxHwidPerKey: "",
    keyMaxRobloxPerKey: "",
    keyHwidResetLimit: "",
    keyHwidResetCooldownHours: "",
  });
  const [setRobloxInput, setSetRobloxInput] = useState("");
  const [setRobloxError, setSetRobloxError] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    defaultDurationDays: "",
    defaultGameId: "",
    hwidResetLimit: "1",
    hwidResetCooldownHours: "168",
    keyPrefix: "XIFIL",
    maxAutoClaimKeys: "1",
    maxHwidPerKey: "1",
    maxRobloxPerKey: "1",
  });

  const { data: stats, isLoading: isStatsLoading } = useGetAdminStats({ query: { enabled: !!user?.isAdmin, queryKey: getGetAdminStatsQueryKey() } });
  const { data: users, isLoading: isUsersLoading } = useListAdminUsers({ query: { enabled: !!user?.isAdmin && activeTab === "users", queryKey: getListAdminUsersQueryKey() } });
  const { data: keys, isLoading: isKeysLoading } = useListAdminKeys({ query: { enabled: !!user?.isAdmin && activeTab === "keys", queryKey: getListAdminKeysQueryKey() } });
  const { data: games } = useListGames({ query: { enabled: !!user?.isAdmin, queryKey: getListGamesQueryKey() } });

  const { data: settings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/admin/settings"), { credentials: "include" });
      return res.json();
    },
    enabled: !!user?.isAdmin && activeTab === "settings",
  });

  useEffect(() => {
    if (settings) {
      setSettingsForm({
        defaultDurationDays: settings.defaultDurationDays != null ? String(settings.defaultDurationDays) : "",
        defaultGameId: settings.defaultGameId != null ? String(settings.defaultGameId) : "",
        hwidResetLimit: String(settings.hwidResetLimit ?? 1),
        hwidResetCooldownHours: String(settings.hwidResetCooldownHours ?? 168),
        keyPrefix: settings.keyPrefix ?? "XIFIL",
        maxAutoClaimKeys: String(settings.maxAutoClaimKeys ?? 1),
        maxHwidPerKey: String(settings.maxHwidPerKey ?? 1),
        maxRobloxPerKey: String(settings.maxRobloxPerKey ?? 1),
      });
    }
  }, [settings]);

  // Debounce whitelist user search
  useEffect(() => {
    const t = setTimeout(() => setWlSearchDebounced(wlSearchQuery), 300);
    return () => clearTimeout(t);
  }, [wlSearchQuery]);

  const generateKey = useGenerateKey();
  const revokeKey = useRevokeKey();

  const bulkGenerateMutation = useMutation({
    mutationFn: async (data: { gameId: number; count: number; expiresAt: string | null }) => {
      const res = await fetch(apiUrl("/api/keys/bulk-generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      return json;
    },
    onSuccess: (data) => {
      setBulkResult({ count: data.count });
      queryClient.invalidateQueries({ queryKey: getListAdminKeysQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
    },
  });

  const adminHwidResetMutation = useMutation({
    mutationFn: async ({ keyId, clearRoblox }: { keyId: number; clearRoblox?: boolean }) => {
      const res = await fetch(apiUrl(`/api/keys/${keyId}/reset-hwid`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearRoblox: !!clearRoblox }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListAdminKeysQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", selectedUserId] });
    },
  });

  const resetRobloxMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(apiUrl(`/api/admin/users/${userId}/reset-roblox`), {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", selectedUserId] });
    },
  });

  const { data: userDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["admin-user-detail", selectedUserId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/admin/users/${selectedUserId}`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user detail");
      return res.json();
    },
    enabled: isDetailOpen && selectedUserId !== null,
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: typeof settingsForm) => {
      const res = await fetch(apiUrl("/api/admin/settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultDurationDays: data.defaultDurationDays ? parseInt(data.defaultDurationDays) : null,
          defaultGameId: data.defaultGameId ? parseInt(data.defaultGameId) : null,
          hwidResetLimit: parseInt(data.hwidResetLimit),
          hwidResetCooldownHours: parseInt(data.hwidResetCooldownHours),
          keyPrefix: data.keyPrefix,
          maxAutoClaimKeys: Number.isNaN(parseInt(data.maxAutoClaimKeys)) ? 1 : parseInt(data.maxAutoClaimKeys),
          maxHwidPerKey: Number.isNaN(parseInt(data.maxHwidPerKey)) ? 1 : parseInt(data.maxHwidPerKey),
          maxRobloxPerKey: Number.isNaN(parseInt(data.maxRobloxPerKey)) ? 1 : parseInt(data.maxRobloxPerKey),
        }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    },
  });

  // ── Whitelist data + mutations ──────────────────────────────
  const { data: whitelist, isLoading: isWlLoading } = useQuery({
    queryKey: ["admin-whitelist"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/admin/whitelist"), { credentials: "include" });
      return res.json();
    },
    enabled: !!user?.isAdmin && activeTab === "whitelist",
  });

  const addWlMutation = useMutation({
    mutationFn: async (data: { discordId: string; notes: string }) => {
      const res = await fetch(apiUrl("/api/admin/whitelist"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-whitelist"] });
      setWlInput({ discordId: "", notes: "" });
      setWlSearchQuery("");
      setWlSelectedUser(null);
    },
  });

  // User search query for whitelist add
  const { data: wlSearchResults } = useQuery<{ id: number; discordId: string; username: string; avatar: string | null }[]>({
    queryKey: ["user-search", wlSearchDebounced],
    queryFn: async () => {
      if (!wlSearchDebounced) return [];
      const res = await fetch(apiUrl(`/api/admin/users/search?q=${encodeURIComponent(wlSearchDebounced)}`), { credentials: "include" });
      return res.json();
    },
    enabled: !!user?.isAdmin && wlSearchDebounced.length >= 1,
    staleTime: 5000,
  });

  // Key per-key settings mutation
  const keySettingsMutation = useMutation({
    mutationFn: async ({ keyId, settings }: { keyId: number; settings: Record<string, number | null> }) => {
      const res = await fetch(apiUrl(`/api/keys/${keyId}/settings`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListAdminKeysQueryKey() });
      setIsKeySettingsOpen(false);
    },
  });

  const removeWlMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(apiUrl(`/api/admin/whitelist/${id}`), { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      return json;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-whitelist"] }),
  });

  const setRobloxMutation = useMutation({
    mutationFn: async ({ userId, robloxUsername }: { userId: number; robloxUsername: string }) => {
      const res = await fetch(apiUrl(`/api/admin/users/${userId}/set-roblox`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ robloxUsername }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", selectedUserId] });
      setSetRobloxInput("");
      setSetRobloxError(null);
    },
    onError: (err: Error) => setSetRobloxError(err.message),
  });

  // Filtered data untuk search
  const filteredUsers = (users as any[] | undefined)?.filter((u) => {
    const q = userSearch.toLowerCase();
    return !q || u.username?.toLowerCase().includes(q) || u.discordId?.includes(q) || u.robloxUsername?.toLowerCase().includes(q);
  });

  const filteredKeys = (keys as any[] | undefined)?.filter((k) => {
    const q = keySearch.toLowerCase();
    return !q || k.key?.toLowerCase().includes(q) || k.username?.toLowerCase().includes(q) || k.gameName?.toLowerCase().includes(q);
  });

  if (isUserLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  if (!user || !user.isAdmin) return <Redirect to="/dashboard" />;

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.gameId) return;
    let expiresAt = null;
    if (formData.days) {
      const date = new Date();
      date.setDate(date.getDate() + parseInt(formData.days));
      expiresAt = date.toISOString();
    }
    generateKey.mutate(
      { data: { gameId: parseInt(formData.gameId), userId: formData.userId ? parseInt(formData.userId) : null, expiresAt } },
      {
        onSuccess: () => {
          setIsGenerateOpen(false);
          setFormData({ gameId: "", userId: "", days: "" });
          queryClient.invalidateQueries({ queryKey: getListAdminKeysQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        },
      }
    );
  };

  const handleBulkGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkData.gameId || !bulkData.count) return;
    let expiresAt = null;
    if (bulkData.days) {
      const date = new Date();
      date.setDate(date.getDate() + parseInt(bulkData.days));
      expiresAt = date.toISOString();
    }
    setBulkResult(null);
    bulkGenerateMutation.mutate({ gameId: parseInt(bulkData.gameId), count: parseInt(bulkData.count), expiresAt });
  };

  const handleRevoke = (id: number) => {
    if (confirm("Execute revocation protocol? This action is irreversible.")) {
      revokeKey.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAdminKeysQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        },
      });
    }
  };

  const handleExportCSV = () => {
    window.open(apiUrl("/api/keys/export"), "_blank");
  };

  const selectClass = "flex h-10 w-full rounded-none border border-border bg-secondary/50 px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:border-primary text-foreground transition-colors";

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <ShieldAlert className="w-6 h-6 text-primary" />
              <h1 className="text-3xl font-bold font-mono tracking-tight text-foreground uppercase">System Admin</h1>
            </div>
            <p className="text-sm text-muted-foreground font-mono">Elevated access: Infrastructure monitoring and control.</p>
          </div>
          {activeTab === "keys" && (
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={handleExportCSV} className="font-mono text-xs uppercase tracking-wider rounded-none h-9 border-border hover:border-primary hover:text-primary gap-1.5">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </Button>
              <Button variant="outline" onClick={() => { setIsBulkOpen(true); setBulkResult(null); }} className="font-mono text-xs uppercase tracking-wider rounded-none h-9 border-border hover:border-primary hover:text-primary gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Bulk Generate
              </Button>
              <Button onClick={() => setIsGenerateOpen(true)} className="font-mono text-xs uppercase tracking-wider rounded-none h-9">
                + Instantiate Key
              </Button>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-secondary border border-border rounded-none h-10">
            <TabsTrigger value="overview" className="rounded-none font-mono text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">Telemetry</TabsTrigger>
            <TabsTrigger value="users" className="rounded-none font-mono text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">Operators</TabsTrigger>
            <TabsTrigger value="keys" className="rounded-none font-mono text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">Licenses</TabsTrigger>
            <TabsTrigger value="whitelist" className="rounded-none font-mono text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">Whitelist</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-none font-mono text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">
              <Settings className="w-3.5 h-3.5 mr-1.5" /> Settings
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="mt-0">
            {isStatsLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-border bg-card shadow-none rounded-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 bg-secondary/20">
                    <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Total Ops</CardTitle>
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-3xl font-bold font-mono text-foreground">{stats?.totalUsers || 0}</div>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card shadow-none rounded-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 bg-secondary/20">
                    <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Total Keys</CardTitle>
                    <KeyRound className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-3xl font-bold font-mono text-foreground">{stats?.totalKeys || 0}</div>
                  </CardContent>
                </Card>
                <Card className="border-primary/50 bg-primary/5 shadow-none rounded-sm relative overflow-hidden box-glow">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 pl-6 bg-primary/10 border-b border-primary/20">
                    <CardTitle className="text-xs font-mono uppercase tracking-wider text-primary">Active Keys</CardTitle>
                    <Activity className="w-4 h-4 text-primary" />
                  </CardHeader>
                  <CardContent className="pt-4 pl-6">
                    <div className="text-3xl font-bold font-mono text-primary">{stats?.activeKeys || 0}</div>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card shadow-none rounded-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 bg-secondary/20">
                    <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Modules</CardTitle>
                    <Terminal className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-3xl font-bold font-mono text-foreground">{stats?.totalGames || 0}</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* OPERATORS */}
          <TabsContent value="users" className="mt-0">
            <div className="mb-3 flex gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari username / Discord ID / Roblox..."
                  className="pl-9 font-mono text-xs rounded-none border-border bg-background focus-visible:ring-0 focus-visible:border-primary h-9"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
            </div>
            <Card className="border-border bg-card shadow-none rounded-sm">
              <CardContent className="p-0">
                {isUsersLoading ? (
                  <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border bg-secondary/30">
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10 px-6">UID</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10">Operator</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10">Roblox</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10">Clearance</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10">Init Date</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10 text-right px-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(filteredUsers ?? []).map((u: any) => (
                          <TableRow key={u.id} className="border-border hover:bg-secondary/20 transition-colors">
                            <TableCell className="font-mono text-xs text-muted-foreground px-6">{String(u.id).padStart(4, "0")}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <img src={u.avatar ? `https://cdn.discordapp.com/avatars/${u.discordId}/${u.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/0.png`} alt="" className="w-6 h-6 border border-border transition-all" />
                                <span className="font-bold text-sm text-foreground">{u.username}</span>
                                <span className="text-[10px] font-mono text-muted-foreground">({u.discordId})</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {u.robloxUsername ? (
                                <span className="text-foreground">{u.robloxUsername} <span className="text-muted-foreground text-[10px]">#{u.robloxId}</span></span>
                              ) : (
                                <span className="text-muted-foreground/50 uppercase text-[10px]">unlinked</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {u.isAdmin ?
                                <Badge variant="outline" className="rounded-none border-primary text-primary bg-primary/10 font-mono text-[9px] uppercase px-1.5 py-0">SYS_ADMIN</Badge> :
                                <Badge variant="outline" className="rounded-none border-muted text-muted-foreground font-mono text-[9px] uppercase px-1.5 py-0">USER</Badge>
                              }
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right px-6">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px] font-mono uppercase border-border hover:border-primary hover:text-primary rounded-none gap-1"
                                  onClick={() => { setSelectedUserId(u.id); setIsDetailOpen(true); }}
                                  title="Lihat detail lengkap"
                                >
                                  <Eye className="w-3 h-3" />
                                  Detail
                                </Button>
                                {u.robloxUsername && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] font-mono uppercase border-orange-500/50 text-orange-500 hover:bg-orange-500 hover:text-white rounded-none gap-1"
                                    onClick={() => {
                                      if (confirm(`Reset akun Roblox "${u.robloxUsername}" dari user ${u.username}?`)) {
                                        resetRobloxMutation.mutate(u.id);
                                      }
                                    }}
                                    disabled={resetRobloxMutation.isPending}
                                    title="Hapus link Roblox"
                                  >
                                    <UserX className="w-3 h-3" />
                                    Roblox
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* LICENSES */}
          <TabsContent value="keys" className="mt-0">
            <div className="mb-3 flex gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari key / owner / module..."
                  className="pl-9 font-mono text-xs rounded-none border-border bg-background focus-visible:ring-0 focus-visible:border-primary h-9"
                  value={keySearch}
                  onChange={(e) => setKeySearch(e.target.value)}
                />
              </div>
            </div>
            <Card className="border-border bg-card shadow-none rounded-sm">
              <CardContent className="p-0">
                {isKeysLoading ? (
                  <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border bg-secondary/30">
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10 px-6">License String</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10">Module</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10">Owner</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10">Status</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10">HWID</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10">Expires</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10 text-right px-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(filteredKeys ?? []).map((k: any) => (
                          <TableRow key={k.id} className="border-border hover:bg-secondary/20 transition-colors">
                            <TableCell className="px-6">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[11px] text-foreground truncate max-w-[130px]" title={k.key}>{k.key}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 rounded-none hover:bg-primary/20 hover:text-primary shrink-0"
                                  onClick={() => {
                                    navigator.clipboard.writeText(k.key);
                                    setCopiedHwid(k.id + "-admin-key");
                                    setTimeout(() => setCopiedHwid(null), 1500);
                                  }}
                                  title="Copy license string"
                                >
                                  {copiedHwid === k.id + "-admin-key" ? <CheckCircle2 className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-foreground font-medium">{k.gameName}</TableCell>
                            <TableCell className="text-sm font-bold">
                              {k.userId ? <span className="text-foreground">{k.username}</span> : <span className="text-muted-foreground font-mono text-xs uppercase">Unassigned</span>}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`rounded-none font-mono text-[9px] uppercase px-1.5 py-0 border ${k.status === "active" ? "border-primary text-primary bg-primary/10" : k.status === "revoked" ? "border-destructive text-destructive bg-destructive/10" : "border-muted text-muted-foreground"}`}>
                                {k.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-[10px] text-muted-foreground">
                              {k.hwid ? (
                                <span title={k.hwid}>{k.hwid.substring(0, 6)}…</span>
                              ) : (
                                <span className="text-muted-foreground/40 uppercase text-[9px]">unbound</span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : "∞"}
                            </TableCell>
                            <TableCell className="text-right px-6">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px] font-mono uppercase border-border hover:border-primary hover:text-primary rounded-none gap-1"
                                  title="Key Settings"
                                  onClick={() => {
                                    setSelectedKeyForSettings(k);
                                    setKeySettingsForm({
                                      keyMaxAutoClaimKeys: k.keyMaxAutoClaimKeys != null ? String(k.keyMaxAutoClaimKeys) : "",
                                      keyMaxHwidPerKey: k.keyMaxHwidPerKey != null ? String(k.keyMaxHwidPerKey) : "",
                                      keyMaxRobloxPerKey: k.keyMaxRobloxPerKey != null ? String(k.keyMaxRobloxPerKey) : "",
                                      keyHwidResetLimit: k.keyHwidResetLimit != null ? String(k.keyHwidResetLimit) : "",
                                      keyHwidResetCooldownHours: k.keyHwidResetCooldownHours != null ? String(k.keyHwidResetCooldownHours) : "",
                                    });
                                    setIsKeySettingsOpen(true);
                                  }}
                                >
                                  <Settings className="w-3 h-3" />
                                </Button>
                                {k.hwid && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] font-mono uppercase border-border hover:border-primary hover:text-primary rounded-none gap-1"
                                    onClick={() => adminHwidResetMutation.mutate({ keyId: k.id })}
                                    disabled={adminHwidResetMutation.isPending}
                                    title="Reset HWID"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    HWID
                                  </Button>
                                )}
                                {k.status === "active" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] font-mono uppercase border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-none"
                                    onClick={() => handleRevoke(k.id)}
                                    disabled={revokeKey.isPending}
                                  >
                                    Revoke
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SETTINGS */}
          <TabsContent value="settings" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Key Defaults */}
              <Card className="border-border bg-card shadow-none rounded-sm">
                <CardHeader className="border-b border-border bg-secondary/30 py-4">
                  <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-primary" /> Default Key Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Key Prefix</Label>
                    <Input
                      className="rounded-none border-border bg-secondary/50 font-mono text-xs focus-visible:ring-0 focus-visible:border-primary h-9 uppercase"
                      placeholder="XIFIL"
                      value={settingsForm.keyPrefix}
                      onChange={(e) => setSettingsForm({ ...settingsForm, keyPrefix: e.target.value.toUpperCase() })}
                    />
                    <p className="text-[10px] text-muted-foreground font-mono">Generated keys: {settingsForm.keyPrefix || "XIFIL"}-XXXX-XXXX-XXXX-XXXX</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Default Duration (Days)</Label>
                    <Input
                      type="number"
                      className="rounded-none border-border bg-secondary/50 font-mono text-xs focus-visible:ring-0 focus-visible:border-primary h-9"
                      placeholder="Leave blank for LIFETIME"
                      value={settingsForm.defaultDurationDays}
                      onChange={(e) => setSettingsForm({ ...settingsForm, defaultDurationDays: e.target.value })}
                    />
                    <p className="text-[10px] text-muted-foreground font-mono">Applied when generating new keys</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Default Module</Label>
                    <select
                      className={selectClass}
                      value={settingsForm.defaultGameId}
                      onChange={(e) => setSettingsForm({ ...settingsForm, defaultGameId: e.target.value })}
                    >
                      <option value="">No default</option>
                      {games?.map((g: any) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* HWID Reset Settings */}
              <Card className="border-border bg-card shadow-none rounded-sm">
                <CardHeader className="border-b border-border bg-secondary/30 py-4">
                  <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-primary" /> HWID Reset Policy
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Max Self-Resets Per Key</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      className="rounded-none border-border bg-secondary/50 font-mono text-xs focus-visible:ring-0 focus-visible:border-primary h-9"
                      placeholder="1"
                      value={settingsForm.hwidResetLimit}
                      onChange={(e) => setSettingsForm({ ...settingsForm, hwidResetLimit: e.target.value })}
                    />
                    <p className="text-[10px] text-muted-foreground font-mono">0 = self-reset disabled. Admin can always reset.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Cooldown Between Resets (Hours)</Label>
                    <Input
                      type="number"
                      min="0"
                      className="rounded-none border-border bg-secondary/50 font-mono text-xs focus-visible:ring-0 focus-visible:border-primary h-9"
                      placeholder="168"
                      value={settingsForm.hwidResetCooldownHours}
                      onChange={(e) => setSettingsForm({ ...settingsForm, hwidResetCooldownHours: e.target.value })}
                    />
                    <p className="text-[10px] text-muted-foreground font-mono">168h = 7 days. 0 = no cooldown.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Whitelist Policy */}
              <Card className="border-border bg-card shadow-none rounded-sm">
                <CardHeader className="border-b border-border bg-secondary/30 py-4">
                  <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Whitelist Policy
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Max Auto-Claim Keys per User</Label>
                    <Input
                      type="number"
                      min="0"
                      className="rounded-none border-border bg-secondary/50 font-mono text-xs focus-visible:ring-0 focus-visible:border-primary h-9"
                      placeholder="1"
                      value={settingsForm.maxAutoClaimKeys}
                      onChange={(e) => setSettingsForm({ ...settingsForm, maxAutoClaimKeys: e.target.value })}
                    />
                    <p className="text-[10px] text-muted-foreground font-mono">Jumlah key yang bisa di-redeem otomatis oleh user yang di-whitelist.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Per-Key Limits */}
              <Card className="border-border bg-card shadow-none rounded-sm">
                <CardHeader className="border-b border-border bg-secondary/30 py-4">
                  <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-primary" /> Per-Key Limits
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Max HWID per Key</Label>
                    <Input
                      type="number"
                      min="1"
                      className="rounded-none border-border bg-secondary/50 font-mono text-xs focus-visible:ring-0 focus-visible:border-primary h-9"
                      placeholder="1"
                      value={settingsForm.maxHwidPerKey}
                      onChange={(e) => setSettingsForm({ ...settingsForm, maxHwidPerKey: e.target.value })}
                    />
                    <p className="text-[10px] text-muted-foreground font-mono">Jumlah HWID yang bisa terkait ke satu key.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Max Akun Roblox per Key</Label>
                    <Input
                      type="number"
                      min="1"
                      className="rounded-none border-border bg-secondary/50 font-mono text-xs focus-visible:ring-0 focus-visible:border-primary h-9"
                      placeholder="1"
                      value={settingsForm.maxRobloxPerKey}
                      onChange={(e) => setSettingsForm({ ...settingsForm, maxRobloxPerKey: e.target.value })}
                    />
                    <p className="text-[10px] text-muted-foreground font-mono">Jumlah akun Roblox yang bisa terkait ke satu key.</p>
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-2 flex justify-end">
                <Button
                  onClick={() => saveSettingsMutation.mutate(settingsForm)}
                  disabled={saveSettingsMutation.isPending}
                  className="rounded-none font-mono text-xs uppercase h-9 gap-2"
                >
                  {saveSettingsMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : settingsSaved ? <CheckCircle2 className="w-3 h-3" /> : null}
                  {settingsSaved ? "Saved!" : "Save Settings"}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* WHITELIST */}
          <TabsContent value="whitelist" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add form */}
              <Card className="border-border bg-card shadow-none rounded-sm">
                <CardHeader className="border-b border-border bg-secondary/30 py-4">
                  <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Tambah ke Whitelist
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* User search */}
                  <div className="space-y-2">
                    <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Cari User</Label>
                    <div className="relative">
                      {wlSelectedUser ? (
                        /* Selected user chip */
                        <div className="flex items-center gap-2 border border-primary bg-primary/10 px-3 h-9">
                          <img
                            src={wlSelectedUser.avatar ? `https://cdn.discordapp.com/avatars/${wlSelectedUser.discordId}/${wlSelectedUser.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/0.png`}
                            alt=""
                            className="w-5 h-5 rounded-full"
                          />
                          <span className="font-mono text-xs text-foreground flex-1 truncate">{wlSelectedUser.username}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{wlSelectedUser.discordId}</span>
                          <button
                            className="ml-1 text-muted-foreground hover:text-destructive text-xs font-mono leading-none"
                            onClick={() => { setWlSelectedUser(null); setWlInput({ ...wlInput, discordId: "" }); setWlSearchQuery(""); }}
                          >✕</button>
                        </div>
                      ) : (
                        <>
                          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                          <Input
                            className="pl-9 rounded-none border-border bg-secondary/50 font-mono text-xs focus-visible:ring-0 focus-visible:border-primary h-9"
                            placeholder="Username atau Discord ID..."
                            value={wlSearchQuery}
                            onChange={(e) => {
                              setWlSearchQuery(e.target.value);
                              setWlSearchOpen(true);
                              // If it looks like a raw Discord ID, also fill the input directly
                              if (/^\d{17,19}$/.test(e.target.value.trim())) {
                                setWlInput({ ...wlInput, discordId: e.target.value.trim() });
                              } else {
                                setWlInput({ ...wlInput, discordId: "" });
                              }
                            }}
                            onFocus={() => setWlSearchOpen(true)}
                            onBlur={() => setTimeout(() => setWlSearchOpen(false), 150)}
                          />
                          {/* Dropdown results */}
                          {wlSearchOpen && wlSearchResults && wlSearchResults.length > 0 && (
                            <div className="absolute z-50 top-full left-0 right-0 border border-border bg-background shadow-lg">
                              {wlSearchResults.map((u) => (
                                <button
                                  key={u.id}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-secondary/60 text-left transition-colors"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setWlSelectedUser(u);
                                    setWlInput({ ...wlInput, discordId: u.discordId });
                                    setWlSearchQuery("");
                                    setWlSearchOpen(false);
                                  }}
                                >
                                  <img
                                    src={u.avatar ? `https://cdn.discordapp.com/avatars/${u.discordId}/${u.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/0.png`}
                                    alt=""
                                    className="w-6 h-6 rounded-full border border-border"
                                  />
                                  <span className="font-bold text-xs text-foreground">{u.username}</span>
                                  <span className="font-mono text-[10px] text-muted-foreground ml-auto">{u.discordId}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {wlSearchOpen && wlSearchDebounced && wlSearchResults?.length === 0 && (
                            <div className="absolute z-50 top-full left-0 right-0 border border-border bg-background px-3 py-2">
                              <p className="font-mono text-[10px] text-muted-foreground">
                                {/^\d{17,19}$/.test(wlSearchQuery.trim()) ? "User belum login — Discord ID akan langsung dipakai." : "Tidak ada user yang cocok."}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono">Ketik username atau Discord ID (17–19 digit untuk input manual).</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Notes (opsional)</Label>
                    <Input
                      className="rounded-none border-border bg-secondary/50 font-mono text-xs focus-visible:ring-0 focus-visible:border-primary h-9"
                      placeholder="Nama / keterangan..."
                      value={wlInput.notes}
                      onChange={(e) => setWlInput({ ...wlInput, notes: e.target.value })}
                    />
                  </div>
                  {addWlMutation.isError && (
                    <p className="text-[10px] font-mono text-destructive bg-destructive/10 border border-destructive/20 px-2 py-1">
                      {(addWlMutation.error as Error).message}
                    </p>
                  )}
                  <Button
                    className="rounded-none font-mono text-xs uppercase h-9 w-full gap-2"
                    disabled={addWlMutation.isPending || !wlInput.discordId}
                    onClick={() => addWlMutation.mutate(wlInput)}
                  >
                    {addWlMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                    Tambah
                  </Button>
                </CardContent>
              </Card>

              {/* List */}
              <div className="lg:col-span-2">
                <Card className="border-border bg-card shadow-none rounded-sm">
                  <CardContent className="p-0">
                    {isWlLoading ? (
                      <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border bg-secondary/30">
                            <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10 px-6">Discord ID</TableHead>
                            <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10">Notes</TableHead>
                            <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10">Ditambah</TableHead>
                            <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10 text-right px-6">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(whitelist as any[] | undefined)?.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 font-mono text-xs text-muted-foreground">Whitelist kosong.</TableCell>
                            </TableRow>
                          )}
                          {(whitelist as any[] | undefined)?.map((w: any) => (
                            <TableRow key={w.id} className="border-border hover:bg-secondary/20">
                              <TableCell className="font-mono text-xs px-6">{w.discordId}</TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">{w.notes ?? "—"}</TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleDateString()}</TableCell>
                              <TableCell className="text-right px-6">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px] font-mono uppercase border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-none"
                                  onClick={() => { if (confirm(`Hapus ${w.discordId} dari whitelist?`)) removeWlMutation.mutate(w.id); }}
                                  disabled={removeWlMutation.isPending}
                                >
                                  Hapus
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* SINGLE GENERATE MODAL */}
      {isGenerateOpen && (
        <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
          <DialogContent className="border-border bg-background rounded-sm shadow-2xl p-0 overflow-hidden sm:max-w-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
            <DialogHeader className="p-6 pb-4 border-b border-border bg-secondary/30">
              <DialogTitle className="font-mono uppercase tracking-wider text-foreground">Instantiate Key</DialogTitle>
              <DialogDescription className="font-mono text-xs mt-2 text-muted-foreground">Configure payload parameters for new license generation.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleGenerate} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Target Module</Label>
                <select className={selectClass} value={formData.gameId} onChange={(e) => setFormData({ ...formData, gameId: e.target.value })} required>
                  <option value="">Select a module...</option>
                  {games?.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Operator UID (Optional)</Label>
                <Input type="number" className="rounded-none border-border bg-secondary/50 font-mono focus-visible:ring-0 focus-visible:border-primary h-10" placeholder="Leave blank for unassigned" value={formData.userId} onChange={(e) => setFormData({ ...formData, userId: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Duration / Days (Optional)</Label>
                <Input type="number" className="rounded-none border-border bg-secondary/50 font-mono focus-visible:ring-0 focus-visible:border-primary h-10" placeholder="Leave blank for lifetime" value={formData.days} onChange={(e) => setFormData({ ...formData, days: e.target.value })} />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" className="rounded-none font-mono text-xs uppercase border-border hover:bg-secondary h-9" onClick={() => setIsGenerateOpen(false)}>Abort</Button>
                <Button type="submit" className="rounded-none font-mono text-xs uppercase h-9" disabled={generateKey.isPending || !formData.gameId}>
                  {generateKey.isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />} Execute
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* BULK GENERATE MODAL */}
      {isBulkOpen && (
        <Dialog open={isBulkOpen} onOpenChange={(open) => { setIsBulkOpen(open); if (!open) setBulkResult(null); }}>
          <DialogContent className="border-border bg-background rounded-sm shadow-2xl p-0 overflow-hidden sm:max-w-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
            <DialogHeader className="p-6 pb-4 border-b border-border bg-secondary/30">
              <DialogTitle className="font-mono uppercase tracking-wider text-foreground">Bulk Generate Keys</DialogTitle>
              <DialogDescription className="font-mono text-xs mt-2 text-muted-foreground">Generate up to 500 unassigned keys at once.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleBulkGenerate} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Target Module</Label>
                <select className={selectClass} value={bulkData.gameId} onChange={(e) => setBulkData({ ...bulkData, gameId: e.target.value })} required>
                  <option value="">Select a module...</option>
                  {games?.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Quantity (max 500)</Label>
                <Input type="number" min="1" max="500" className="rounded-none border-border bg-secondary/50 font-mono focus-visible:ring-0 focus-visible:border-primary h-10" value={bulkData.count} onChange={(e) => setBulkData({ ...bulkData, count: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Duration / Days (Optional)</Label>
                <Input type="number" className="rounded-none border-border bg-secondary/50 font-mono focus-visible:ring-0 focus-visible:border-primary h-10" placeholder="Leave blank for lifetime" value={bulkData.days} onChange={(e) => setBulkData({ ...bulkData, days: e.target.value })} />
              </div>
              {bulkResult && (
                <div className="flex items-center gap-2 text-primary bg-primary/10 border border-primary/20 px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <p className="text-xs font-mono">{bulkResult.count} keys generated successfully!</p>
                </div>
              )}
              {bulkGenerateMutation.isError && (
                <div className="text-xs font-mono text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2">
                  {(bulkGenerateMutation.error as Error).message}
                </div>
              )}
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" className="rounded-none font-mono text-xs uppercase border-border hover:bg-secondary h-9" onClick={() => setIsBulkOpen(false)}>Close</Button>
                <Button type="submit" className="rounded-none font-mono text-xs uppercase h-9" disabled={bulkGenerateMutation.isPending || !bulkData.gameId}>
                  {bulkGenerateMutation.isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                  Generate {bulkData.count || 0} Keys
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* KEY SETTINGS MODAL */}
      {isKeySettingsOpen && selectedKeyForSettings && (
        <Dialog open={isKeySettingsOpen} onOpenChange={(open) => { setIsKeySettingsOpen(open); if (!open) setSelectedKeyForSettings(null); }}>
          <DialogContent className="border-border bg-background rounded-sm shadow-2xl p-0 overflow-hidden sm:max-w-md">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
            <DialogHeader className="p-6 pb-4 border-b border-border bg-secondary/30">
              <DialogTitle className="font-mono uppercase tracking-wider text-foreground flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" /> Key Settings
              </DialogTitle>
              <DialogDescription className="font-mono text-xs mt-1 text-muted-foreground truncate">
                {selectedKeyForSettings.key}
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-4">
              <p className="font-mono text-[10px] text-muted-foreground bg-secondary/40 border border-border px-3 py-2">
                Kosongkan field untuk menggunakan nilai global dari Settings. Override hanya berlaku untuk key ini.
              </p>

              <div className="space-y-1.5">
                <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Max Auto-Claim Keys</Label>
                <Input
                  type="number" min="0"
                  className="rounded-none border-border bg-secondary/50 font-mono text-xs focus-visible:ring-0 focus-visible:border-primary h-9"
                  placeholder="Global default"
                  value={keySettingsForm.keyMaxAutoClaimKeys}
                  onChange={(e) => setKeySettingsForm({ ...keySettingsForm, keyMaxAutoClaimKeys: e.target.value })}
                />
                <p className="text-[10px] text-muted-foreground font-mono">Jumlah key yang bisa di-klaim otomatis oleh pemilik key ini.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Max HWID per Key</Label>
                <Input
                  type="number" min="1"
                  className="rounded-none border-border bg-secondary/50 font-mono text-xs focus-visible:ring-0 focus-visible:border-primary h-9"
                  placeholder="Global default"
                  value={keySettingsForm.keyMaxHwidPerKey}
                  onChange={(e) => setKeySettingsForm({ ...keySettingsForm, keyMaxHwidPerKey: e.target.value })}
                />
                <p className="text-[10px] text-muted-foreground font-mono">Jumlah HWID yang bisa terkait ke key ini.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Max Akun Roblox per Key</Label>
                <Input
                  type="number" min="1"
                  className="rounded-none border-border bg-secondary/50 font-mono text-xs focus-visible:ring-0 focus-visible:border-primary h-9"
                  placeholder="Global default"
                  value={keySettingsForm.keyMaxRobloxPerKey}
                  onChange={(e) => setKeySettingsForm({ ...keySettingsForm, keyMaxRobloxPerKey: e.target.value })}
                />
                <p className="text-[10px] text-muted-foreground font-mono">Jumlah akun Roblox yang bisa terkait ke key ini.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Max Self-Reset HWID</Label>
                <Input
                  type="number" min="0"
                  className="rounded-none border-border bg-secondary/50 font-mono text-xs focus-visible:ring-0 focus-visible:border-primary h-9"
                  placeholder="Global default"
                  value={keySettingsForm.keyHwidResetLimit}
                  onChange={(e) => setKeySettingsForm({ ...keySettingsForm, keyHwidResetLimit: e.target.value })}
                />
                <p className="text-[10px] text-muted-foreground font-mono">Jumlah reset HWID mandiri yang diizinkan untuk key ini.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">Cooldown Reset HWID (Jam)</Label>
                <Input
                  type="number" min="0"
                  className="rounded-none border-border bg-secondary/50 font-mono text-xs focus-visible:ring-0 focus-visible:border-primary h-9"
                  placeholder="Global default"
                  value={keySettingsForm.keyHwidResetCooldownHours}
                  onChange={(e) => setKeySettingsForm({ ...keySettingsForm, keyHwidResetCooldownHours: e.target.value })}
                />
                <p className="text-[10px] text-muted-foreground font-mono">Waktu tunggu antar reset HWID (jam). 168 = 7 hari.</p>
              </div>

              {keySettingsMutation.isError && (
                <p className="text-[10px] font-mono text-destructive bg-destructive/10 border border-destructive/20 px-2 py-1">
                  {(keySettingsMutation.error as Error).message}
                </p>
              )}
            </div>
            <DialogFooter className="p-4 border-t border-border bg-secondary/20 flex justify-between gap-2">
              <Button
                variant="outline"
                className="rounded-none font-mono text-xs uppercase border-border hover:bg-secondary h-9"
                onClick={() => {
                  // Reset all to null (clear per-key overrides)
                  keySettingsMutation.mutate({
                    keyId: selectedKeyForSettings.id,
                    settings: {
                      keyMaxAutoClaimKeys: null,
                      keyMaxHwidPerKey: null,
                      keyMaxRobloxPerKey: null,
                      keyHwidResetLimit: null,
                      keyHwidResetCooldownHours: null,
                    },
                  });
                }}
                disabled={keySettingsMutation.isPending}
              >
                Reset ke Global
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="rounded-none font-mono text-xs uppercase border-border hover:bg-secondary h-9"
                  onClick={() => setIsKeySettingsOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  className="rounded-none font-mono text-xs uppercase h-9 gap-2"
                  disabled={keySettingsMutation.isPending}
                  onClick={() => {
                    const parse = (v: string) => v.trim() === "" ? null : Math.max(0, parseInt(v));
                    keySettingsMutation.mutate({
                      keyId: selectedKeyForSettings.id,
                      settings: {
                        keyMaxAutoClaimKeys: parse(keySettingsForm.keyMaxAutoClaimKeys),
                        keyMaxHwidPerKey: keySettingsForm.keyMaxHwidPerKey.trim() === "" ? null : Math.max(1, parseInt(keySettingsForm.keyMaxHwidPerKey)),
                        keyMaxRobloxPerKey: keySettingsForm.keyMaxRobloxPerKey.trim() === "" ? null : Math.max(1, parseInt(keySettingsForm.keyMaxRobloxPerKey)),
                        keyHwidResetLimit: parse(keySettingsForm.keyHwidResetLimit),
                        keyHwidResetCooldownHours: parse(keySettingsForm.keyHwidResetCooldownHours),
                      },
                    });
                  }}
                >
                  {keySettingsMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Simpan
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* USER DETAIL MODAL */}
      <Dialog open={isDetailOpen} onOpenChange={(open) => { setIsDetailOpen(open); if (!open) setSelectedUserId(null); }}>
        <DialogContent className="border-border bg-background rounded-sm shadow-2xl p-0 overflow-hidden sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
          <DialogHeader className="p-6 pb-4 border-b border-border bg-secondary/30">
            <DialogTitle className="font-mono uppercase tracking-wider text-foreground flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" /> User Detail
            </DialogTitle>
            <DialogDescription className="font-mono text-xs mt-1 text-muted-foreground">
              Informasi lengkap operator — identitas, Roblox, dan semua lisensi.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-6">
            {isDetailLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>
            ) : userDetail ? (
              <>
                {/* Identity */}
                <div className="space-y-3">
                  <p className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider border-b border-border pb-1">Discord Identity</p>
                  <div className="flex items-center gap-3">
                    <img
                      src={userDetail.avatar ? `https://cdn.discordapp.com/avatars/${userDetail.discordId}/${userDetail.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/0.png`}
                      alt=""
                      className="w-10 h-10 border border-border"
                    />
                    <div>
                      <p className="font-bold text-foreground">{userDetail.username}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">Discord ID: {userDetail.discordId}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">Bergabung: {new Date(userDetail.createdAt).toLocaleString()}</p>
                    </div>
                    {userDetail.isAdmin && (
                      <Badge variant="outline" className="ml-auto rounded-none border-primary text-primary bg-primary/10 font-mono text-[9px] uppercase px-1.5 py-0">SYS_ADMIN</Badge>
                    )}
                  </div>
                </div>

                {/* Roblox */}
                <div className="space-y-3">
                  <p className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider border-b border-border pb-1">Roblox Account</p>
                  {userDetail.robloxUsername ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-sm text-foreground">{userDetail.robloxUsername}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">Roblox ID: {userDetail.robloxId ?? "—"}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] font-mono uppercase border-orange-500/50 text-orange-500 hover:bg-orange-500 hover:text-white rounded-none gap-1"
                        onClick={() => {
                          if (confirm(`Reset akun Roblox "${userDetail.robloxUsername}"?`)) {
                            resetRobloxMutation.mutate(userDetail.id);
                          }
                        }}
                        disabled={resetRobloxMutation.isPending}
                      >
                        <UserX className="w-3 h-3" /> Reset Roblox
                      </Button>
                    </div>
                  ) : (
                    <p className="font-mono text-xs text-muted-foreground/50 uppercase">Belum terhubung</p>
                  )}
                  {/* Admin set Roblox */}
                  <div className="pt-2 border-t border-border/50 space-y-1.5">
                    <p className="font-mono text-[9px] uppercase text-muted-foreground tracking-wider">Set / Ganti Roblox (Admin)</p>
                    <div className="flex gap-2">
                      <Input
                        className="rounded-none border-border bg-secondary/50 font-mono text-xs focus-visible:ring-0 focus-visible:border-primary h-8 flex-1"
                        placeholder="Roblox username..."
                        value={setRobloxInput}
                        onChange={(e) => { setSetRobloxInput(e.target.value); setSetRobloxError(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter" && setRobloxInput.trim()) setRobloxMutation.mutate({ userId: userDetail.id, robloxUsername: setRobloxInput.trim() }); }}
                      />
                      <Button
                        size="sm"
                        className="rounded-none font-mono text-xs uppercase h-8 shrink-0"
                        disabled={setRobloxMutation.isPending || !setRobloxInput.trim()}
                        onClick={() => setRobloxMutation.mutate({ userId: userDetail.id, robloxUsername: setRobloxInput.trim() })}
                      >
                        {setRobloxMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Set"}
                      </Button>
                    </div>
                    {setRobloxError && <p className="text-[10px] font-mono text-destructive">{setRobloxError}</p>}
                    {setRobloxMutation.isSuccess && <p className="text-[10px] font-mono text-primary">✓ Berhasil diperbarui</p>}
                  </div>
                </div>

                {/* Keys */}
                <div className="space-y-3">
                  <p className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider border-b border-border pb-1">
                    Lisensi ({userDetail.keys?.length ?? 0})
                  </p>
                  {userDetail.keys?.length === 0 ? (
                    <p className="font-mono text-xs text-muted-foreground/50 uppercase">Tidak ada lisensi</p>
                  ) : (
                    <div className="space-y-2">
                      {userDetail.keys?.map((k: any) => (
                        <div key={k.id} className="border border-border bg-secondary/20 p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[11px] text-foreground truncate">{k.key}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-none hover:bg-primary/20 hover:text-primary"
                                onClick={() => {
                                  navigator.clipboard.writeText(k.key);
                                  setCopiedHwid(k.id + "-key");
                                  setTimeout(() => setCopiedHwid(null), 1500);
                                }}
                                title="Copy license string"
                              >
                                {copiedHwid === k.id + "-key" ? <CheckCircle2 className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                              </Button>
                              <Badge variant="outline" className={`rounded-none font-mono text-[9px] uppercase px-1.5 py-0 border ${k.status === "active" ? "border-primary text-primary bg-primary/10" : k.status === "revoked" ? "border-destructive text-destructive bg-destructive/10" : "border-muted text-muted-foreground"}`}>
                                {k.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono text-muted-foreground">
                            <span>Module: <span className="text-foreground">{k.gameName ?? "—"}</span></span>
                            <span>Expires: <span className="text-foreground">{k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : "∞"}</span></span>
                            <span>HWID Resets: <span className="text-foreground">{k.hwidResetCount}</span></span>
                            <span>Claimed: <span className="text-foreground">{new Date(k.createdAt).toLocaleDateString()}</span></span>
                          </div>
                          {/* HWID */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[9px] uppercase text-muted-foreground shrink-0">HWID:</span>
                              {k.hwid ? (
                                <span className="font-mono text-[10px] text-foreground truncate" title={k.hwid}>{k.hwid}</span>
                              ) : (
                                <span className="font-mono text-[9px] text-muted-foreground/50 uppercase">unbound</span>
                              )}
                            </div>
                            {k.hwid && (
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 rounded-none hover:bg-primary/20 hover:text-primary"
                                  onClick={() => {
                                    navigator.clipboard.writeText(k.hwid);
                                    setCopiedHwid(k.id + "-hwid");
                                    setTimeout(() => setCopiedHwid(null), 1500);
                                  }}
                                  title="Copy HWID"
                                >
                                  {copiedHwid === k.id + "-hwid" ? <CheckCircle2 className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[9px] font-mono uppercase border-border hover:border-primary hover:text-primary rounded-none gap-1 px-2"
                                  onClick={() => {
                                    if (confirm("Reset HWID key ini?")) {
                                      adminHwidResetMutation.mutate({ keyId: k.id });
                                    }
                                  }}
                                  disabled={adminHwidResetMutation.isPending}
                                  title="Reset HWID"
                                >
                                  <RotateCcw className="w-3 h-3" /> Reset HWID
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[9px] font-mono uppercase border-orange-500/50 text-orange-500 hover:bg-orange-500 hover:text-white rounded-none gap-1 px-2"
                                  onClick={() => {
                                    if (confirm("Reset HWID + hapus link Roblox pemilik key ini?")) {
                                      adminHwidResetMutation.mutate({ keyId: k.id, clearRoblox: true });
                                    }
                                  }}
                                  disabled={adminHwidResetMutation.isPending}
                                  title="Reset HWID + Roblox"
                                >
                                  <UserX className="w-3 h-3" /> +Roblox
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
          <div className="p-4 border-t border-border bg-secondary/20 flex justify-end">
            <Button variant="outline" className="rounded-none font-mono text-xs uppercase border-border hover:bg-secondary h-9" onClick={() => setIsDetailOpen(false)}>
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
