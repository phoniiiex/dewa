"use client";
import { useEffect, useState, useMemo } from "react";
import { useLayout } from "@/app/dashboard/layout";
import { supabase } from "@/lib/supabase";
import { Activity, ShoppingCart, Users, Package, RefreshCw, Filter } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
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

// ── Action config ──────────────────────────────────────────────────────────────
const ACTION_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  CREATE_ORDER:            { label: "داواکاری نوێ دروستکرا",    emoji: "🛒", color: "#4263EB", bg: "#EDF2FF" },
  EDIT_ORDER:              { label: "داواکاری دەستکاری کرا",     emoji: "✏️", color: "#7950F2", bg: "#F3F0FF" },
  ORDER_STATUS_WAITING:    { label: "داواکاری چاوەڕوانی کرا",   emoji: "⏳", color: "#E67700", bg: "#FFF3BF" },
  ORDER_STATUS_IN_PROGRESS:{ label: "داواکاری دەستپێکرا",       emoji: "🔄", color: "#7C5CFC", bg: "#F3F0FF" },
  ORDER_STATUS_READY:      { label: "داواکاری ئامادەبوو",        emoji: "✅", color: "#1098AD", bg: "#C3FAE8" },
  ORDER_STATUS_SENT:       { label: "داواکاری نێردرا",           emoji: "🚚", color: "#4263EB", bg: "#EDF2FF" },
  ORDER_STATUS_DELIVERED:  { label: "داواکاری گەیشت",            emoji: "📦", color: "#F47B35", bg: "#FFF3BF" },
  ORDER_STATUS_PAID:       { label: "داواکاری پارەی داوە",       emoji: "💰", color: "#2F9E44", bg: "#D3F9D8" },
  ORDER_STATUS_REJECTED:   { label: "داواکاری ڕەتکرایەوە",      emoji: "❌", color: "#E03131", bg: "#FFE3E3" },
  CREATE_CLIENT:           { label: "کڕیاری نوێ زیادکرا",       emoji: "👤", color: "#2F9E44", bg: "#D3F9D8" },
  UPDATE_CLIENT:           { label: "زانیاری کڕیار گۆڕا",       emoji: "📝", color: "#1098AD", bg: "#C3FAE8" },
  CREATE_PRODUCT:          { label: "بەرهەمی نوێ زیادکرا",      emoji: "📦", color: "#7950F2", bg: "#F3F0FF" },
  UPDATE_PRODUCT:          { label: "بەرهەم نوێکرایەوە",        emoji: "🔧", color: "#E67700", bg: "#FFF3BF" },
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "بەڕێوەبەر", MANAGER: "بەڕێوەبەری مامناوەند", REP: "نوێنەر"
};

const ENTITY_FILTERS = [
  { key: "ALL",     label: "هەموو",       icon: <Activity size={14} /> },
  { key: "ORDER",   label: "داواکارییەکان", icon: <ShoppingCart size={14} /> },
  { key: "CLIENT",  label: "کڕیارەکان",   icon: <Users size={14} /> },
  { key: "PRODUCT", label: "بەرهەمەکان", icon: <Package size={14} /> },
];

// ── Time-ago helper ────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return "چەند چرکەیەک پێش";
  if (diff < 3600) return `${Math.floor(diff / 60)} خولەک پێش`;
  if (diff < 86400)return `${Math.floor(diff / 3600)} کاتژمێر پێش`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ڕۆژ پێش`;
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ActivitiesPage() {
  const { currentUser } = useLayout();
  const isManager = currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [userFilter, setUserFilter] = useState("ALL");
  const [uniqueUsers, setUniqueUsers] = useState<{ id: string; name: string }[]>([]);

  const fetchLogs = async () => {
    let q = supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!isManager && currentUser?.id) {
      q = q.eq("user_id", currentUser.id);
    }

    const { data } = await q;
    const rows = (data || []) as ActivityLog[];
    setLogs(rows);

    // Extract unique users for filter dropdown
    const seen = new Map<string, string>();
    rows.forEach(r => { if (!seen.has(r.user_id)) seen.set(r.user_id, r.user_name); });
    setUniqueUsers(Array.from(seen, ([id, name]) => ({ id, name })));
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();

    // Real-time subscription
    const channel = supabase
      .channel("activity_logs_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" },
        (payload) => {
          const newLog = payload.new as ActivityLog;
          if (!isManager && newLog.user_id !== currentUser?.id) return;
          setLogs(prev => [newLog, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, isManager]);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (entityFilter !== "ALL" && l.entity_type !== entityFilter) return false;
      if (userFilter !== "ALL" && l.user_id !== userFilter) return false;
      return true;
    });
  }, [logs, entityFilter, userFilter]);

  const pill: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 14px",
    borderRadius: 10, border: "1.5px solid", cursor: "pointer", fontSize: 12,
    fontWeight: 700, transition: "all .15s", fontFamily: "inherit",
  };

  return (
    <div style={{ padding: "24px", maxWidth: 860, margin: "0 auto", direction: "rtl" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1A1A2E", margin: 0 }}>📋 چالاکییەکان</h1>
          <p style={{ color: "#6C757D", fontSize: 13, margin: "4px 0 0" }}>
            کێ چی کرد و کەی — {isManager ? "هەموو بەکارهێنەران" : "چالاکییەکانی خۆت"}
          </p>
        </div>
        <button onClick={() => { setLoading(true); fetchLogs(); }}
          style={{ ...pill, borderColor: "#DEE2E6", background: "#fff", color: "#495057" }}>
          <RefreshCw size={13} /> نوێکردنەوە
        </button>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {ENTITY_FILTERS.map(f => {
          const active = entityFilter === f.key;
          return (
            <button key={f.key} onClick={() => setEntityFilter(f.key)}
              style={{ ...pill, borderColor: active ? "#4263EB" : "#DEE2E6", background: active ? "#EDF2FF" : "#fff", color: active ? "#4263EB" : "#495057" }}>
              {f.icon} {f.label}
            </button>
          );
        })}

        {isManager && uniqueUsers.length > 0 && (
          <select value={userFilter} onChange={e => setUserFilter(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 10, border: "1.5px solid #DEE2E6", fontSize: 12, fontWeight: 700, background: "#fff", color: "#495057", cursor: "pointer", fontFamily: "inherit" }}>
            <option value="ALL">👥 هەموو بەکارهێنەران</option>
            {uniqueUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
      </div>

      {/* ── Count badge ── */}
      <div style={{ fontSize: 12, color: "#6C757D", marginBottom: 14 }}>
        {filtered.length} چالاکی
      </div>

      {/* ── Log list ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#ADB5BD" }}>
          <div style={{ width: 36, height: 36, border: "3px solid #DEE2E6", borderTopColor: "#4263EB", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          <div style={{ fontSize: 13 }}>چاوەڕوان بکە...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: "#F8F9FA", borderRadius: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
          <div style={{ color: "#ADB5BD", fontSize: 13 }}>هیچ چالاکییەک نەدۆزرایەوە</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {filtered.map((log, idx) => {
            const cfg = ACTION_CONFIG[log.action] || { label: log.action, emoji: "•", color: "#495057", bg: "#F8F9FA" };
            const color = avatarColor(log.user_id);

            return (
              <div key={log.id} style={{
                display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px",
                background: idx % 2 === 0 ? "#fff" : "#FAFAFA",
                borderBottom: "1px solid #F1F3F5",
                borderRadius: idx === 0 ? "12px 12px 0 0" : idx === filtered.length - 1 ? "0 0 12px 12px" : 0,
              }}>
                {/* Avatar */}
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                  {getInitials(log.user_name)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#1A1A2E" }}>{log.user_name}</span>
                    <span style={{ fontSize: 11, color: "#ADB5BD", background: "#F1F3F5", padding: "1px 7px", borderRadius: 6 }}>{ROLE_LABELS[log.user_role] || log.user_role}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, padding: "3px 8px", borderRadius: 7, background: cfg.bg, color: cfg.color, fontWeight: 700 }}>
                      {cfg.emoji} {cfg.label}
                    </span>
                    {log.entity_name && log.entity_name !== log.entity_id && (
                      <span style={{ fontSize: 12, color: "#495057", fontWeight: 600 }}>— {log.entity_name}</span>
                    )}
                    {typeof log.meta?.clientName === "string" && (
                      <span style={{ fontSize: 12, color: "#6C757D" }}>بۆ {log.meta.clientName}</span>
                    )}
                  </div>
                </div>

                {/* Time */}
                <div style={{ fontSize: 11, color: "#ADB5BD", whiteSpace: "nowrap", flexShrink: 0, paddingTop: 4 }}>
                  {timeAgo(log.created_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
