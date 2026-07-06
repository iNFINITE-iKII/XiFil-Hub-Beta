import React, { useState, useEffect } from "react";
import { Redirect, useParams, Link, useLocation } from "wouter";
import { useGetMe, useGetGame, useListMyKeys, getGetGameQueryKey, getListMyKeysQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Copy, AlertTriangle, KeyRound, ChevronLeft,
  Terminal, Settings, Plus, X, CheckCircle2, Zap,
} from "lucide-react";
import { motion } from "framer-motion";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
function apiUrl(path: string) { return `${BASE}${path}`; }

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface GameData {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  loaderName?: string | null;
  features?: string[];
  status: string;
}

interface SettingsForm {
  name: string;
  slug: string;
  loaderName: string;
  imageUrl: string;
  description: string;
  features: string[];
  status: string;
}

/* ------------------------------------------------------------------ */
/*  Admin Settings Dialog                                               */
/* ------------------------------------------------------------------ */
function AdminGameSettingsDialog({
  open, onOpenChange, game, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  game: GameData;
  onSaved: (updated: GameData) => void;
}) {
  const [form, setForm] = useState<SettingsForm>({
    name: "",
    slug: "",
    loaderName: "",
    imageUrl: "",
    description: "",
    features: [],
    status: "active",
  });
  const [newFeature, setNewFeature] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Sync form when dialog opens
  useEffect(() => {
    if (open) {
      setForm({
        name: game.name ?? "",
        slug: game.slug ?? "",
        loaderName: game.loaderName ?? "",
        imageUrl: game.imageUrl ?? "",
        description: game.description ?? "",
        features: game.features ?? [],
        status: game.status ?? "active",
      });
      setError(null);
      setSaved(false);
    }
  }, [open, game]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<SettingsForm>) => {
      const res = await fetch(apiUrl(`/api/admin/games/${game.id}`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to save");
      }
      return res.json() as Promise<GameData>;
    },
    onSuccess: (updated) => {
      setSaved(true);
      onSaved(updated);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (e: Error) => setError(e.message),
  });

  const handleSave = () => {
    setError(null);
    // Send explicit null for cleared optional fields so backend can persist the clearing
    saveMutation.mutate({
      name: form.name.trim(),
      slug: form.slug.trim(),
      loaderName: form.loaderName.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      description: form.description.trim() || null,
      features: form.features,
      status: form.status,
    });
  };

  const addFeature = () => {
    const trimmed = newFeature.trim();
    if (!trimmed || form.features.length >= 30) return;
    setForm(f => ({ ...f, features: [...f.features, trimmed] }));
    setNewFeature("");
  };

  const removeFeature = (i: number) => {
    setForm(f => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border rounded-sm shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="font-mono text-sm uppercase tracking-widest text-foreground flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            Game Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Game Name</Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="rounded-none border-border bg-background font-mono text-sm h-9"
              placeholder="Iron Soul"
            />
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              URL Slug <span className="text-destructive/70">(changes loadstring URL!)</span>
            </Label>
            <Input
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))}
              className="rounded-none border-border bg-background font-mono text-sm h-9"
              placeholder="iron_soul"
            />
            <p className="text-[10px] font-mono text-muted-foreground">
              /api/loader/<span className="text-primary">{form.slug || "…"}</span>
            </p>
          </div>

          {/* Loader display name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Loader Display Name</Label>
            <Input
              value={form.loaderName}
              onChange={e => setForm(f => ({ ...f, loaderName: e.target.value }))}
              className="rounded-none border-border bg-background font-mono text-sm h-9"
              placeholder="IronSoul v2.3 (optional)"
            />
            <p className="text-[10px] font-mono text-muted-foreground">Shown in the Execution Payload card title. Leave blank to use game name.</p>
          </div>

          {/* Banner URL */}
          <div className="space-y-1.5">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Banner Image URL</Label>
            <Input
              value={form.imageUrl}
              onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
              className="rounded-none border-border bg-background font-mono text-sm h-9"
              placeholder="https://… or /games/iron-soul.webp"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="rounded-none border-border bg-background font-mono text-sm min-h-[80px] resize-none"
              placeholder="Short overview shown to users…"
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="rounded-none border-border bg-background font-mono text-sm h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none border-border bg-card font-mono text-sm">
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Feature List <span className="text-muted-foreground/60 normal-case">({form.features.length}/30)</span>
            </Label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {form.features.map((feat, i) => (
                <div key={i} className="flex items-center gap-2 bg-secondary/30 border border-border px-3 py-1.5">
                  <Zap className="w-3 h-3 text-primary flex-shrink-0" />
                  <span className="flex-1 text-xs font-mono text-foreground">{feat}</span>
                  <button
                    onClick={() => removeFeature(i)}
                    className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newFeature}
                onChange={e => setNewFeature(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
                className="rounded-none border-border bg-background font-mono text-xs h-8"
                placeholder="Auto-farm, ESP, Speed hack…"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={addFeature}
                disabled={!newFeature.trim() || form.features.length >= 30}
                className="rounded-none border-border h-8 px-3 font-mono text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-xs font-mono text-destructive border border-destructive/20 bg-destructive/5 px-3 py-2">{error}</p>
          )}
        </div>

        <DialogFooter className="border-t border-border pt-4 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-none border-border font-mono text-xs uppercase tracking-wider h-8"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saveMutation.isPending || saved}
            className="rounded-none font-mono text-xs uppercase tracking-wider h-8 min-w-[100px]"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
            ) : saved ? (
              <><CheckCircle2 className="w-3 h-3 mr-1.5 text-primary" /> Saved</>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                           */
/* ------------------------------------------------------------------ */
export default function ScriptDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: user, isLoading: isUserLoading, error: userError } = useGetMe();
  const queryClient = useQueryClient();

  const { data: game, isLoading: isGameLoading, error: gameError } = useGetGame(slug || "", {
    query: { enabled: !!user && !!slug, queryKey: getGetGameQueryKey(slug || "") },
  });

  const { data: keys, isLoading: isKeysLoading } = useListMyKeys({
    query: { enabled: !!user, queryKey: getListMyKeysQueryKey() },
  });

  const [, navigate] = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Local override so UI updates immediately after save without waiting for refetch
  const [localGame, setLocalGame] = useState<GameData | null>(null);

  useEffect(() => { if (game) setLocalGame(game as unknown as GameData); }, [game]);

  if (isUserLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center text-primary">
      <Loader2 className="animate-spin w-8 h-8" />
    </div>
  );
  if (userError || !user) return <Redirect to="/" />;

  if (isGameLoading) return (
    <AppLayout>
      <div className="flex justify-center p-20"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
    </AppLayout>
  );
  if (gameError || !game || !localGame) return (
    <AppLayout>
      <div className="p-12 text-center text-destructive font-mono uppercase tracking-widest border border-destructive/20 bg-destructive/5 m-8">
        Failed to locate script module.
      </div>
    </AppLayout>
  );

  const g = localGame;
  const gameKeys = keys?.filter(k => k.gameId === g.id) || [];
  const activeKeys = gameKeys.filter(k => k.status === "active");
  const hasAccess = activeKeys.length > 0;

  const loaderUrl = `${window.location.origin}/api/loader/${g.slug}`;
  const loaderDisplayName = g.loaderName || g.name;

  const copyCode = () => {
    navigator.clipboard.writeText(`loadstring(game:HttpGet("${loaderUrl}"))()`);;
  };
  const copyKey = (keyString: string) => navigator.clipboard.writeText(keyString);

  const handleSaved = (updated: GameData) => {
    setLocalGame(updated);
    // Invalidate both old and new slug query keys
    queryClient.invalidateQueries({ queryKey: getGetGameQueryKey(slug || "") });
    if (updated.slug !== slug) {
      queryClient.invalidateQueries({ queryKey: getGetGameQueryKey(updated.slug) });
      navigate(`/scripts/${updated.slug}`);
    }
  };

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Breadcrumb + admin button */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Link href="/scripts" className="text-muted-foreground hover:text-foreground transition-colors p-1 border border-transparent hover:border-border bg-transparent hover:bg-secondary">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              / Registry / {g.slug}
            </div>
          </div>

          {user.isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSettingsOpen(true)}
              className="rounded-none border-border/60 hover:border-primary/50 hover:bg-primary/10 hover:text-primary font-mono text-xs uppercase tracking-wider h-8 gap-1.5 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Game Settings
            </Button>
          )}
        </div>

        {/* Banner image */}
        {g.imageUrl && (
          <div className="relative w-full h-48 md:h-64 overflow-hidden border border-border rounded-sm">
            <img
              src={g.imageUrl}
              alt={g.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
          </div>
        )}

        {/* Header */}
        <div className="border-b border-border pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold font-sans tracking-tight text-foreground">{g.name}</h1>
                <Badge
                  variant="outline"
                  className={`rounded-none font-mono text-[10px] uppercase px-2 py-0 border ${
                    g.status === "active" ? "border-primary text-primary bg-primary/10" : "border-muted text-muted-foreground"
                  }`}
                >
                  {g.status}
                </Badge>
              </div>
              {g.description && (
                <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">{g.description}</p>
              )}
            </div>

            {hasAccess && (
              <div className="bg-primary/10 border border-primary/30 px-4 py-2 flex flex-col items-end flex-shrink-0">
                <span className="text-[10px] font-mono text-primary uppercase tracking-widest mb-1">Access Granted</span>
                <span className="text-xs font-mono text-foreground">Auth level: OP</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Execution payload */}
            <Card className="border-border bg-card shadow-none rounded-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />
              <CardHeader className="bg-secondary/30 border-b border-border pb-4">
                <CardTitle className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider text-foreground">
                  <Terminal className="w-4 h-4 text-primary" />
                  {loaderDisplayName}
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
                    <p className="text-xs text-muted-foreground font-mono max-w-sm">
                      Active entitlement required. Please procure a valid license key for this module.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feature list (visible to all, shown only when there are features) */}
            {g.features && g.features.length > 0 && (
              <Card className="border-border bg-card shadow-none rounded-sm">
                <CardHeader className="bg-secondary/30 border-b border-border pb-4">
                  <CardTitle className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider text-foreground">
                    <Zap className="w-4 h-4 text-primary" />
                    Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {g.features.map((feat, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 bg-secondary/20 border border-border px-3 py-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="text-xs font-mono text-foreground">{feat}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column — licenses */}
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
                              key.status === "active" ? "border-primary text-primary bg-primary/10" : "border-muted text-muted-foreground"
                            }`}
                          >
                            {key.status}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-mono uppercase">
                            {key.expiresAt ? `EXP: ${new Date(key.expiresAt).toLocaleDateString()}` : "LIFETIME"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-background px-2 py-1.5 text-xs font-mono border border-border text-foreground truncate selection:bg-primary selection:text-primary-foreground">
                            {key.key}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 rounded-none border border-transparent hover:border-border hover:bg-secondary"
                            onClick={() => copyKey(key.key)}
                          >
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

      {/* Admin settings dialog */}
      {user.isAdmin && (
        <AdminGameSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          game={g}
          onSaved={handleSaved}
        />
      )}
    </AppLayout>
  );
}
