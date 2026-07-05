import React from "react";
import { Redirect } from "wouter";
import { useGetMe, useListMyKeys, getListMyKeysQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, KeyRound, Activity, AlertCircle, Loader2, Database, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: user, isLoading: isUserLoading, error: userError } = useGetMe();
  const { data: keys, isLoading: isKeysLoading } = useListMyKeys({ query: { enabled: !!user, queryKey: getListMyKeysQueryKey() } });
  
  if (isUserLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary"><Loader2 className="animate-spin w-8 h-8" /></div>;
  if (userError || !user) return <Redirect to="/" />;

  const activeKeys = keys?.filter(k => k.status === 'active') || [];
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <AppLayout>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
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
                    {keys.slice(0, 5).map((key) => (
                      <TableRow key={key.id} className="border-border/50 hover:bg-secondary/30 transition-colors">
                        <TableCell className="font-medium text-sm">{key.gameName || `Module_#${key.gameId}`}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-background px-2 py-1 text-xs font-mono border border-border text-muted-foreground selection:bg-primary selection:text-primary-foreground">
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
                              key.status === 'active' ? 'border-primary text-primary bg-primary/10' : 
                              key.status === 'revoked' ? 'border-destructive text-destructive bg-destructive/10' : 
                              'border-muted text-muted-foreground'
                            }`}
                          >
                            {key.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs text-right">
                          {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : 'LIFETIME'}
                        </TableCell>
                      </TableRow>
                    ))}
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