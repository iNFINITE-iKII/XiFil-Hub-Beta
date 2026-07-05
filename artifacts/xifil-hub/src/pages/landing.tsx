import React, { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Terminal, Shield, Zap, Lock, Code2, Server } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useGetMe({
    query: { retry: false, queryKey: getGetMeQueryKey() }
  });

  useEffect(() => {
    if (user && !isLoading) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  const handleDiscordLogin = () => {
    window.location.href = "/api/auth/discord";
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      {/* Navbar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-border/50 bg-background/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <Terminal className="w-6 h-6 text-primary" />
          <span className="font-mono font-bold text-xl tracking-tight">
            XiFil<span className="text-primary">.Hub</span>
          </span>
        </div>
        {!isLoading && !user && (
          <Button 
            onClick={handleDiscordLogin}
            className="bg-[#5865F2] text-white hover:bg-[#4752C4] border-transparent shadow-[0_0_15px_rgba(88,101,242,0.3)] font-mono"
          >
            Login via Discord
          </Button>
        )}
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono text-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          System Online
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
          The <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Elite Command Center</span> for Roblox Scripts.
        </h1>
        
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          Precision-engineered access control. Manage your premium game licenses, track hardware bindings, and deploy payloads instantly.
        </p>
        
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
          <Button 
            size="lg" 
            onClick={handleDiscordLogin}
            className="bg-[#5865F2] text-white hover:bg-[#4752C4] border-transparent shadow-[0_0_20px_rgba(88,101,242,0.4)] hover:shadow-[0_0_30px_rgba(88,101,242,0.6)] text-lg h-14 px-8 font-mono"
          >
            Authenticate with Discord
          </Button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl mt-24 animate-in fade-in duration-1000 delay-700">
          <div className="p-6 rounded-lg border border-border bg-card/50 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-mono font-bold mb-2">DRM Protection</h3>
            <p className="text-sm text-muted-foreground">Military-grade obfuscation and license checks ensure your scripts stay in the right hands.</p>
          </div>
          
          <div className="p-6 rounded-lg border border-border bg-card/50 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-mono font-bold mb-2">HWID Binding</h3>
            <p className="text-sm text-muted-foreground">Automated hardware locking prevents key sharing and secures the network.</p>
          </div>

          <div className="p-6 rounded-lg border border-border bg-card/50 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-mono font-bold mb-2">Instant Delivery</h3>
            <p className="text-sm text-muted-foreground">Licenses are generated and assigned the millisecond a transaction clears.</p>
          </div>

          <div className="p-6 rounded-lg border border-border bg-card/50 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Code2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-mono font-bold mb-2">Multi-Game</h3>
            <p className="text-sm text-muted-foreground">One hub to manage execution loaders across every supported Roblox experience.</p>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center border-t border-border/50 text-sm text-muted-foreground font-mono z-10">
        &copy; {new Date().getFullYear()} XiFil.Hub. All rights reserved.
      </footer>
    </div>
  );
}