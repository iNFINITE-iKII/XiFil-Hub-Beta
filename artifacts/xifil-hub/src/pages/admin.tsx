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
import { Loader2, ShieldAlert, Users, KeyRound, Activity, Terminal, Download, Layers, RotateCcw, Settings, CheckCircle2 } from "lucide-react";
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
  const [settingsForm, setSettingsForm] = useState({
    defaultDurationDays: "",
    defaultGameId: "",
    hwidResetLimit: "1",
    hwidResetCooldownHours: "168",
    keyPrefix: "XIFIL",
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
      });
    }
  }, [settings]);

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
    mutationFn: async (keyId: number) => {
      const res = await fetch(apiUrl(`/api/keys/${keyId}/reset-hwid`), {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListAdminKeysQueryKey() });
    },
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
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10 text-right px-6">Init Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users?.map((u: any) => (
                          <TableRow key={u.id} className="border-border hover:bg-secondary/20 transition-colors">
                            <TableCell className="font-mono text-xs text-muted-foreground px-6">{String(u.id).padStart(4, "0")}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <img src={u.avatar ? `https://cdn.discordapp.com/avatars/${u.discordId}/${u.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/0.png`} alt="" className="w-6 h-6 border border-border grayscale hover:grayscale-0 transition-all" />
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
                            <TableCell className="text-xs font-mono text-muted-foreground text-right px-6">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
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
                        {keys?.map((k: any) => (
                          <TableRow key={k.id} className="border-border hover:bg-secondary/20 transition-colors">
                            <TableCell className="font-mono text-[11px] text-foreground max-w-[150px] truncate px-6" title={k.key}>{k.key}</TableCell>
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
                                {k.hwid && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] font-mono uppercase border-border hover:border-primary hover:text-primary rounded-none gap-1"
                                    onClick={() => adminHwidResetMutation.mutate(k.id)}
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
    </AppLayout>
  );
}
