import React from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { Terminal, KeyRound, Gamepad2, ShieldAlert, LogOut, Loader2, ChevronRight, Activity } from "lucide-react";
import { Button } from "./ui/button";
import { motion } from "framer-motion";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: user, isLoading } = useGetMe();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/";
      }
    });
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Activity },
    { href: "/scripts", label: "Script Directory", icon: Gamepad2 },
    { href: "/keys", label: "License Keys", icon: KeyRound },
  ];

  if (user?.isAdmin) {
    navItems.push({ href: "/admin", label: "System Admin", icon: ShieldAlert });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-primary space-y-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="font-mono text-sm uppercase tracking-widest animate-pulse">Initializing System...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-border bg-card flex flex-col h-auto md:h-screen md:sticky md:top-0 z-10 relative">
        <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent"></div>
        
        <div className="p-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center font-mono font-bold text-lg box-glow">
              <Terminal className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono font-bold text-lg tracking-tight leading-none text-foreground group-hover:text-primary transition-colors">
                XiFil<span className="text-primary">.Hub</span>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                Access Terminal
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-4 px-3">
            Core Modules
          </div>
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 px-3 py-2.5 font-mono text-sm transition-all group overflow-hidden ${
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="sidebar-active" 
                    className="absolute left-0 top-0 w-[2px] h-full bg-primary"
                  />
                )}
                <item.icon className={`w-4 h-4 z-10 ${isActive ? 'text-primary' : 'group-hover:text-foreground'}`} />
                <span className="z-10 tracking-tight">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-50 z-10" />}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="p-4 border-t border-border mt-auto bg-background/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <img
                  src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discordId) % 5}.png`}
                  alt="Avatar"
                  className="w-10 h-10 border border-border grayscale hover:grayscale-0 transition-all duration-300"
                />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primary border-2 border-background rounded-full"></div>
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-bold truncate text-foreground">{user.username}</p>
                <p className="text-[10px] text-muted-foreground font-mono uppercase">ID: {user.id.toString().padStart(4, '0')}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/10 font-mono text-xs uppercase tracking-wider h-8"
              onClick={handleLogout}
              disabled={logout.isPending}
            >
              {logout.isPending ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <LogOut className="w-3 h-3 mr-2" />}
              Terminate Session
            </Button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-[100dvh] relative overflow-hidden">
        {/* Subtle top gradient */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full z-10"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
