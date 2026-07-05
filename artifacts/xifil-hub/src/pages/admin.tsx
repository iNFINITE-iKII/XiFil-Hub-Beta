import React, { useState } from "react";
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
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, ShieldAlert, Users, KeyRound, Gamepad2, AlertTriangle } from "lucide-react";

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { data: user, isLoading: isUserLoading } = useGetMe();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [formData, setFormData] = useState({ gameId: "", userId: "", days: "" });
  
  const { data: stats, isLoading: isStatsLoading } = useGetAdminStats({ query: { enabled: !!user?.isAdmin, queryKey: getGetAdminStatsQueryKey() } });
  const { data: users, isLoading: isUsersLoading } = useListAdminUsers({ query: { enabled: !!user?.isAdmin && activeTab === 'users', queryKey: getListAdminUsersQueryKey() } });
  const { data: keys, isLoading: isKeysLoading } = useListAdminKeys({ query: { enabled: !!user?.isAdmin && activeTab === 'keys', queryKey: getListAdminKeysQueryKey() } });
  const { data: games } = useListGames({ query: { enabled: !!user?.isAdmin, queryKey: getListGamesQueryKey() } });

  const generateKey = useGenerateKey();
  const revokeKey = useRevokeKey();

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

    generateKey.mutate({
      data: {
        gameId: parseInt(formData.gameId),
        userId: formData.userId ? parseInt(formData.userId) : null,
        expiresAt
      }
    }, {
      onSuccess: () => {
        setIsGenerateOpen(false);
        setFormData({ gameId: "", userId: "", days: "" });
        queryClient.invalidateQueries({ queryKey: getListAdminKeysQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      }
    });
  };

  const handleRevoke = (id: number) => {
    if (confirm("Are you sure you want to revoke this key?")) {
      revokeKey.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAdminKeysQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        }
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-mono tracking-tight text-destructive flex items-center gap-3">
              <ShieldAlert className="w-8 h-8" /> System Admin
            </h1>
            <p className="text-muted-foreground">Elevated access: Manage users, keys, and hub statistics.</p>
          </div>
          {activeTab === 'keys' && (
            <Button onClick={() => setIsGenerateOpen(true)} className="font-mono">
              + Generate Key
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="keys">Keys</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {isStatsLoading ? (
              <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold font-mono">{stats?.totalUsers || 0}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
                    <KeyRound className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold font-mono">{stats?.totalKeys || 0}</div></CardContent>
                </Card>
                <Card className="border-primary/30">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-primary">Active Keys</CardTitle>
                    <ActivityIcon className="w-4 h-4 text-primary" />
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold font-mono text-primary">{stats?.activeKeys || 0}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Games</CardTitle>
                    <Gamepad2 className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold font-mono">{stats?.totalGames || 0}</div></CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardContent className="p-0">
                {isUsersLoading ? (
                  <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Discord User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users?.map(u => (
                        <TableRow key={u.id}>
                          <TableCell className="font-mono text-xs">{u.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <img src={u.avatar ? `https://cdn.discordapp.com/avatars/${u.discordId}/${u.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/0.png`} alt="" className="w-6 h-6 rounded-full" />
                              {u.username} <span className="text-xs text-muted-foreground">({u.discordId})</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {u.isAdmin ? <Badge variant="destructive">Admin</Badge> : <Badge variant="secondary">User</Badge>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keys">
            <Card>
              <CardContent className="p-0">
                {isKeysLoading ? (
                  <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Key</TableHead>
                        <TableHead>Game</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {keys?.map(k => (
                        <TableRow key={k.id}>
                          <TableCell className="font-mono text-xs max-w-[150px] truncate" title={k.key}>{k.key}</TableCell>
                          <TableCell className="text-sm">{k.gameName}</TableCell>
                          <TableCell className="text-sm">
                            {k.userId ? <span className="text-primary">{k.username}</span> : <span className="text-muted-foreground italic">Unassigned</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant={k.status === 'active' ? 'success' : k.status === 'revoked' ? 'destructive' : 'secondary'}>{k.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {k.status === 'active' && (
                              <Button variant="destructive" size="sm" onClick={() => handleRevoke(k.id)} disabled={revokeKey.isPending}>
                                Revoke
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {isGenerateOpen && (
        <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
          <DialogHeader>
            <DialogTitle>Generate New Key</DialogTitle>
            <DialogDescription>Create a new license key. It can be unassigned or assigned directly to a user.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGenerate} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Game</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                value={formData.gameId} 
                onChange={e => setFormData({...formData, gameId: e.target.value})}
                required
              >
                <option value="">Select a game...</option>
                {games?.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Assign to User ID (Optional)</Label>
              <Input 
                type="number" 
                placeholder="Leave blank for unassigned" 
                value={formData.userId}
                onChange={e => setFormData({...formData, userId: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration in Days (Optional)</Label>
              <Input 
                type="number" 
                placeholder="Leave blank for lifetime" 
                value={formData.days}
                onChange={e => setFormData({...formData, days: e.target.value})}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsGenerateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={generateKey.isPending || !formData.gameId}>
                {generateKey.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      )}
    </AppLayout>
  );
}

function ActivityIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
  );
}