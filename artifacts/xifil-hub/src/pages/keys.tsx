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
import { motion } from "framer-motion";

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
    if (!hwid) return "UNBOUND";
    if (hwid.length <= 8) return hwid;
    return `${hwid.substring(0, 4)}...${hwid.substring(hwid.length - 4)}`;
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
          
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Search keys or modules..." 
              className="pl-9 font-mono text-xs rounded-none border-border bg-background focus-visible:ring-primary focus-visible:border-primary h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

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
              <div className="py-20 text-center text-muted-foreground flex flex-col items-center">
                <p className="font-mono text-sm uppercase text-foreground mb-1">Zero Results</p>
                <p className="font-mono text-xs">No keys found matching query parameters.</p>
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
                      <TableHead className="font-mono text-[10px] uppercase tracking-wider h-10 text-right px-6">Expiration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredKeys.map((key) => (
                      <TableRow key={key.id} className="border-border hover:bg-secondary/30 transition-colors">
                        <TableCell className="px-6">
                          <div className="flex items-center gap-2">
                            <code className="bg-background px-2 py-1 text-xs font-mono border border-border text-foreground selection:bg-primary selection:text-primary-foreground max-w-[150px] md:max-w-none truncate">
                              {key.key}
                            </code>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-none hover:bg-primary/20 hover:text-primary shrink-0" onClick={() => copyToClipboard(key.key)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-sm text-foreground">{key.gameName || `Module_#${key.gameId}`}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`rounded-none font-mono text-[9px] uppercase px-1.5 py-0 border ${
                              key.status === 'active' ? 'border-primary text-primary bg-primary/10' : 
                              key.status === 'revoked' ? 'border-destructive text-destructive bg-destructive/10' : 
                              'border-muted text-muted-foreground'
                            }`}
                          >
                            {key.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground tracking-wider">
                          {maskHwid(key.hwid)}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs text-right px-6">
                          {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : 'LIFETIME'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AppLayout>
  );
}