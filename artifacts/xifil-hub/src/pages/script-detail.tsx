import React from "react";
import { Redirect, useParams } from "wouter";
import { useGetMe, useGetGame, useListMyKeys, getGetGameQueryKey, getListMyKeysQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, AlertTriangle, KeyRound } from "lucide-react";

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
  
  if (isGameLoading) return <AppLayout><div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div></AppLayout>;
  if (gameError || !game) return <AppLayout><div className="p-12 text-center text-destructive">Failed to load script details.</div></AppLayout>;

  const gameKeys = keys?.filter(k => k.gameId === game.id) || [];
  const activeKeys = gameKeys.filter(k => k.status === 'active');
  const hasAccess = activeKeys.length > 0;

  const copyCode = () => {
    const code = `getgenv().XiFil_Key = "YOUR_KEY_HERE"\nloadstring(game:HttpGet("https://xifil.hub/loader/${game.slug}"))()`;
    navigator.clipboard.writeText(code);
  };

  const copyKey = (keyString: string) => {
    navigator.clipboard.writeText(keyString);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold font-mono tracking-tight">{game.name}</h1>
              <Badge variant={game.status === 'active' ? 'success' : 'secondary'}>{game.status}</Badge>
            </div>
            <p className="text-muted-foreground max-w-2xl">{game.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-primary/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-500" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-primary" /> 
                  Loader Script
                </CardTitle>
                <CardDescription>Paste this into your executor to inject the hub.</CardDescription>
              </CardHeader>
              <CardContent>
                {hasAccess ? (
                  <div className="relative group rounded-md overflow-hidden bg-black/50 border border-border">
                    <pre className="p-4 overflow-x-auto text-sm font-mono text-primary-foreground/90">
                      <code>
                        <span className="text-purple-400">getgenv</span>().<span className="text-blue-400">XiFil_Key</span> = <span className="text-green-400">"YOUR_KEY_HERE"</span>{"\n"}
                        <span className="text-purple-400">loadstring</span>(game:<span className="text-blue-400">HttpGet</span>(<span className="text-green-400">"https://xifil.hub/loader/{game.slug}"</span>))()
                      </code>
                    </pre>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={copyCode}
                    >
                      <Copy className="w-4 h-4 mr-2" /> Copy
                    </Button>
                  </div>
                ) : (
                  <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-mono font-bold text-destructive mb-1">Access Denied</h4>
                      <p className="text-sm text-destructive-foreground/80">You do not have an active license key for this script. Purchase a key to view the loader.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <KeyRound className="w-4 h-4 text-primary" />
                  Your Keys
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isKeysLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                ) : gameKeys.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No keys found for this game.</p>
                ) : (
                  gameKeys.map(key => (
                    <div key={key.id} className="p-3 rounded border border-border bg-card/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={key.status === 'active' ? 'success' : 'secondary'} className="text-[10px] px-1.5 py-0">
                          {key.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : 'Lifetime'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-background px-2 py-1 rounded text-xs font-mono border border-border truncate">
                          {key.key}
                        </code>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyKey(key.key)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// Needed icon for this file
function Terminal(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  )
}