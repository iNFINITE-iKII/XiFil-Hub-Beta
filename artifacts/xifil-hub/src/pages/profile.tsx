import React, { useState } from "react";
import { Redirect } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
function apiUrl(path: string) { return `${BASE}${path}`; }

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useGetMe();
  const [robloxInput, setRobloxInput] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const linkRobloxMutation = useMutation({
    mutationFn: async (robloxUsername: string) => {
      const res = await fetch(apiUrl("/api/auth/roblox"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ robloxUsername }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to link account");
      return data;
    },
    onSuccess: (data) => {
      setSuccess(`Roblox account "${data.robloxUsername}" linked successfully!`);
      setRobloxInput("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["get-me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess(null);
    },
  });

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary"><Loader2 className="animate-spin w-8 h-8" /></div>;
  if (!user) return <Redirect to="/" />;

  const robloxLinked = (user as any).robloxUsername;

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 max-w-2xl"
      >
        <div className="flex flex-col gap-2 border-b border-border pb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-primary"></div>
            <h1 className="text-3xl font-bold font-mono tracking-tight text-foreground uppercase">Profile</h1>
          </div>
          <p className="text-sm text-muted-foreground font-mono">Manage your operator identity and linked accounts.</p>
        </div>

        {/* Discord Identity */}
        <Card className="border-border bg-card shadow-none rounded-sm">
          <CardHeader className="border-b border-border bg-secondary/30 py-4">
            <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Discord Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <img
                src={user.avatar
                  ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`
                  : `https://cdn.discordapp.com/embed/avatars/0.png`}
                alt={user.username}
                className="w-14 h-14 border border-border"
              />
              <div>
                <p className="text-lg font-bold font-mono text-foreground">{user.username}</p>
                <p className="text-xs font-mono text-muted-foreground">ID: {user.discordId}</p>
                <div className="mt-1.5">
                  {user.isAdmin
                    ? <Badge variant="outline" className="rounded-none border-primary text-primary bg-primary/10 font-mono text-[9px] uppercase px-1.5 py-0">SYS_ADMIN</Badge>
                    : <Badge variant="outline" className="rounded-none border-muted text-muted-foreground font-mono text-[9px] uppercase px-1.5 py-0">USER</Badge>
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roblox Account Linking */}
        <Card className="border-border bg-card shadow-none rounded-sm">
          <CardHeader className="border-b border-border bg-secondary/30 py-4">
            <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-primary" /> Roblox Account Link
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {robloxLinked ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 px-4 py-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-0.5">Linked Account</p>
                    <p className="font-bold font-mono text-foreground text-lg">{(user as any).robloxUsername}</p>
                    {(user as any).robloxId && (
                      <a
                        href={`https://www.roblox.com/users/${(user as any).robloxId}/profile`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono text-primary hover:underline"
                      >
                        View Roblox Profile →
                      </a>
                    )}
                  </div>
                </div>
                <p className="text-xs font-mono text-muted-foreground">To change your linked account, enter a new username below.</p>
              </div>
            ) : (
              <div className="bg-secondary/30 border border-border px-4 py-3">
                <p className="text-xs font-mono text-muted-foreground">
                  <span className="text-foreground font-bold">No Roblox account linked.</span> Link your Roblox username so admins can identify your HWID and manage your licenses.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider">
                {robloxLinked ? "Change Roblox Username" : "Roblox Username"}
              </Label>
              <div className="flex gap-2">
                <Input
                  className="rounded-none border-border bg-secondary/50 font-mono text-sm focus-visible:ring-0 focus-visible:border-primary h-10 flex-1"
                  placeholder="Enter your Roblox username..."
                  value={robloxInput}
                  onChange={(e) => { setRobloxInput(e.target.value); setError(null); setSuccess(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && robloxInput.trim()) linkRobloxMutation.mutate(robloxInput.trim()); }}
                />
                <Button
                  onClick={() => linkRobloxMutation.mutate(robloxInput.trim())}
                  disabled={linkRobloxMutation.isPending || !robloxInput.trim()}
                  className="rounded-none font-mono text-xs uppercase h-10 shrink-0"
                >
                  {linkRobloxMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : robloxLinked ? "Update" : "Link"}
                </Button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-xs font-mono">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 text-primary bg-primary/10 border border-primary/20 px-3 py-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <p className="text-xs font-mono">{success}</p>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                Your Roblox username is verified against the Roblox API. This links your HWID to your Roblox identity, enabling admins to manage keys per Roblox account.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AppLayout>
  );
}
