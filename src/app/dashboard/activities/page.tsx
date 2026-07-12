"use client";
import { useEffect, useState, useMemo } from "react";
import { useLayout } from "@/app/dashboard/layout";
import { supabase } from "@/lib/supabase";
import { Activity, ShoppingCart, Users, Package, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  meta: Record<string, unknown>;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { label: string; emoji: string; cls: string }> = {
  CREATE_ORDER:             { label: "داواکاری نوێ دروستکرا",  emoji: "🛒", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  EDIT_ORDER:               { label: "داواکاری دەستکاری کرا",  emoji: "✏️", cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  ORDER_STATUS_WAITING:     { label: "داواکاری چاوەڕوانی کرا", emoji: "⏳", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  ORDER_STATUS_IN_PROGRESS: { label: "داواکاری دەستپێکرا",     emoji: "🔄", cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  ORDER_STATUS_READY:       { label: "داواکاری ئامادەبوو",     emoji: "✅", cls: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300" },
  ORDER_STATUS_SENT:        { label: "داواکاری نێردرا",         emoji: "🚚", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  ORDER_STATUS_DELIVERED:   { label: "داواکاری گەیشت",          emoji: "📦", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  ORDER_STATUS_PAID:        { label: "داواکاری پارەی داوە",     emoji: "💰", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  ORDER_STATUS_REJECTED:    { label: "داواکاری ڕەتکرایەوە",    emoji: "❌", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  CREATE_CLIENT:            { label: "کڕیاری نوێ زیادکرا",     emoji: "👤", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  UPDATE_CLIENT:            { label: "زانیاری کڕیار گۆڕا",     emoji: "📝", cls: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300" },
  CREATE_PRODUCT:           { label: "بەرهەمی نوێ زیادکرا",    emoji: "📦", cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  UPDATE_PRODUCT:           { label: "بەرهەم نوێکرایەوە",      emoji: "🔧", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "بەڕێوەبەر", MANAGER: "بەڕێوەبەری مامناوەند", REP: "نوێنەر"
};

const ENTITY_FILTERS = [
  { key: "ALL",     label: "هەموو",        icon: <Activity className="size-3.5" /> },
  { key: "ORDER",   label: "داواکارییەکان", icon: <ShoppingCart className="size-3.5" /> },
  { key: "CLIENT",  label: "کڕیارەکان",    icon: <Users className="size-3.5" /> },
  { key: "PRODUCT", label: "بەرهەمەکان",  icon: <Package className="size-3.5" /> },
];

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "چەند چرکەیەک پێش";
  if (diff < 3600)  return `${Math.floor(diff / 60)} خولەک پێش`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} کاتژمێر پێش`;
  if (diff < 604800)return `${Math.floor(diff / 86400)} ڕۆژ پێش`;
  return new Date(iso).toLocaleDateString("ckb-IQ");
}

function getInitials(name: string) {
  return name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "؟";
}

const AVATAR_COLORS = ["#4263EB", "#7950F2", "#F47B35", "#2F9E44", "#E03131", "#1098AD", "#E67700"];
function avatarColor(userId: string) {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function ActivitiesPage() {
  const { currentUser } = useLayout();
  const isManager = currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [userFilter, setUserFilter] = useState("ALL");
  const [uniqueUsers, setUniqueUsers] = useState<{ id: string; name: string }[]>([]);

  const fetchLogs = async () => {
    let q = supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200);
    if (!isManager && currentUser?.id) q = q.eq("user_id", currentUser.id);
    const { data } = await q;
    const rows = (data || []) as ActivityLog[];
    setLogs(rows);
    const seen = new Map<string, string>();
    rows.forEach(r => { if (!seen.has(r.user_id)) seen.set(r.user_id, r.user_name); });
    setUniqueUsers(Array.from(seen, ([id, name]) => ({ id, name })));
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    const channel = supabase.channel("activity_logs_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, payload => {
        const newLog = payload.new as ActivityLog;
        if (!isManager && newLog.user_id !== currentUser?.id) return;
        setLogs(prev => [newLog, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, isManager]);

  const filtered = useMemo(() =>
    logs.filter(l => {
      if (entityFilter !== "ALL" && l.entity_type !== entityFilter) return false;
      if (userFilter !== "ALL" && l.user_id !== userFilter) return false;
      return true;
    }),
  [logs, entityFilter, userFilter]);

  return (
    <div className="max-w-3xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-black">📋 چالاکییەکان</h1>
          <p className="text-muted-foreground text-sm mt-1">
            کێ چی کرد و کەی — {isManager ? "هەموو بەکارهێنەران" : "چالاکییەکانی خۆت"}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5"
          onClick={() => { setLoading(true); fetchLogs(); }}>
          <RefreshCw className="size-3.5" /> نوێکردنەوە
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        {ENTITY_FILTERS.map(f => (
          <Button key={f.key} variant={entityFilter === f.key ? "default" : "outline"} size="sm"
            onClick={() => setEntityFilter(f.key)}
            className={cn("gap-1.5 rounded-xl text-xs font-bold",
              entityFilter === f.key ? "" : "text-muted-foreground")}>
            {f.icon} {f.label}
          </Button>
        ))}

        {isManager && uniqueUsers.length > 0 && (
          <Select value={userFilter} onValueChange={(v: string | null) => v && setUserFilter(v)}>
            <SelectTrigger className="w-auto min-w-[180px] text-xs font-bold rounded-xl h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">👥 هەموو بەکارهێنەران</SelectItem>
              {uniqueUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-3">{filtered.length} چالاکی</p>

      {/* Log list */}
      {loading ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <RefreshCw className="size-8 animate-spin mb-3 opacity-40" />
          <p className="text-sm">چاوەڕوان بکە...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-muted-foreground text-sm">هیچ چالاکییەک نەدۆزرایەوە</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {filtered.map(log => {
              const cfg = ACTION_CONFIG[log.action] || { label: log.action, emoji: "•", cls: "bg-muted text-muted-foreground" };
              const color = avatarColor(log.user_id);
              return (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors">
                  {/* Avatar */}
                  <div className="size-9 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0"
                    style={{ background: color }}>
                    {getInitials(log.user_name)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="font-bold text-sm">{log.user_name}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5">
                        {ROLE_LABELS[log.user_role] || log.user_role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={cn("text-[11px] gap-0.5", cfg.cls)}>
                        {cfg.emoji} {cfg.label}
                      </Badge>
                      {log.entity_name && log.entity_name !== log.entity_id && (
                        <span className="text-xs text-foreground font-semibold">— {log.entity_name}</span>
                      )}
                      {typeof log.meta?.clientName === "string" && (
                        <span className="text-xs text-muted-foreground">بۆ {log.meta.clientName}</span>
                      )}
                    </div>
                  </div>

                  {/* Time */}
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0 pt-0.5">
                    {timeAgo(log.created_at)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
