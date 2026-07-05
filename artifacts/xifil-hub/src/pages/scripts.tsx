import React from "react";
import { Redirect, Link } from "wouter";
import { useGetMe, useListGames, getListGamesQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Terminal, ArrowRight } from "lucide-react";

export default function ScriptsPage() {
  const { data: user, isLoading: isUserLoading, error: userError } = useGetMe();
  const { data: games, isLoading: isGamesLoading } = useListGames({ query: { enabled: !!user, queryKey: getListGamesQueryKey() } });

  if (isUserLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary"><Loader2 className="animate-spin w-8 h-8" /></div>;
  if (userError || !user) return <Redirect to="/" />;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight mb-2">Script Directory</h1>
          <p className="text-muted-foreground">Browse all supported experiences and their loaders.</p>
        </div>

        {isGamesLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
        ) : !games || games.length === 0 ? (
          <div className="border border-border border-dashed rounded-lg p-12 text-center text-muted-foreground">
            No scripts available at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map(game => (
              <Card key={game.id} className="flex flex-col">
                {game.imageUrl && (
                  <div className="h-40 w-full bg-muted border-b border-border overflow-hidden">
                    <img src={game.imageUrl} alt={game.name} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
                  </div>
                )}
                {!game.imageUrl && (
                  <div className="h-40 w-full bg-muted/50 border-b border-border flex items-center justify-center">
                    <Terminal className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle>{game.name}</CardTitle>
                    <Badge variant={game.status === 'active' ? 'success' : 'secondary'}>
                      {game.status}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {game.description || "No description provided."}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto pt-4">
                  <Link href={`/scripts/${game.slug}`} className="w-full">
                    <Button variant="outline" className="w-full justify-between group">
                      View Details
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}