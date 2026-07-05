import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { Terminal, KeyRound, Gamepad2, ShieldAlert, LogOut, Loader2, ChevronRight, Activity, PanelLeftClose, PanelLeftOpen, UserCircle } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: user, isLoading } = useGetMe();
  const logout = useLogout();
  const [collapsed, setCollapsed] = useState(false);

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
    { href: "/profile", label: "Profile", icon: UserCircle },
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
      <motion.aside
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="hidden md:flex border-r border-border bg-card flex-col h-screen sticky top-0 z-10 relative overflow-hidden flex-shrink-0"
      >
        <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent z-20"></div>

        {/* Logo + collapse button */}
        <div className="p-4 border-b border-border flex items-center justify-between gap-2 min-h-[72px]">
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                key="logo"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
                className="flex-1 overflow-hidden"
              >
                <Link href="/dashboard" className="flex items-center gap-3 group">
                  <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center font-mono font-bold text-lg box-glow flex-shrink-0">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-mono font-bold text-lg tracking-tight leading-none text-foreground group-hover:text-primary transition-colors whitespace-nowrap">
                      XiFil<span className="text-primary">.Hub</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1 whitespace-nowrap">
                      Access Terminal
                    </span>
                  </div>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {collapsed && (
            <Link href="/dashboard" className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center font-mono font-bold box-glow mx-auto">
              <Terminal className="w-4 h-4" />
            </Link>
          )}

          <button
            onClick={() => setCollapsed((c) => !c)}
            className={`flex-shrink-0 text-muted-foreground hover:text-primary transition-colors ${collapsed ? "mx-auto" : ""}`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed
              ? <PanelLeftOpen className="w-4 h-4 mt-8" />
              : <PanelLeftClose className="w-4 h-4" />
            }
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                key="label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-4 px-3"
              >
                Core Modules
              </motion.div>
            )}
          </AnimatePresence>

          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`relative flex items-center gap-3 px-3 py-2.5 font-mono text-sm transition-all group overflow-hidden ${
                  collapsed ? "justify-center px-0" : ""
                } ${
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
                <item.icon className={`w-4 h-4 z-10 flex-shrink-0 ${isActive ? "text-primary" : "group-hover:text-foreground"}`} />
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.18 }}
                      className="z-10 tracking-tight whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && !collapsed && <ChevronRight className="w-4 h-4 ml-auto opacity-50 z-10 flex-shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        {user && (
          <div className={`p-3 border-t border-border mt-auto bg-background/50 ${collapsed ? "flex flex-col items-center gap-2" : ""}`}>
            {!collapsed ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative flex-shrink-0">
                    <img
                      src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discordId) % 5}.png`}
                      alt="Avatar"
                      className="w-10 h-10 border border-border grayscale hover:grayscale-0 transition-all duration-300"
                    />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primary border-2 border-background rounded-full"></div>
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className="text-sm font-bold truncate text-foreground">{user.username}</p>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase">ID: {user.id.toString().padStart(4, "0")}</p>
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
              </>
            ) : (
              <>
                <div className="relative" title={user.username}>
                  <img
                    src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discordId) % 5}.png`}
                    alt="Avatar"
                    className="w-8 h-8 border border-border grayscale hover:grayscale-0 transition-all duration-300"
                  />
                  <div className="absolute bottom-0 right-0 w-2 h-2 bg-primary border-2 border-background rounded-full"></div>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={logout.isPending}
                  title="Terminate Session"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {logout.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                </button>
              </>
            )}
          </div>
        )}
      </motion.aside>

      {/* Mobile sidebar (always full, no collapse) */}
      <aside className="w-full md:hidden border-b border-border bg-card flex flex-col z-10">
        <div className="p-4 border-b border-border flex items-center gap-3">
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
        <nav className="flex overflow-x-auto p-2 gap-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2 px-3 py-2 font-mono text-xs whitespace-nowrap transition-all ${
                  isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {isActive && <motion.div layoutId="mobile-active" className="absolute left-0 top-0 w-[2px] h-full bg-primary" />}
                <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-[100dvh] relative overflow-hidden">
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
