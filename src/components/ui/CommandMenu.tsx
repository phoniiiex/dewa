"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, ShoppingCart, Users, Package, Truck,
  ChevronLeft, LayoutDashboard, FileText, Warehouse,
  UserCog, BarChart2, X, Building2, User, BadgeCheck,
} from "lucide-react";
import { useData } from "@/lib/store";

// ──────────── Types ────────────
interface CMItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  iconBg: string;
  href?: string;
  action?: () => void;
  group: string;
}

// ──────────── Quick Actions ────────────
const quickActions = [
  { id: "qa-order",   label: "داواکاری نوێ",  sub: "بەرهەم دابین بکە",   iconBg: "#EBF1FF", iconColor: "#4263EB",  icon: "order" },
  { id: "qa-client",  label: "کڕیاری نوێ",   sub: "فرۆشگا زیاد بکە",   iconBg: "#EFEBFF", iconColor: "#7C3AED",  icon: "client" },
  { id: "qa-product", label: "بەرهەمی نوێ",  sub: "دەرمان زیاد بکە",   iconBg: "#E3F7EC", iconColor: "#2B8A3E",  icon: "product" },
  { id: "qa-invoice", label: "پسووڵەکان",    sub: "چاپ و ئەرشیف",      iconBg: "#FFF3BF", iconColor: "#E67700",  icon: "invoice" },
];

const QAIcon = ({ icon, color }: { icon: string; color: string }) => {
  const s = { size: 18, color };
  if (icon === "order")   return <ShoppingCart {...s} />;
  if (icon === "client")  return <Users {...s} />;
  if (icon === "product") return <Package {...s} />;
  if (icon === "invoice") return <FileText {...s} />;
  return null;
};

// ──────────── Nav Pages ────────────
const navPages = [
  { label: "داشبۆرد",       href: "/dashboard",            icon: <LayoutDashboard size={16} />, iconBg: "#EBF1FF" },
  { label: "داواکارییەکان", href: "/dashboard/orders",     icon: <ShoppingCart size={16} />,    iconBg: "#FEF3EB" },
  { label: "بەرهەمەکان",   href: "/dashboard/products",   icon: <Package size={16} />,         iconBg: "#E3F7EC" },
  { label: "کڕیارەکان",    href: "/dashboard/clients",    icon: <Users size={16} />,           iconBg: "#EBF1FF" },
  { label: "نوێنەرەکان",   href: "/dashboard/reps",       icon: <UserCog size={16} />,         iconBg: "#F8F0FF" },
  { label: "کۆگاکان",      href: "/dashboard/warehouses", icon: <Warehouse size={16} />,       iconBg: "#FFF3BF" },
  { label: "گواستنەوەکان", href: "/dashboard/logistics",  icon: <Truck size={16} />,           iconBg: "#FFE3E3" },
  { label: "ڕاپۆرت",       href: "/dashboard/analytics",  icon: <BarChart2 size={16} />,       iconBg: "#E3F7EC" },
  { label: "پسووڵەکان",    href: "/dashboard/invoices",   icon: <FileText size={16} />,        iconBg: "#FFF3BF" },
  { label: "بەکارهێنەرەکان", href: "/dashboard/users",   icon: <User size={16} />,            iconBg: "#FFF0F6" },
  { label: "پاڵگرەکان",    href: "/dashboard/suppliers",  icon: <Building2 size={16} />,       iconBg: "#E8F4FD" },
];

const roleLabels: Record<string, string> = {
  ADMIN: "بەڕێوەبەر",
  MANAGER: "بەڕێوەبەری ناوەڕاست",
  REP: "نوێنەر",
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommandMenu({ open, onClose }: Props) {
  const router = useRouter();
  const { products, clients, orders, reps, users, warehouses, suppliers } = useData();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  // Case-insensitive search helper
  const match = (text: string | undefined | null, q: string) =>
    (text || "").toLowerCase().includes(q.toLowerCase());

  // Build flat result list for keyboard nav
  const results: CMItem[] = query.trim()
    ? [
        // ── بەکارهێنەرەکان (Users / Profiles) ──
        ...users.filter(u =>
          match(u.name, query) || match(u.email, query) || match(u.phone, query) || match(u.city, query)
        ).slice(0, 5).map(u => ({
          id: u.id, label: u.name,
          sublabel: `${roleLabels[u.role] || u.role} • ${u.email}`,
          icon: <User size={15} />, iconBg: "#FFF0F6", href: "/dashboard/users", group: "بەکارهێنەرەکان"
        })),

        // ── بەرهەمەکان ──
        ...products.filter(p =>
          match(p.name, query) || match(p.sku, query) || match(p.category, query)
        ).slice(0, 4).map(p => ({
          id: p.id, label: p.name,
          sublabel: `${p.sku}${p.category ? " • " + p.category : ""} • ${p.stock} بەردەست`,
          icon: <Package size={15} />, iconBg: "#E3F7EC", href: "/dashboard/products", group: "بەرهەمەکان"
        })),

        // ── کڕیارەکان ──
        ...clients.filter(c =>
          match(c.name, query) || match(c.city, query) || match(c.phone, query) || match(c.owner, query)
        ).slice(0, 4).map(c => ({
          id: c.id, label: c.name,
          sublabel: `${c.owner ? c.owner + " • " : ""}${c.city} • ${c.phone}`,
          icon: <Users size={15} />, iconBg: "#EBF1FF", href: "/dashboard/clients", group: "کڕیارەکان"
        })),

        // ── داواکارییەکان ──
        ...orders.filter(o =>
          match(o.orderNumber, query) || match(o.clientName, query) || match(o.repName, query)
        ).slice(0, 3).map(o => ({
          id: o.id, label: o.orderNumber,
          sublabel: `${o.clientName}${o.repName ? " • " + o.repName : ""}`,
          icon: <ShoppingCart size={15} />, iconBg: "#FEF3EB", href: "/dashboard/orders", group: "داواکارییەکان"
        })),

        // ── نوێنەرەکان ──
        ...reps.filter(r =>
          match(r.name, query) || match(r.city, query) || match(r.phone, query)
        ).slice(0, 3).map(r => ({
          id: r.id, label: r.name,
          sublabel: `${r.city} • ${r.phone}`,
          icon: <UserCog size={15} />, iconBg: "#F8F0FF", href: "/dashboard/reps", group: "نوێنەرەکان"
        })),

        // ── کۆگاکان ──
        ...warehouses.filter(w =>
          match(w.name, query) || match(w.city, query) || match(w.contact, query)
        ).slice(0, 2).map(w => ({
          id: w.id, label: w.name,
          sublabel: `${w.city}${w.bonusPct ? " • %" + w.bonusPct + " بۆنەس" : ""}`,
          icon: <Warehouse size={15} />, iconBg: "#FFF3BF", href: "/dashboard/warehouses", group: "کۆگاکان"
        })),

        // ── پاڵگرەکان ──
        ...suppliers.filter(s =>
          match(s.name, query) || match(s.country, query) || match(s.contact, query)
        ).slice(0, 2).map(s => ({
          id: s.id, label: s.name,
          sublabel: `${s.country} • ${s.contact}`,
          icon: <Building2 size={15} />, iconBg: "#E8F4FD", href: "/dashboard/suppliers", group: "پاڵگرەکان"
        })),

        // ── لاپەڕەکان ──
        ...navPages.filter(p => match(p.label, query)).slice(0, 3).map((p, i) => ({
          id: `nav-${i}`, label: p.label, icon: p.icon, iconBg: p.iconBg, href: p.href, group: "لاپەڕەکان"
        })),
      ]
    : navPages.map((p, i) => ({
        id: `nav-${i}`, label: p.label, icon: p.icon, iconBg: p.iconBg, href: p.href, group: "لاپەڕەکان"
      }));

  // Group results
  const grouped = results.reduce<Record<string, CMItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const flatItems = results;

  const navigate = useCallback((item: CMItem) => {
    if (item.action) item.action();
    else if (item.href) router.push(item.href);
    onClose();
  }, [router, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, flatItems.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && flatItems[activeIdx]) { e.preventDefault(); navigate(flatItems[activeIdx]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, activeIdx, flatItems, navigate, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  if (!open) return null;

  const handleQA = (qa: typeof quickActions[0]) => {
    if (qa.id === "qa-order")   router.push("/dashboard/orders");
    if (qa.id === "qa-client")  router.push("/dashboard/clients");
    if (qa.id === "qa-product") router.push("/dashboard/products");
    if (qa.id === "qa-invoice") router.push("/dashboard/invoices");
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(10, 10, 20, 0.45)",
          backdropFilter: "blur(6px)",
          animation: "fadeIn 0.12s ease",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: "10vh",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1001,
          width: 620,
          maxWidth: "calc(100vw - 32px)",
          background: "white",
          borderRadius: 20,
          boxShadow: "0 1px 1px rgba(51,51,51,0.04), 0 3px 6px rgba(51,51,51,0.04), 0 12px 24px rgba(51,51,51,0.08), 0 32px 64px rgba(51,51,51,0.12), 0 0 0 1px #EBEBEB",
          overflow: "hidden",
          animation: "cmdSlideIn 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        {/* Search Input */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 20px",
          borderBottom: "1px solid #EBEBEB",
          background: "white",
        }}>
          <Search size={18} color="#A3A3A3" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
            placeholder="بگەڕێ بۆ بەرهەم، کڕیار، بەکارهێنەر، داواکاری، کۆگا یان فەرمان..."
            style={{
              flex: 1,
              border: "none", outline: "none",
              fontSize: 14, fontFamily: "inherit",
              background: "transparent",
              color: "#171717",
              letterSpacing: -0.084,
            }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#A3A3A3", display: "flex" }}>
              <X size={15} />
            </button>
          )}
          <kbd style={{
            padding: "2px 7px", borderRadius: 4, border: "1px solid #EBEBEB",
            fontSize: 11, fontWeight: 600, color: "#A3A3A3",
            letterSpacing: 0.5, fontFamily: "inherit", background: "white",
          }}>
            ESC
          </kbd>
        </div>

        {/* Quick Actions (shown when no query) */}
        {!query && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            borderBottom: "1px solid #EBEBEB",
          }}>
            {quickActions.map((qa, i) => (
              <button
                key={qa.id}
                onClick={() => handleQA(qa)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                  padding: "16px 12px",
                  border: "none",
                  borderRight: i < 3 ? "1px solid #EBEBEB" : "none",
                  background: "white",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F5F5F5")}
                onMouseLeave={e => (e.currentTarget.style.background = "white")}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: qa.iconBg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <QAIcon icon={qa.icon} color={qa.iconColor} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#171717", lineHeight: 1.4 }}>{qa.label}</div>
                  <div style={{ fontSize: 11, color: "#5C5C5C", lineHeight: 1.4 }}>{qa.sub}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <div
          ref={listRef}
          style={{ maxHeight: query ? 380 : 300, overflowY: "auto", padding: "8px 0" }}
        >
          {query && results.length === 0 && (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "#A3A3A3", fontSize: 13 }}>
              <Search size={28} style={{ margin: "0 auto 10px", display: "block", opacity: 0.3 }} />
              هیچ ئەنجامێک نەدۆزرایەوە بۆ «{query}»
            </div>
          )}

          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              {/* Group header */}
              <div style={{
                padding: "8px 16px 4px",
                fontSize: 11, fontWeight: 700, color: "#A3A3A3",
                textTransform: "uppercase", letterSpacing: 0.6,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                {group === "داواکارییەکان" && <ShoppingCart size={10} />}
                {group === "بەرهەمەکان"    && <Package size={10} />}
                {group === "کڕیارەکان"     && <Users size={10} />}
                {group === "نوێنەرەکان"    && <UserCog size={10} />}
                {group === "بەکارهێنەرەکان" && <User size={10} />}
                {group === "کۆگاکان"       && <Warehouse size={10} />}
                {group === "پاڵگرەکان"     && <Building2 size={10} />}
                {group === "لاپەڕەکان"     && <LayoutDashboard size={10} />}
                {group}
              </div>

              {items.map(item => {
                const globalIdx = flatItems.findIndex(f => f.id === item.id);
                const isActive = globalIdx === activeIdx;
                return (
                  <div
                    key={item.id}
                    data-idx={globalIdx}
                    onClick={() => navigate(item)}
                    onMouseEnter={() => setActiveIdx(globalIdx)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "9px 16px",
                      cursor: "pointer",
                      background: isActive ? "#F0F4FF" : "transparent",
                      borderRight: isActive ? "2px solid #4263EB" : "2px solid transparent",
                      transition: "background 0.08s",
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: item.iconBg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#4263EB",
                    }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, color: "#171717", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.label}
                      </div>
                      {item.sublabel && (
                        <div style={{ fontSize: 11, color: "#A3A3A3", marginTop: 1 }}>{item.sublabel}</div>
                      )}
                    </div>
                    {isActive && <ChevronLeft size={14} color="#4263EB" style={{ flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", gap: 20,
          padding: "10px 20px",
          borderTop: "1px solid #EBEBEB",
          background: "#FAFAFA",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#A3A3A3" }}>
            <kbd style={kbdStyle}>↑</kbd>
            <kbd style={kbdStyle}>↓</kbd>
            <span>ناوبەری</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#A3A3A3" }}>
            <kbd style={kbdStyle}>↵</kbd>
            <span>کراندنەوە</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#A3A3A3" }}>
            <kbd style={kbdStyle}>ESC</kbd>
            <span>داخستن</span>
          </div>
          <div style={{ marginRight: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#C8C8C8" }}>
            <kbd style={{ ...kbdStyle, letterSpacing: -0.5 }}>⌘K</kbd>
            <span>بکەرەوە</span>
          </div>
        </div>
      </div>
    </>
  );
}

const kbdStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  minWidth: 20, height: 20, padding: "0 5px",
  borderRadius: 4, border: "1px solid #E0E0E0",
  background: "white", fontSize: 10, fontWeight: 600,
  color: "#5C5C5C", fontFamily: "inherit",
  boxShadow: "0 1px 0 #E0E0E0",
};
