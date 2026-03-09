import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  RefreshCw,
  Save,
  Users,
  Activity,
  MessageSquare,
  Shield,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface UserProfile {
  id: string;
  first_name: string | null;
  redcap_record_id: string | null;
  enrolled_at: string;
  last_synced_at: string | null;
  sync_interval_days: number;
  logCount?: number;
  lastLogDate?: string | null;
}

interface ChatConversation {
  id: string;
  started_at: string;
  ended_at: string | null;
  messages: { role: string; content: string; created_at: string }[];
}

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editRedcapId, setEditRedcapId] = useState("");
  const [editSyncInterval, setEditSyncInterval] = useState("7");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [chatDialog, setChatDialog] = useState<{ userId: string; name: string } | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);

  // Check admin role
  useEffect(() => {
    if (!user) return;
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  // Fetch all profiles with log counts
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    const { data: profilesData, error } = await supabase
      .from("profiles")
      .select("*")
      .order("enrolled_at", { ascending: false });

    if (error) {
      toast.error("Failed to load users");
      setLoading(false);
      return;
    }

    // Get log counts per user
    const { data: logs } = await supabase
      .from("daily_logs")
      .select("user_id, date")
      .order("date", { ascending: false });

    const logMap = new Map<string, { count: number; lastDate: string | null }>();
    for (const log of logs ?? []) {
      const existing = logMap.get(log.user_id!);
      if (!existing) {
        logMap.set(log.user_id!, { count: 1, lastDate: log.date });
      } else {
        existing.count++;
      }
    }

    const enriched = (profilesData ?? []).map((p: any) => ({
      ...p,
      logCount: logMap.get(p.id)?.count ?? 0,
      lastLogDate: logMap.get(p.id)?.lastDate ?? null,
    }));

    setProfiles(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchProfiles();
  }, [isAdmin, fetchProfiles]);

  // Save REDCap ID and sync interval
  const handleSave = async () => {
    if (!editingUser) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        redcap_record_id: editRedcapId || null,
        sync_interval_days: parseInt(editSyncInterval) || 7,
      })
      .eq("id", editingUser.id);

    if (error) {
      toast.error("Failed to update");
    } else {
      toast.success("User updated");
      setEditingUser(null);
      fetchProfiles();
    }
  };

  // Trigger manual sync for a user
  const handleSync = async (userId: string) => {
    setSyncing(userId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/redcap-weekly-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ user_id: userId }),
        }
      );

      const result = await resp.json();
      if (result.success) {
        toast.success(`Synced ${result.synced} record(s) to REDCap`);
        fetchProfiles();
      } else {
        toast.error(result.error || "Sync failed");
      }
    } catch (e: any) {
      toast.error(e.message || "Sync failed");
    } finally {
      setSyncing(null);
    }
  };

  // Load chat history for a user
  const handleViewChats = async (userId: string, name: string) => {
    setChatDialog({ userId, name });
    setLoadingChats(true);

    const { data: convos } = await supabase
      .from("chat_conversations")
      .select("id, started_at, ended_at")
      .eq("user_id", userId)
      .order("started_at", { ascending: false });

    const enriched: ChatConversation[] = [];
    for (const c of convos ?? []) {
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("role, content, created_at")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: true });

      enriched.push({ ...c, messages: msgs ?? [] });
    }

    setConversations(enriched);
    setLoadingChats(false);
  };

  const filteredProfiles = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.first_name?.toLowerCase() ?? "").includes(q) ||
      (p.redcap_record_id?.toLowerCase() ?? "").includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  });

  if (isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Checking access…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-muted-foreground">
        <Shield className="h-12 w-12" />
        <p className="text-lg font-semibold">Access Denied</p>
        <p className="text-sm">You don't have admin privileges.</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          Back to app
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground">{profiles.length} participants</p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{profiles.length}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Activity className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {profiles.filter((p) => p.redcap_record_id).length}
                </p>
                <p className="text-xs text-muted-foreground">REDCap Linked</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <MessageSquare className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {profiles.reduce((a, p) => a + (p.logCount ?? 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Logs</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, REDCap ID, or user ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Users table */}
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>REDCap ID</TableHead>
                    <TableHead className="text-center">Logs</TableHead>
                    <TableHead>Last Log</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : filteredProfiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProfiles.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.first_name || "—"}
                        </TableCell>
                        <TableCell>
                          {p.redcap_record_id ? (
                            <Badge variant="outline">{p.redcap_record_id}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not set</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{p.logCount ?? 0}</TableCell>
                        <TableCell className="text-xs">
                          {p.lastLogDate
                            ? new Date(p.lastLogDate).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {p.last_synced_at
                            ? new Date(p.last_synced_at).toLocaleString()
                            : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingUser(p);
                                setEditRedcapId(p.redcap_record_id ?? "");
                                setEditSyncInterval(String(p.sync_interval_days));
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewChats(p.id, p.first_name ?? "User")}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!p.redcap_record_id || syncing === p.id}
                              onClick={() => handleSync(p.id)}
                            >
                              {syncing === p.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                "Sync"
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>

      {/* Edit user dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingUser?.first_name ?? "User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">REDCap Record ID</label>
              <Input
                value={editRedcapId}
                onChange={(e) => setEditRedcapId(e.target.value)}
                placeholder="e.g. 101"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Sync Interval (days)</label>
              <Input
                type="number"
                value={editSyncInterval}
                onChange={(e) => setEditSyncInterval(e.target.value)}
                min="1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              User ID: {editingUser?.id}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat history dialog */}
      <Dialog open={!!chatDialog} onOpenChange={() => setChatDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chat History — {chatDialog?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {loadingChats ? (
              <p className="text-center text-muted-foreground py-4">Loading…</p>
            ) : conversations.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No conversations yet</p>
            ) : (
              <div className="space-y-4">
                {conversations.map((c) => (
                  <div key={c.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {new Date(c.started_at).toLocaleString()}
                      </span>
                      {c.ended_at && (
                        <Badge variant="secondary" className="text-[10px]">Ended</Badge>
                      )}
                    </div>
                    {c.messages.map((m, i) => (
                      <div
                        key={i}
                        className={`text-sm rounded-lg px-3 py-2 ${
                          m.role === "user"
                            ? "bg-primary/10 text-foreground ml-8"
                            : "bg-muted text-foreground mr-8"
                        }`}
                      >
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                          {m.role}
                        </span>
                        <p className="mt-0.5">{m.content}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
