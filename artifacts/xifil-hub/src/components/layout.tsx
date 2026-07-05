import React from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { Terminal, KeyRound, Gamepad2, ShieldAlert, LogOut, Loader2 } from "lucide-react";
import { Button } from "./ui/button";

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
    { href: "/dashboard", label: "Dashboard", icon: Terminal },
    { href: "/scripts", label: "Scripts", icon: Gamepad2 },
    { href: "/keys", label: "My Keys", icon: KeyRound },
  ];

  if (user?.isAdmin) {
    navItems.push({ href: "/admin", label: "Admin Panel", icon: ShieldAlert });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-primary">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-border bg-card/30 flex flex-col h-auto md:h-screen md:sticky md:top-0">
        <div className="p-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
              <Terminal className="w-5 h-5" />
            </div>
            <span className="font-mono font-bold text-lg tracking-tight">
              XiFil<span className="text-primary">.Hub</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md font-mono text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="p-4 border-t border-border mt-auto">
            <div className="flex items-center gap-3 mb-4">
              <img
                src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discordId) % 5}.png`}
                alt="Avatar"
                className="w-10 h-10 rounded-full border border-border"
              />
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{user.username}</p>
                <p className="text-xs text-muted-foreground font-mono">OP_ID: {user.id}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10 border-border"
              onClick={handleLogout}
              disabled={logout.isPending}
            >
              {logout.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
              Disconnect
            </Button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-[100dvh]">
        <div className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}