import React from "react";
import { Redirect } from "wouter";
import { useGetMe, useListMyKeys, getGetMeQueryKey, getListMyKeysQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, KeyRound, Activity, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { data: user, isLoading: isUserLoading, error: userError } = useGetMe();
  const { data: keys, isLoading: isKeysLoading } = useListMyKeys({ query: { enabled: !!user, queryKey: getListMyKeysQueryKey() } });
  
  if (isUserLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary"><Loader2 className="animate-spin w-8 h-8" /></div>;
  if (userError || !user) return <Redirect to="/" />;

  const activeKeys = keys?.filter(k => k.status === 'active') || [];
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Custom mini toast implementation would go here, omitting for brevity
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight text-white mb-2">Welcome Back, {user.username}</h1>
          <p className="text-muted-foreground">Access your active licenses and execution scripts.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Keys</CardTitle>
              <KeyRound className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">{keys?.length || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="border-green-500/20 bg-green-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Licenses</CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-green-400">{activeKeys.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold font-mono tracking-tight">Recent Licenses</h2>
          <Card>
            {isKeysLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
            ) : !keys || keys.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-lg font-mono mb-2">No licenses found</p>
                <p className="text-sm text-muted-foreground">You don't own any active script keys yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Game</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.slice(0, 5).map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.gameName || `Game #${key.gameId}`}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-xs font-mono border border-border">
                            {key.key.substring(0, 8)}...{key.key.substring(key.key.length - 4)}
                          </code>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(key.key)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={key.status === 'active' ? 'success' : key.status === 'revoked' ? 'destructive' : 'secondary'}>
                          {key.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : 'Never'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}