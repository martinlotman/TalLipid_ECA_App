import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, RefreshCw, Save, Users, Activity, MessageSquare,
  Shield, Search, Bell, Send, Pill, BarChart3, Eye, Bot, Clock,
  ChevronDown, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

interface UserProfile {
  id: string;
  first_name: string | null;
  redcap_record_id: string | null;
  enrolled_at: string;
  last_synced_at: string | null;
  sync_interval_days: number;
  logCount?: number;
  lastLogDate?: string | null;
  medicationAdherence?: number;
  chatSessionCount?: number;
}

interface ChatConversation {
  id: string;
  started_at: string;
  ended_at: string | null;
  messages: { role: string; content: string; created_at: string }[];
}

interface DailyLog {
  user_id: string | null;
  date: string;
  medication_taken: boolean | null;
  steps: number | null;
  heart_rate: number | null;
  spo2: number | null;
  sleep_hours: number | null;
  stress_level: number | null;
}

const CHART_COLORS = [
  "hsl(168, 55%, 42%)",
  "hsl(36, 90%, 55%)",
  "hsl(200, 60%, 50%)",
  "hsl(0, 72%, 55%)",
  "hsl(145, 60%, 42%)",
];

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [allLogs, setAllLogs] = useState<DailyLog[]>([]);
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

  // Notification form
  const [notifTarget, setNotifTarget] = useState("all");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);
  const [sentNotifications, setSentNotifications] = useState<any[]>([]);

  // Chat session counts
  const [chatCounts, setChatCounts] = useState<Map<string, number>>(new Map());

  // Role management
  const [userRoles, setUserRoles] = useState<Map<string, string[]>>(new Map());
  const [roleLoading, setRoleLoading] = useState(false);

  // Chatbot activity monitor
  const [allConversations, setAllConversations] = useState<Array<{
    id: string;
    user_id: string;
    started_at: string;
    ended_at: string | null;
    messageCount: number;
    lastMessage: string | null;
    lastMessageAt: string | null;
    userName: string;
  }>>([]);
  const [expandedConvo, setExpandedConvo] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<{ role: string; content: string; created_at: string }[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    const [profilesRes, logsRes, convosRes, notifsRes, msgsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("enrolled_at", { ascending: false }),
      supabase.from("daily_logs").select("user_id, date, medication_taken, steps, heart_rate, spo2, sleep_hours, stress_level").order("date", { ascending: false }),
      supabase.from("chat_conversations").select("id, user_id, started_at, ended_at").order("started_at", { ascending: false }),
      supabase.from("admin_notifications").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("chat_messages").select("conversation_id, role, content, created_at").order("created_at", { ascending: false }),
    ]);

    if (profilesRes.error) {
      toast.error("Failed to load users");
      setLoading(false);
      return;
    }

    const logs = logsRes.data ?? [];
    setAllLogs(logs as DailyLog[]);

    // Log counts & medication adherence per user
    const logMap = new Map<string, { count: number; lastDate: string | null; medTaken: number; medTotal: number }>();
    for (const log of logs) {
      const uid = log.user_id!;
      const existing = logMap.get(uid);
      if (!existing) {
        logMap.set(uid, {
          count: 1,
          lastDate: log.date,
          medTaken: log.medication_taken ? 1 : 0,
          medTotal: log.medication_taken !== null ? 1 : 0,
        });
      } else {
        existing.count++;
        if (log.medication_taken !== null) {
          existing.medTotal++;
          if (log.medication_taken) existing.medTaken++;
        }
      }
    }

    // Chat session counts
    const chatMap = new Map<string, number>();
    for (const c of convosRes.data ?? []) {
      chatMap.set(c.user_id, (chatMap.get(c.user_id) ?? 0) + 1);
    }
    setChatCounts(chatMap);

    // Build conversation activity feed
    const allMsgs = msgsRes.data ?? [];
    const msgsByConvo = new Map<string, typeof allMsgs>();
    for (const m of allMsgs) {
      const arr = msgsByConvo.get(m.conversation_id) ?? [];
      arr.push(m);
      msgsByConvo.set(m.conversation_id, arr);
    }

    const profileMap = new Map<string, string>();
    for (const p of profilesRes.data ?? []) {
      profileMap.set(p.id, p.first_name || p.id.slice(0, 8));
    }

    const convoFeed = (convosRes.data ?? []).map((c: any) => {
      const msgs = msgsByConvo.get(c.id) ?? [];
      const lastMsg = msgs.length > 0 ? msgs[0] : null; // already sorted desc
      return {
        id: c.id,
        user_id: c.user_id,
        started_at: c.started_at,
        ended_at: c.ended_at,
        messageCount: msgs.length,
        lastMessage: lastMsg?.content?.slice(0, 120) ?? null,
        lastMessageAt: lastMsg?.created_at ?? null,
        userName: profileMap.get(c.user_id) ?? c.user_id.slice(0, 8),
      };
    });
    setAllConversations(convoFeed);

    const enriched = (profilesRes.data ?? []).map((p: any) => {
      const logInfo = logMap.get(p.id);
      return {
        ...p,
        logCount: logInfo?.count ?? 0,
        lastLogDate: logInfo?.lastDate ?? null,
        medicationAdherence: logInfo && logInfo.medTotal > 0
          ? Math.round((logInfo.medTaken / logInfo.medTotal) * 100)
          : null,
        chatSessionCount: chatMap.get(p.id) ?? 0,
      };
    });

    setProfiles(enriched);
    setSentNotifications(notifsRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchProfiles();
  }, [isAdmin, fetchProfiles]);

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

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setSendingNotif(true);
    try {
      const targets = notifTarget === "all"
        ? profiles.map((p) => p.id)
        : [notifTarget];

      const rows = targets.map((uid) => ({
        target_user_id: uid,
        title: notifTitle.trim(),
        body: notifBody.trim(),
        sent_by: user!.id,
      }));

      const { error } = await supabase.from("admin_notifications").insert(rows);
      if (error) throw error;

      toast.success(`Notification sent to ${targets.length} user(s)`);
      setNotifTitle("");
      setNotifBody("");
      fetchProfiles();
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    } finally {
      setSendingNotif(false);
    }
  };

  const handleExpandConvo = async (convoId: string) => {
    if (expandedConvo === convoId) {
      setExpandedConvo(null);
      return;
    }
    setExpandedConvo(convoId);
    setLoadingMessages(true);
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("conversation_id", convoId)
      .order("created_at", { ascending: true });
    setExpandedMessages(msgs ?? []);
    setLoadingMessages(false);
  };

  const filteredProfiles = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.first_name?.toLowerCase() ?? "").includes(q) ||
      (p.redcap_record_id?.toLowerCase() ?? "").includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  });

  // === Analytics data ===
  const medicationAdherenceData = profiles
    .filter((p) => p.medicationAdherence !== null && p.medicationAdherence !== undefined)
    .map((p) => ({
      name: p.first_name || p.id.slice(0, 8),
      adherence: p.medicationAdherence,
    }))
    .sort((a, b) => (b.adherence ?? 0) - (a.adherence ?? 0));

  const adherenceBuckets = [
    { range: "0-25%", count: 0 },
    { range: "26-50%", count: 0 },
    { range: "51-75%", count: 0 },
    { range: "76-100%", count: 0 },
  ];
  for (const p of profiles) {
    const a = p.medicationAdherence;
    if (a === null || a === undefined) continue;
    if (a <= 25) adherenceBuckets[0].count++;
    else if (a <= 50) adherenceBuckets[1].count++;
    else if (a <= 75) adherenceBuckets[2].count++;
    else adherenceBuckets[3].count++;
  }

  const chatSessionData = profiles
    .filter((p) => (p.chatSessionCount ?? 0) > 0)
    .map((p) => ({
      name: p.first_name || p.id.slice(0, 8),
      sessions: p.chatSessionCount ?? 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);

  // Last 14 days array (shared)
  const last14Days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last14Days.push(d.toISOString().slice(0, 10));
  }

  // Chat activity trend (last 14 days)
  const chatDailyTrend = last14Days.map((date) => {
    const daySessions = allConversations.filter((c) => c.started_at.slice(0, 10) === date);
    const totalMessages = daySessions.reduce((a, b) => a + b.messageCount, 0);
    return {
      date: date.slice(5),
      sessions: daySessions.length,
      messages: totalMessages,
    };
  });

  // Daily log trend (last 14 days)
  const dailyTrend = last14Days.map((date) => {
    const dayLogs = allLogs.filter((l) => l.date === date);
    const medCount = dayLogs.filter((l) => l.medication_taken === true).length;
    return {
      date: date.slice(5), // MM-DD
      logs: dayLogs.length,
      medTaken: medCount,
    };
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
        <Button variant="outline" onClick={() => navigate("/")}>Back to app</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground">{profiles.length} participants enrolled</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => fetchProfiles()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
              <Pill className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {profiles.filter((p) => (p.medicationAdherence ?? 0) >= 75).length}
                </p>
                <p className="text-xs text-muted-foreground">Good Adherence (≥75%)</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <MessageSquare className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {Array.from(chatCounts.values()).reduce((a, b) => a + b, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Chat Sessions</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="patients" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="patients" className="gap-2">
              <Users className="h-4 w-4" /> Patients
            </TabsTrigger>
            <TabsTrigger value="chatbot" className="gap-2">
              <Bot className="h-4 w-4" /> Chatbot
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" /> Notifications
            </TabsTrigger>
          </TabsList>

          {/* ===== PATIENTS TAB ===== */}
          <TabsContent value="patients" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, REDCap ID, or user ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Card>
              <CardContent className="p-0">
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>REDCap ID</TableHead>
                        <TableHead className="text-center">Logs</TableHead>
                        <TableHead className="text-center">Med Adherence</TableHead>
                        <TableHead className="text-center">Chat Sessions</TableHead>
                        <TableHead>Last Log</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading…</TableCell>
                        </TableRow>
                      ) : filteredProfiles.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No users found</TableCell>
                        </TableRow>
                      ) : (
                        filteredProfiles.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.first_name || "—"}</TableCell>
                            <TableCell>
                              {p.redcap_record_id ? (
                                <Badge variant="outline">{p.redcap_record_id}</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">Not set</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">{p.logCount ?? 0}</TableCell>
                            <TableCell className="text-center">
                              {p.medicationAdherence !== null && p.medicationAdherence !== undefined ? (
                                <Badge
                                  variant={p.medicationAdherence >= 75 ? "default" : p.medicationAdherence >= 50 ? "secondary" : "destructive"}
                                >
                                  {p.medicationAdherence}%
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">{p.chatSessionCount ?? 0}</TableCell>
                            <TableCell className="text-xs">
                              {p.lastLogDate ? new Date(p.lastLogDate).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => {
                                  setEditingUser(p);
                                  setEditRedcapId(p.redcap_record_id ?? "");
                                  setEditSyncInterval(String(p.sync_interval_days));
                                }}>Edit</Button>
                                <Button variant="ghost" size="sm" onClick={() => handleViewChats(p.id, p.first_name ?? "User")}>
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" disabled={!p.redcap_record_id || syncing === p.id} onClick={() => handleSync(p.id)}>
                                  {syncing === p.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Sync"}
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
          </TabsContent>

          {/* ===== CHATBOT ACTIVITY TAB ===== */}
          <TabsContent value="chatbot" className="space-y-6">
            {/* Chat activity over time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Chatbot Activity (Last 14 Days)</CardTitle>
                <CardDescription>Sessions started and messages exchanged per day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chatDailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fill: "hsl(200, 10%, 50%)" }} />
                      <YAxis allowDecimals={false} tick={{ fill: "hsl(200, 10%, 50%)" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(0, 0%, 100%)",
                          border: "1px solid hsl(160, 15%, 88%)",
                          borderRadius: "0.5rem",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="sessions" fill="hsl(168, 55%, 42%)" name="Sessions" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="messages" fill="hsl(200, 60%, 50%)" name="Messages" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Conversation feed */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Conversation Timeline
                </CardTitle>
                <CardDescription>All chatbot sessions — click to expand full transcript</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {allConversations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No conversations yet</p>
                  ) : (
                    <div className="space-y-2">
                      {allConversations.map((c) => (
                        <div key={c.id} className="rounded-lg border border-border overflow-hidden">
                          <button
                            onClick={() => handleExpandConvo(c.id)}
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
                          >
                            {expandedConvo === c.id ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">{c.userName}</span>
                                <Badge variant="secondary" className="text-[10px]">
                                  {c.messageCount} msgs
                                </Badge>
                                {c.ended_at && (
                                  <Badge variant="outline" className="text-[10px]">Ended</Badge>
                                )}
                              </div>
                              {c.lastMessage && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {c.lastMessage}
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(c.started_at).toLocaleDateString()}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(c.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </button>

                          {expandedConvo === c.id && (
                            <div className="border-t border-border bg-muted/30 p-3 space-y-2">
                              {loadingMessages ? (
                                <p className="text-xs text-muted-foreground text-center py-2">Loading…</p>
                              ) : expandedMessages.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-2">No messages</p>
                              ) : (
                                expandedMessages.map((m, i) => (
                                  <div
                                    key={i}
                                    className={`text-sm rounded-lg px-3 py-2 ${
                                      m.role === "user"
                                        ? "bg-primary/10 text-foreground ml-8"
                                        : "bg-card text-foreground mr-8 border border-border/50"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-0.5">
                                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                                        {m.role}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    </div>
                                    <p className="whitespace-pre-wrap">{m.content}</p>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== ANALYTICS TAB ===== */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Daily activity trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily Activity (Last 14 Days)</CardTitle>
                <CardDescription>Total logs submitted and medication confirmations per day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(200, 10%, 50%)" }} />
                      <YAxis allowDecimals={false} tick={{ fill: "hsl(200, 10%, 50%)" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(0, 0%, 100%)",
                          border: "1px solid hsl(160, 15%, 88%)",
                          borderRadius: "0.5rem",
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="logs" stroke="hsl(168, 55%, 42%)" strokeWidth={2} name="Logs" dot={false} />
                      <Line type="monotone" dataKey="medTaken" stroke="hsl(36, 90%, 55%)" strokeWidth={2} name="Med Taken" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Medication adherence distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Medication Adherence Distribution</CardTitle>
                  <CardDescription>Percentage of users by adherence bracket</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={adherenceBuckets.filter((b) => b.count > 0)}
                          dataKey="count"
                          nameKey="range"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ range, count }) => `${range}: ${count}`}
                        >
                          {adherenceBuckets.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Chat sessions per user */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Chatbot Sessions per User</CardTitle>
                  <CardDescription>Number of AI assistant conversations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chatSessionData.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" allowDecimals={false} tick={{ fill: "hsl(200, 10%, 50%)" }} />
                        <YAxis dataKey="name" type="category" width={80} tick={{ fill: "hsl(200, 10%, 50%)", fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="sessions" fill="hsl(200, 60%, 50%)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Per-user medication adherence bar chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Individual Medication Adherence</CardTitle>
                <CardDescription>Percentage of days medication was confirmed taken</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={medicationAdherenceData.slice(0, 15)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fill: "hsl(200, 10%, 50%)", fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: "hsl(200, 10%, 50%)" }} />
                      <Tooltip formatter={(val: number) => [`${val}%`, "Adherence"]} />
                      <Bar dataKey="adherence" radius={[4, 4, 0, 0]}>
                        {medicationAdherenceData.slice(0, 15).map((entry, i) => (
                          <Cell
                            key={i}
                            fill={
                              (entry.adherence ?? 0) >= 75
                                ? "hsl(145, 60%, 42%)"
                                : (entry.adherence ?? 0) >= 50
                                ? "hsl(36, 90%, 55%)"
                                : "hsl(0, 72%, 55%)"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== NOTIFICATIONS TAB ===== */}
          <TabsContent value="notifications" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Send notification form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Send className="h-4 w-4" /> Send Notification
                  </CardTitle>
                  <CardDescription>Push an in-app notification to one or all users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground">Recipient</label>
                    <Select value={notifTarget} onValueChange={setNotifTarget}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All users ({profiles.length})</SelectItem>
                        {profiles.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.first_name || p.id.slice(0, 8)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground">Title</label>
                    <Input
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      placeholder="e.g. Reminder: Weekly questionnaire"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground">Message</label>
                    <Textarea
                      value={notifBody}
                      onChange={(e) => setNotifBody(e.target.value)}
                      placeholder="Write your notification message…"
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={handleSendNotification}
                    disabled={sendingNotif || !notifTitle.trim() || !notifBody.trim()}
                    className="w-full gap-2"
                  >
                    {sendingNotif ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send Notification
                  </Button>
                </CardContent>
              </Card>

              {/* Recent notifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="h-4 w-4" /> Recent Notifications
                  </CardTitle>
                  <CardDescription>Last 50 sent notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-72">
                    {sentNotifications.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No notifications sent yet</p>
                    ) : (
                      <div className="space-y-3">
                        {sentNotifications.map((n) => {
                          const targetUser = profiles.find((p) => p.id === n.target_user_id);
                          return (
                            <div key={n.id} className="rounded-lg border border-border p-3 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-foreground">{n.title}</span>
                                <Badge variant={n.read ? "secondary" : "outline"} className="text-[10px]">
                                  {n.read ? "Read" : "Unread"}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{n.body}</p>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>To: {targetUser?.first_name || n.target_user_id.slice(0, 8)}</span>
                                <span>{new Date(n.created_at).toLocaleString()}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
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
              <Input value={editRedcapId} onChange={(e) => setEditRedcapId(e.target.value)} placeholder="e.g. 101" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Sync Interval (days)</label>
              <Input type="number" value={editSyncInterval} onChange={(e) => setEditSyncInterval(e.target.value)} min="1" />
            </div>
            <p className="text-xs text-muted-foreground">User ID: {editingUser?.id}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={handleSave} className="gap-2"><Save className="h-4 w-4" /> Save</Button>
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
                      {c.ended_at && <Badge variant="secondary" className="text-[10px]">Ended</Badge>}
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
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">{m.role}</span>
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
