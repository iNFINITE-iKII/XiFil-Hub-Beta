import React from "react";
import { Redirect } from "wouter";
import { useGetMe, useListMyKeys, getListMyKeysQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, KeyRound, Activity, AlertCircle, Loader2, Database, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: user, isLoading: isUserLoading, error: userError } = useGetMe();
  const { data: keys, isLoading: isKeysLoading } = useListMyKeys({ query: { enabled: !!user, queryKey: getListMyKeysQueryKey() } });

  if (isUserLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary"><Loader2 className="animate-spin w-8 h-8" /></div>;
  if (userError || !user) return <Redirect to="/" />;

  const activeKeys = keys?.filter(k => k.status === "active") || [];

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const getExpiryStatus = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return { label: "EXPIRED", level: "danger" };
    if (days <= 3) return { label: `Expires in ${days}d`, level: "warn" };
    return null;
  };

  const expiringKeys = keys?.filter(k => {
    if (!k.expiresAt || k.status !== "active") return false;
    const diff = new Date(k.expiresAt).getTime() - Date.now();
    return diff < 3 * 24 * 60 * 60 * 1000;
  }) || [];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

  return (
    <AppLayout>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-primary"></div>
              <h1 className="text-3xl font-bold font-mono tracking-tight text-foreground uppercase">Overview</h1>
            </div>
            <p className="text-sm text-muted-foreground font-mono">Welcome back, Operator <span className="text-primary">{user.username}</span></p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono bg-secondary px-3 py-1.5 border border-border">
            <span className="text-muted-foreground">SYS_STATUS:</span>
            <span className="text-primary flex items-center gap-1"><Activity className="w-3 h-3" /> OPTIMAL</span>
          </div>
        </motion.div>

        {/* Expiry Warning Banner */}
        {expiringKeys.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-mono font-bold text-yellow-500 uppercase tracking-wider mb-1">License Expiry Warning</p>
                <p className="text-xs font-mono text-muted-foreground">
                  {expiringKeys.length === 1
                    ? `"${expiringKeys[0].gameName || `Module_#${expiringKeys[0].gameId}`}" key expires soon.`
                    : `${expiringKeys.length} keys are expiring soon.`}
                  {" "}Contact admin to renew.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-border bg-card shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Total Entitlements</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-foreground">{keys?.length || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5 shadow-none relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-6">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-primary">Active Licenses</CardTitle>
              <ShieldCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pl-6">
              <div className="text-3xl font-bold font-mono text-primary">{activeKeys.length}</div>
            </CardContent>
          </Card>

          {/* Roblox Link Status Card */}
          <Card className="border-border bg-card shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Roblox Account</CardTitle>
              <KeyRound className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {(user as any).robloxUsername ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-mono font-bold text-foreground">{(user as any).robloxUsername}</span>
                </div>
              ) : (
                <a href="/profile" className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline uppercase">
                  Not linked → Link account
                </a>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold font-mono tracking-widest uppercase text-muted-foreground">Recent Activity Logs</h2>
          </div>
          <Card className="border-border shadow-none rounded-sm overflow-hidden">
            {isKeysLoading ? (
              <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>
            ) : !keys || keys.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-center bg-secondary/30">
                <AlertCircle className="w-8 h-8 text-muted-foreground mb-4 opacity-50" />
                <p className="text-sm font-mono mb-1 text-foreground">NO RECORDS FOUND</p>
                <p className="text-xs text-muted-foreground font-mono">You don't own any active script keys yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/50">
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="font-mono text-xs uppercase tracking-wider h-10">Target Module</TableHead>
                      <TableHead className="font-mono text-xs uppercase tracking-wider h-10">License Key</TableHead>
                      <TableHead className="font-mono text-xs uppercase tracking-wider h-10">Status</TableHead>
                      <TableHead className="font-mono text-xs uppercase tracking-wider h-10 text-right">Expiration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.slice(0, 5).map((key) => {
                      const expiry = getExpiryStatus(key.expiresAt);
                      return (
                        <TableRow key={key.id} className="border-border/50 hover:bg-secondary/30 transition-colors">
                          <TableCell className="font-medium text-sm">{key.gameName || `Module_#${key.gameId}`}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="bg-background px-2 py-1 text-xs font-mono border border-border text-muted-foreground">
                                {key.key.substring(0, 8)}...{key.key.substring(key.key.length - 4)}
                              </code>
                              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-primary/20 hover:text-primary rounded-none" onClick={() => copyToClipboard(key.key)}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`rounded-none font-mono text-[10px] uppercase px-2 py-0 border ${
                                key.status === "active" ? "border-primary text-primary bg-primary/10" :
                                key.status === "revoked" ? "border-destructive text-destructive bg-destructive/10" :
                                "border-muted text-muted-foreground"
                              }`}
                            >
                              {key.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-muted-foreground font-mono text-xs">
                                {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : "LIFETIME"}
                              </span>
                              {expiry && (
                                <span className={`font-mono text-[9px] uppercase ${expiry.level === "danger" ? "text-destructive" : "text-yellow-500"}`}>
                                  ⚠ {expiry.label}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}
