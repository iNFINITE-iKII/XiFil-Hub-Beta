import React, { useState } from "react";
import { Redirect } from "wouter";
import { useGetMe, useListMyKeys, getListMyKeysQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, Search, KeyRound } from "lucide-react";

export default function KeysPage() {
  const { data: user, isLoading: isUserLoading, error: userError } = useGetMe();
  const { data: keys, isLoading: isKeysLoading } = useListMyKeys({ query: { enabled: !!user, queryKey: getListMyKeysQueryKey() } });
  const [search, setSearch] = useState("");

  if (isUserLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary"><Loader2 className="animate-spin w-8 h-8" /></div>;
  if (userError || !user) return <Redirect to="/" />;

  const filteredKeys = keys?.filter(k => 
    k.key.toLowerCase().includes(search.toLowerCase()) || 
    (k.gameName && k.gameName.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const maskHwid = (hwid: string | null | undefined) => {
    if (!hwid) return "Not bound";
    if (hwid.length <= 8) return hwid;
    return `${hwid.substring(0, 4)}...${hwid.substring(hwid.length - 4)}`;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-mono tracking-tight mb-2">License Management</h1>
            <p className="text-muted-foreground">View and manage all your purchased keys.</p>
          </div>
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Search keys or games..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              All Keys
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isKeysLoading ? (
              <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
            ) : filteredKeys.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-md">
                No keys found matching your criteria.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>License Key</TableHead>
                    <TableHead>Game</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>HWID</TableHead>
                    <TableHead>Expiration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-background px-2 py-1 rounded text-xs font-mono border border-border">
                            {key.key}
                          </code>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(key.key)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{key.gameName || `Game #${key.gameId}`}</TableCell>
                      <TableCell>
                        <Badge variant={key.status === 'active' ? 'success' : key.status === 'revoked' ? 'destructive' : 'secondary'}>
                          {key.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {maskHwid(key.hwid)}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {key.expiresAt ? new Date(key.expiresAt).toLocaleString() : 'Lifetime'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}