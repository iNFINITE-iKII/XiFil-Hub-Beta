import React from "react";
import { Redirect, useParams, Link } from "wouter";
import { useGetMe, useGetGame, useListMyKeys, getGetGameQueryKey, getListMyKeysQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, AlertTriangle, KeyRound, ChevronLeft, Terminal } from "lucide-react";
import { motion } from "framer-motion";

export default function ScriptDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: user, isLoading: isUserLoading, error: userError } = useGetMe();
  
  // Guard early returns before using the query to satisfy hook rules
  const { data: game, isLoading: isGameLoading, error: gameError } = useGetGame(slug || "", { 
    query: { enabled: !!user && !!slug, queryKey: getGetGameQueryKey(slug || "") } 
  });
  
  const { data: keys, isLoading: isKeysLoading } = useListMyKeys({ 
    query: { enabled: !!user, queryKey: getListMyKeysQueryKey() } 
  });

  if (isUserLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary"><Loader2 className="animate-spin w-8 h-8" /></div>;
  if (userError || !user) return <Redirect to="/" />;
  
  if (isGameLoading) return <AppLayout><div className="flex justify-center p-20"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div></AppLayout>;
  if (gameError || !game) return <AppLayout><div className="p-12 text-center text-destructive font-mono uppercase tracking-widest border border-destructive/20 bg-destructive/5 m-8">Failed to locate script module.</div></AppLayout>;

  const gameKeys = keys?.filter(k => k.gameId === game.id) || [];
  const activeKeys = gameKeys.filter(k => k.status === 'active');
  const hasAccess = activeKeys.length > 0;

  const loaderUrl = `${window.location.origin}/api/loader/${game.slug}`;

  const copyCode = () => {
    const code = `loadstring(game:HttpGet("${loaderUrl}"))()`;
    navigator.clipboard.writeText(code);
  };

  const copyKey = (keyString: string) => {
    navigator.clipboard.writeText(keyString);
  };

  return (
    <AppLayout>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="flex items-center gap-2 mb-2">
          <Link href="/scripts" className="text-muted-foreground hover:text-foreground transition-colors p-1 border border-transparent hover:border-border bg-transparent hover:bg-secondary">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            / Registry / {game.slug}
          </div>
        </div>

        <div className="border-b border-border pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold font-sans tracking-tight text-foreground">{game.name}</h1>
                <Badge variant="outline" className={`rounded-none font-mono text-[10px] uppercase px-2 py-0 border ${game.status === 'active' ? 'border-primary text-primary bg-primary/10' : 'border-muted text-muted-foreground'}`}>
                  {game.status}
                </Badge>
              </div>
              <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">{game.description}</p>
            </div>
            
            {hasAccess && (
              <div className="bg-primary/10 border border-primary/30 px-4 py-2 flex flex-col items-end">
                <span className="text-[10px] font-mono text-primary uppercase tracking-widest mb-1">Access Granted</span>
                <span className="text-xs font-mono text-foreground">Auth level: OP</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border bg-card shadow-none rounded-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />
              <CardHeader className="bg-secondary/30 border-b border-border pb-4">
                <CardTitle className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider text-foreground">
                  <Terminal className="w-4 h-4 text-primary" /> 
                  Execution Payload
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {hasAccess ? (
                  <div className="relative group border border-border bg-background">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/50">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">loader.lua</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 text-[10px] font-mono uppercase tracking-wider rounded-none hover:bg-primary/20 hover:text-primary transition-colors"
                        onClick={copyCode}
                      >
                        <Copy className="w-3 h-3 mr-1.5" /> Copy String
                      </Button>
                    </div>
                    <pre className="p-4 overflow-x-auto text-sm font-mono text-foreground/90 leading-relaxed selection:bg-primary selection:text-primary-foreground">
                      <code>
                        <span className="text-primary">loadstring</span>(game:<span className="text-blue-400">HttpGet</span>(<span className="text-green-400">"{loaderUrl}"</span>))()
                      </code>
                    </pre>
                  </div>
                ) : (
                  <div className="p-6 bg-destructive/5 border border-destructive/20 flex flex-col items-center justify-center text-center min-h-[200px]">
                    <AlertTriangle className="w-8 h-8 text-destructive mb-3 opacity-80" />
                    <h4 className="font-mono font-bold text-destructive text-sm uppercase tracking-widest mb-2">Clearance Denied</h4>
                    <p className="text-xs text-muted-foreground font-mono max-w-sm">Active entitlement required. Please procure a valid license key for this module.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border shadow-none rounded-sm bg-card">
              <CardHeader className="border-b border-border bg-secondary/30 pb-4">
                <CardTitle className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider">
                  <KeyRound className="w-4 h-4 text-primary" />
                  Your Licenses
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isKeysLoading ? (
                  <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : gameKeys.length === 0 ? (
                  <div className="p-8 text-center border-b border-border last:border-0">
                    <p className="text-xs font-mono text-muted-foreground uppercase">No credentials found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {gameKeys.map(key => (
                      <div key={key.id} className="p-4 hover:bg-secondary/20 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <Badge 
                            variant="outline" 
                            className={`rounded-none font-mono text-[9px] uppercase px-1.5 py-0 border ${
                              key.status === 'active' ? 'border-primary text-primary bg-primary/10' : 'border-muted text-muted-foreground'
                            }`}
                          >
                            {key.status}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-mono uppercase">
                            {key.expiresAt ? `EXP: ${new Date(key.expiresAt).toLocaleDateString()}` : 'LIFETIME'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-background px-2 py-1.5 text-xs font-mono border border-border text-foreground truncate selection:bg-primary selection:text-primary-foreground">
                            {key.key}
                          </code>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-none border border-transparent hover:border-border hover:bg-secondary" onClick={() => copyKey(key.key)}>
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </AppLayout>
  );
}