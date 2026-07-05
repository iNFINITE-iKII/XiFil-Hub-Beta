import React from "react";
import { Redirect, Link } from "wouter";
import { useGetMe, useListGames, getListGamesQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Terminal, ArrowRight, Code2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ScriptsPage() {
  const { data: user, isLoading: isUserLoading, error: userError } = useGetMe();
  const { data: games, isLoading: isGamesLoading } = useListGames({ query: { enabled: !!user, queryKey: getListGamesQueryKey() } });

  if (isUserLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary"><Loader2 className="animate-spin w-8 h-8" /></div>;
  if (userError || !user) return <Redirect to="/" />;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0 }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="border-b border-border pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-primary"></div>
              <h1 className="text-3xl font-bold font-mono tracking-tight text-foreground uppercase">Script Directory</h1>
            </div>
            <p className="text-sm text-muted-foreground font-mono">Browse available execution modules and loaders.</p>
          </div>
          <div className="text-xs font-mono text-muted-foreground bg-secondary px-3 py-1.5 border border-border">
            Total Modules: <span className="text-foreground">{games?.length || 0}</span>
          </div>
        </div>

        {isGamesLoading ? (
          <div className="flex justify-center p-20"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
        ) : !games || games.length === 0 ? (
          <div className="border border-border border-dashed p-16 flex flex-col items-center justify-center text-center bg-secondary/20">
            <Code2 className="w-10 h-10 text-muted-foreground mb-4 opacity-50" />
            <p className="font-mono text-sm uppercase text-foreground mb-1">Database Empty</p>
            <p className="text-xs text-muted-foreground font-mono">No scripts currently available in the registry.</p>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {games.map(game => (
              <motion.div variants={itemVariants} key={game.id}>
                <Card className="flex flex-col h-full border-border bg-card hover:border-primary/50 transition-colors shadow-none rounded-sm overflow-hidden group">
                  {game.imageUrl ? (
                    <div className="h-40 w-full bg-secondary border-b border-border overflow-hidden relative">
                      <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 mix-blend-overlay transition-opacity z-10"></div>
                      <img src={game.imageUrl} alt={game.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 scale-100 group-hover:scale-105" />
                    </div>
                  ) : (
                    <div className="h-40 w-full bg-secondary/50 border-b border-border flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:12px_12px]"></div>
                      <Terminal className="w-12 h-12 text-muted-foreground/20 group-hover:text-primary/30 transition-colors z-10" />
                    </div>
                  )}
                  
                  <CardHeader className="p-5 pb-0">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <CardTitle className="text-lg font-bold font-sans group-hover:text-primary transition-colors">{game.name}</CardTitle>
                      <Badge 
                        variant="outline" 
                        className={`rounded-none font-mono text-[9px] uppercase px-1.5 py-0 border shrink-0 ${
                          game.status === 'active' ? 'border-primary text-primary' : 'border-muted text-muted-foreground'
                        }`}
                      >
                        {game.status}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2 text-sm text-muted-foreground">
                      {game.description || "No registry description available."}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="mt-auto p-5 pt-6">
                    <Link href={`/scripts/${game.slug}`} className="w-full">
                      <Button variant="outline" className="w-full justify-between rounded-none border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary font-mono text-xs uppercase tracking-wider h-10 transition-all">
                        Initialize
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}