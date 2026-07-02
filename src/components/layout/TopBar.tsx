"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, Calendar, SlidersHorizontal, Plus, X, Sparkles, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { useLayout, type DateRange } from "@/app/dashboard/layout";
import { useData } from "@/lib/store";
import CommandMenu from "@/components/ui/CommandMenu";

// ── Date period helpers ─────────────────────────────────────────────────────
function buildDateRange(period: string): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (period) {
    case "ئەمڕۆ":
      return { from: today, to: new Date(today.getTime() + 86399999), label: "ئەمڕۆ" };
    case "حەفتەی ڕابردوو": {
      const from = new Date(today); from.setDate(from.getDate() - 6);
      return { from, to: new Date(today.getTime() + 86399999), label: "حەفتەی ڕابردوو" };
    }
    case "مانگی ڕابردوو": {
      const from = new Date(today); from.setDate(from.getDate() - 29);
      return { from, to: new Date(today.getTime() + 86399999), label: "مانگی ڕابردوو" };
    }
    case "٣ مانگی ڕابردوو": {
      const from = new Date(today); from.setDate(from.getDate() - 89);
      return { from, to: new Date(today.getTime() + 86399999), label: "٣ مانگی ڕابردوو" };
    }
    case "ساڵی ئێستا": {
      const from = new Date(today.getFullYear(), 0, 1);
      return { from, to: new Date(today.getTime() + 86399999), label: "ساڵی ئێستا" };
    }
    default:
      return { from: null, to: null, label: "هەموو ماوەکان" };
  }
}

// Status key → Kurdish label
const STATUS_LABELS: Record<string, string> = {
  all: "هەموو",
  WAITING: "چاوەڕوان",
  IN_PROGRESS: "لە پڕۆسەدا",
  NOT_ACCEPTED: "ڕەتکراوە",
  READY: "ئامادەیە",
  SENT: "نێردراوە",
  DELIVERED: "گەیشتووە",
  PAID: "پارەدراوە",
};

export default function TopBar() {
  const router = useRouter();
  const {
    searchOpen, setSearchOpen,
    notifOpen, setNotifOpen,
    currentUser, setAiOpen,
    dateRange, setDateRange,
    globalStatusFilter, setGlobalStatusFilter,
  } = useLayout();

  const { orders, products } = useData();

  const [dateOpen, setDateOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // Close on Escape / open on Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setNotifOpen(false);
        setDateOpen(false);
        setFilterOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setSearchOpen, setNotifOpen]);

  const firstName = currentUser?.name?.split(" ")[0] || "بەکارهێنەر";

  // ── Real notifications from live data ──────────────────────────────────────
  const notifications = useMemo(() => {
    const now = Date.now();
    const notes: { id: string; text: string; time: string; read: boolean; icon: "warn" | "ok" | "clock" }[] = [];

    // 1. Orders waiting > 2 hours
    orders
      .filter(o => o.status === "WAITING")
      .slice(0, 3)
      .forEach(o => {
        const diff = now - new Date(o.createdAt).getTime();
        const hrs = Math.floor(diff / 3_600_000);
        if (hrs >= 1) {
          notes.push({
            id: `wait-${o.id}`,
            text: `داواکاری ${o.orderNumber} چاوەڕوانە (${hrs} کاتژمێر)`,
            time: `${hrs} کاتژمێر پێشتر`,
            read: false,
            icon: "clock",
          });
        }
      });

    // 2. Delivered but not paid
    orders
      .filter(o => o.status === "DELIVERED")
      .slice(0, 2)
      .forEach(o => {
        notes.push({
          id: `unpaid-${o.id}`,
          text: `${o.clientName} — گەیشتووە و پارەی نەداوە`,
          time: new Date(o.createdAt).toLocaleDateString("ar-IQ"),
          read: false,
          icon: "warn",
        });
      });

    // 3. Near-expiry products (within 60 days)
    products
      .filter(p => {
        if (!p.expiryDate) return false;
        const diff = new Date(p.expiryDate).getTime() - now;
        return diff > 0 && diff < 60 * 86_400_000;
      })
      .slice(0, 3)
      .forEach(p => {
        const days = Math.floor((new Date(p.expiryDate!).getTime() - now) / 86_400_000);
        notes.push({
          id: `exp-${p.id}`,
          text: `${p.name} — بەسەرچوون لە ${days} رۆژ`,
          time: `${days} رۆژ`,
          read: true,
          icon: "warn",
        });
      });

    return notes.slice(0, 6);
  }, [orders, products]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const [formattedDate, setFormattedDate] = useState("");
  useEffect(() => {
    setFormattedDate(new Date().toLocaleDateString("ckb", { year: "numeric", month: "long", day: "numeric" }));
  }, []);

  const handlePeriodSelect = (period: string) => {
    setDateRange(buildDateRange(period));
    setDateOpen(false);
  };

  const handleStatusSelect = (statusKey: string) => {
    setGlobalStatusFilter(statusKey === "all" ? "هەموو" : STATUS_LABELS[statusKey] ?? statusKey);
    setFilterOpen(false);
    router.push("/dashboard/orders");
  };

  const iconEl = (icon: "warn" | "ok" | "clock") => {
    if (icon === "warn") return <AlertTriangle size={13} color="#FD7E14" />;
    if (icon === "ok") return <CheckCircle2 size={13} color="#40C057" />;
    return <Clock size={13} color="#4263EB" />;
  };

  return (
    <>
      <header className="topbar" id="topbar">
        <div className="topbar-right">
          <div className="topbar-welcome">
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="topbar-avatar"
                style={{ objectFit: "cover", border: "2px solid #EDF2FF" }}
              />
            ) : (
              <div className="topbar-avatar" style={{
                background: "linear-gradient(135deg, #4263EB, #7C5CFC)",
                color: "white",
                fontWeight: 700,
                fontSize: currentUser?.name && currentUser.name.trim().split(" ").length >= 2 ? 13 : 16,
                letterSpacing: 0.5,
                userSelect: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {currentUser?.name
                  ? currentUser.name.trim().split(" ").slice(0, 2).map((w: string) => w[0]).join("")
                  : "؟"}
              </div>
            )}
            <div className="topbar-greeting">
              <h2>بەخێربێیتەوە، {firstName}</h2>
              <p>بەخێربێیتەوە بۆ دەوا 🌿</p>
            </div>
          </div>
        </div>

        <div className="topbar-left">
          <button className="topbar-btn" aria-label="Search" id="topbar-search" onClick={() => setSearchOpen(true)}>
            <Search size={18} />
          </button>

          {/* AI Assistant button */}
          <button
            id="topbar-ai"
            aria-label="AI Assistant"
            onClick={() => setAiOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 20,
              border: "1px solid #C7D2FE",
              background: "linear-gradient(135deg, #EEF2FF, #F5F3FF)",
              color: "#4263EB", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 1px 4px rgba(66,99,235,0.15)",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "linear-gradient(135deg, #4263EB, #7C5CFC)";
              e.currentTarget.style.color = "white";
              e.currentTarget.style.borderColor = "transparent";
              e.currentTarget.style.boxShadow = "0 2px 12px rgba(66,99,235,0.4)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "linear-gradient(135deg, #EEF2FF, #F5F3FF)";
              e.currentTarget.style.color = "#4263EB";
              e.currentTarget.style.borderColor = "#C7D2FE";
              e.currentTarget.style.boxShadow = "0 1px 4px rgba(66,99,235,0.15)";
            }}
          >
            <Sparkles size={15} />
            <span>دەوا AI</span>
          </button>

          {/* ── Notifications ── */}
          <div style={{ position: "relative" }}>
            <button className="topbar-btn" aria-label="Notifications" id="topbar-notifications"
              onClick={() => setNotifOpen(!notifOpen)} style={{ position: "relative" }}>
              <Bell size={18} />
              {unreadCount > 0 && (
                <span style={{
                  position: "absolute", top: 5, left: 5,
                  width: unreadCount > 9 ? 16 : 8, height: 8,
                  borderRadius: unreadCount > 9 ? 8 : "50%",
                  background: "#FA5252",
                  fontSize: 9, color: "white", fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  paddingInline: unreadCount > 9 ? 2 : 0,
                }}>
                  {unreadCount > 9 ? "9+" : ""}
                </span>
              )}
            </button>
            {notifOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 8, width: 360, background: "white", borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,0.15)", border: "1px solid #E9ECEF", zIndex: 100, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #E9ECEF", fontWeight: 700, fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>ئاگادارییەکان {unreadCount > 0 && <span style={{ background: "#FA5252", color: "white", borderRadius: 10, padding: "1px 7px", fontSize: 11, marginRight: 6 }}>{unreadCount}</span>}</span>
                  <button onClick={() => setNotifOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ADB5BD" }}><X size={16} /></button>
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: "24px 20px", textAlign: "center", color: "#ADB5BD", fontSize: 13 }}>هیچ ئاگادارییەک نییە ✓</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{ padding: "12px 20px", borderBottom: "1px solid #F1F3F5", background: n.read ? "white" : "#FFF9DB", display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ marginTop: 2, flexShrink: 0 }}>{iconEl(n.icon)}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, lineHeight: 1.5 }}>{n.text}</div>
                        <div style={{ fontSize: 11, color: "#ADB5BD", marginTop: 3 }}>{n.time}</div>
                      </div>
                    </div>
                  ))
                )}
                <div style={{ padding: "10px 20px", borderTop: "1px solid #F1F3F5", textAlign: "center" }}>
                  <button onClick={() => { router.push("/dashboard/orders"); setNotifOpen(false); }}
                    style={{ fontSize: 12, color: "#4263EB", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                    بینینی هەموو داواکارییەکان
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Date filter ── */}
          <div style={{ position: "relative" }}>
            <button className="topbar-date-btn" id="topbar-date" onClick={() => setDateOpen(!dateOpen)}
              style={dateRange.from ? { borderColor: "#4263EB", color: "#4263EB" } : {}}>
              <Calendar size={16} />
              <span>{dateRange.label || formattedDate}</span>
            </button>
            {dateOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 8, width: 220, background: "white", borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,0.15)", border: "1px solid #E9ECEF", zIndex: 100, padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  ماوەی کات
                  <button onClick={() => setDateOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ADB5BD" }}><X size={15} /></button>
                </div>
                {["هەموو ماوەکان", "ئەمڕۆ", "حەفتەی ڕابردوو", "مانگی ڕابردوو", "٣ مانگی ڕابردوو", "ساڵی ئێستا"].map(period => (
                  <button key={period} onClick={() => handlePeriodSelect(period)}
                    style={{
                      display: "block", width: "100%", padding: "9px 12px", borderRadius: 8,
                      border: dateRange.label === period ? "1.5px solid #4263EB" : "1.5px solid transparent",
                      background: dateRange.label === period ? "#EDF2FF" : "white",
                      color: dateRange.label === period ? "#4263EB" : "#495057",
                      fontSize: 13, fontWeight: dateRange.label === period ? 700 : 500,
                      cursor: "pointer", fontFamily: "inherit", textAlign: "right", marginBottom: 4,
                    }}
                    onMouseEnter={e => { if (dateRange.label !== period) e.currentTarget.style.background = "#F8F9FA"; }}
                    onMouseLeave={e => { if (dateRange.label !== period) e.currentTarget.style.background = "white"; }}
                  >{period}</button>
                ))}
              </div>
            )}
          </div>

          {/* ── Status filter ── */}
          <div style={{ position: "relative" }}>
            <button className="topbar-filter-btn" id="topbar-filter" onClick={() => setFilterOpen(!filterOpen)}
              style={globalStatusFilter !== "هەموو" ? { borderColor: "#4263EB", color: "#4263EB" } : {}}>
              <SlidersHorizontal size={16} />
              <span>{globalStatusFilter !== "هەموو" ? globalStatusFilter : "فلتەر"}</span>
            </button>
            {filterOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 8, width: 200, background: "white", borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,0.15)", border: "1px solid #E9ECEF", zIndex: 100, padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  بارودۆخی داواکاری
                  <button onClick={() => setFilterOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ADB5BD" }}><X size={15} /></button>
                </div>
                {[
                  { key: "all",          label: "هەموو" },
                  { key: "WAITING",      label: "چاوەڕوان" },
                  { key: "IN_PROGRESS",  label: "لە پڕۆسەدا" },
                  { key: "NOT_ACCEPTED", label: "ڕەتکراوە" },
                  { key: "READY",        label: "ئامادەیە" },
                  { key: "SENT",         label: "نێردراوە" },
                  { key: "DELIVERED",    label: "گەیشتووە" },
                  { key: "PAID",         label: "پارەدراوە" },
                ].map(f => {
                  const active = globalStatusFilter === f.label;
                  return (
                    <button key={f.key} onClick={() => handleStatusSelect(f.key)}
                      style={{
                        display: "block", width: "100%", padding: "9px 12px", borderRadius: 8,
                        border: active ? "1.5px solid #4263EB" : "1.5px solid transparent",
                        background: active ? "#EDF2FF" : "white",
                        color: active ? "#4263EB" : "#495057",
                        fontSize: 13, fontWeight: active ? 700 : 500,
                        cursor: "pointer", fontFamily: "inherit", textAlign: "right", marginBottom: 4,
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#F8F9FA"; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "white"; }}
                    >{f.label}</button>
                  );
                })}
              </div>
            )}
          </div>

          <button className="topbar-add-btn" id="topbar-add" onClick={() => router.push("/dashboard/orders")}>
            <Plus size={16} />
            <span>داواکاری نوێ</span>
          </button>
        </div>
      </header>

      <CommandMenu open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
