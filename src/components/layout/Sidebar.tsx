"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  LayoutDashboard,
  BarChart3,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Building2,
  Factory,
  Gift,
  UserCog,
  Wallet,
  Settings,
  HelpCircle,
  BadgeCheck,
  FileText,
  Bot,
  FlaskConical,
  Shield,
  Camera,
  LogOut,
  Edit3,
  Save,
  X,
  Phone,
} from "lucide-react";
import { useLayout } from "@/app/dashboard/layout";
import { useData } from "@/lib/store";
import { supabase } from "@/lib/supabase";

/* ──────────────────────────────────────────────────────
   Types
────────────────────────────────────────────────────── */
interface NavSubItem {
  label: string;
  href: string;
  badge?: number;
}

interface NavSection {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  managerOnly?: boolean;
  items?: NavSubItem[];
}

/* ──────────────────────────────────────────────────────
   Edit Profile Modal
────────────────────────────────────────────────────── */
function EditProfileModal({
  open, onClose, initialName, initialPhone, initialAvatar, onSave,
}: {
  open: boolean; onClose: () => void;
  initialName: string; initialPhone: string; initialAvatar: string;
  onSave: (d: { name: string; phone: string; avatarUrl: string }) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setName(initialName); setPhone(initialPhone); setAvatar(initialAvatar); }
  }, [open, initialName, initialPhone, initialAvatar]);

  if (!open) return null;

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 200;
        const r = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * r);
        canvas.height = Math.round(img.height * r);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        setAvatar(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = ev.target!.result as string;
    };
    reader.readAsDataURL(file);
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 12px", border: "1.5px solid var(--color-border)",
    borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none",
    background: "var(--color-surface)", color: "var(--color-text-primary)", boxSizing: "border-box",
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 999 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "var(--color-surface)", borderRadius: 18, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", width: 380, zIndex: 1000, padding: 28, direction: "rtl" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>دەستکاری پرۆفایل</span>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "var(--color-bg-hover)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
          <div style={{ position: "relative", cursor: "pointer" }} onClick={() => fileRef.current?.click()}>
            {avatar ? (
              <img src={avatar} style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid #4263EB" }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#4263EB,#7C5CFC)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "white" }}>
                {name?.[0] || "؟"}
              </div>
            )}
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "0")}>
              <Camera size={20} color="white" />
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {avatar && <button onClick={() => setAvatar("")} style={{ marginTop: 6, fontSize: 11, color: "#FA5252", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>سڕینەوەی وێنە</button>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>ناو</label>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>ژمارەی مۆبایل</label>
            <input style={inp} value={phone} onChange={e => setPhone(e.target.value)} type="tel" />
          </div>
        </div>
        <button onClick={async () => { setSaving(true); await onSave({ name, phone, avatarUrl: avatar }); setSaving(false); onClose(); }}
          disabled={saving || !name.trim()}
          style={{ marginTop: 22, width: "100%", padding: "12px 0", borderRadius: 10, background: "linear-gradient(135deg,#4263EB,#7C5CFC)", color: "white", fontSize: 14, fontWeight: 700, border: "none", cursor: saving ? "default" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: saving ? 0.7 : 1 }}>
          <Save size={15} /> {saving ? "پاشەکەوتکردن..." : "پاشەکەوتکردن"}
        </button>
      </div>
    </>
  );
}

/* ──────────────────────────────────────────────────────
   Constants
────────────────────────────────────────────────────── */
const RAIL_W = 68;
const PANEL_W = 256;

/* ──────────────────────────────────────────────────────
   Main Sidebar Component
────────────────────────────────────────────────────── */
export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarPosition, currentUser, updateCurrentUserProfile, logout } = useLayout();
  const { settings } = useData();
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase.from("client_requests").select("*", { count: "exact", head: true }).eq("status", "PENDING");
      setPendingCount(count || 0);
    };
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, []);

  const isAdmin = currentUser?.role === "ADMIN";
  const isManager = currentUser?.role === "MANAGER";
  const isAdminOrManager = isAdmin || isManager;

  const sections: NavSection[] = [
    {
      label: "پێشانگا",
      href: "/dashboard",
      icon: <LayoutDashboard size={20} />,
      items: [
        { label: "پێشانگا", href: "/dashboard" },
        ...(isAdminOrManager ? [{ label: "شیکاری", href: "/dashboard/analytics" }] : []),
      ],
    },
    {
      label: "فرۆشتن",
      href: "/dashboard/products",
      icon: <ShoppingCart size={20} />,
      items: [
        { label: "بەرهەمەکان", href: "/dashboard/products" },
        { label: "داواکارییەکان", href: "/dashboard/orders" },
        { label: "پسوولەکان", href: "/dashboard/invoices" },
        { label: "نموونەکان", href: "/dashboard/samples" },
        ...(isAdminOrManager ? [{ label: "بۆنەس", href: "/dashboard/bonus" }] : []),
      ],
    },
    {
      label: "کڕیارەکان",
      href: "/dashboard/clients",
      icon: <Users size={20} />,
      badge: pendingCount > 0 ? pendingCount : undefined,
      items: [
        { label: "کڕیارەکان", href: "/dashboard/clients", badge: pendingCount > 0 ? pendingCount : undefined },
        ...(isAdminOrManager ? [
          { label: "نوێنەری پزیشکی", href: "/dashboard/reps" },
        ] : []),
      ],
    },
    {
      label: "گواستنەوە",
      href: "/dashboard/logistics",
      icon: <Truck size={20} />,
      items: [
        { label: "گواستنەوە", href: "/dashboard/logistics" },
        ...(isAdminOrManager ? [
          { label: "کۆگاکان", href: "/dashboard/warehouses" },
          { label: "دابینکەرەکان", href: "/dashboard/suppliers" },
          { label: "شوفێرەکان", href: "/dashboard/drivers" },
        ] : []),
      ],
    },
    ...(isAdminOrManager ? [{
      label: "کۆمپانیا",
      href: "/dashboard/finance",
      icon: <Wallet size={20} />,
      items: [
        { label: "دارایی", href: "/dashboard/finance" },
        { label: "بەکارهێنەران", href: "/dashboard/users" },
        { label: "بۆت", href: "/dashboard/telegram" },
      ],
    }] : []),
  ];

  const footerSections: NavSection[] = [
    ...(isAdminOrManager ? [{
      label: "ڕێکخستنەکان",
      href: "/dashboard/settings",
      icon: <Settings size={20} />,
    }] : []),
    { label: "یارمەتی", href: "#", icon: <HelpCircle size={20} /> },
  ];

  // Auto-detect active section from pathname
  useEffect(() => {
    const idx = sections.findIndex(s =>
      pathname === s.href || s.items?.some(i => pathname === i.href || pathname.startsWith(i.href + "/"))
    );
    if (idx !== -1) setActiveSection(idx);
  }, [pathname]);

  const currentSection = sections[activeSection];
  const hasSub = Boolean(currentSection?.items?.length);
  const showPanel = isHovering && hasSub;

  const isLeft = sidebarPosition === "left";
  const isTop = sidebarPosition === "top";

  const avatar = currentUser?.avatarUrl || "";
  const userInitials = currentUser?.name
    ? currentUser.name.trim().split(" ").slice(0, 2).map(w => w[0]).join("")
    : "؟";
  const roleBadgeColor = isAdmin ? "#4263EB" : isManager ? "#7C5CFC" : "#40C057";
  const roleBadge = isAdmin ? "بەڕێوەبەر" : isManager ? "مامناوەند" : "نوێنەر";

  const AvatarEl = ({ size = 32 }: { size?: number }) => avatar ? (
    <img src={avatar} alt="profile" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#4263EB,#7C5CFC)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 800, color: "white", flexShrink: 0 }}>
      {userInitials}
    </div>
  );

  /* ── TOP NAV ── */
  if (isTop) {
    const allItems = [...sections, ...footerSections];
    return (
      <>
        <header className="top-nav" id="sidebar">
          <div className="top-nav-logo">
            {settings.logo ? <img src={settings.logo} style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover" }} /> : <div className="sidebar-logo" style={{ width: 28, height: 28, fontSize: 13 }}>د</div>}
            <span className="top-nav-brand">{settings.name || ""}</span>
          </div>
          <nav className="top-nav-items">
            {allItems.map(s => {
              const isActive = pathname === s.href || s.items?.some(i => pathname === i.href);
              return (
                <Link key={s.href} href={s.href} className={`top-nav-item ${isActive ? "active" : ""}`}>
                  <span className="top-nav-item-icon">{s.icon}</span>
                  <span className="top-nav-item-text">{s.label}</span>
                  {s.badge ? <span style={{ background: "#FA5252", color: "white", minWidth: 16, height: 16, borderRadius: 8, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{s.badge > 99 ? "99+" : s.badge}</span> : null}
                </Link>
              );
            })}
          </nav>
          <div className="top-nav-end">
            <div className="top-nav-user" onClick={() => setEditProfileOpen(true)} style={{ cursor: "pointer" }}>
              <AvatarEl size={30} />
              <span style={{ fontSize: 12, fontWeight: 700 }}>{currentUser?.name || "بەکارهێنەر"}</span>
            </div>
            <button onClick={logout} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "var(--color-bg-hover)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><LogOut size={15} /></button>
          </div>
        </header>
        <EditProfileModal open={editProfileOpen} onClose={() => setEditProfileOpen(false)} initialName={currentUser?.name || ""} initialPhone={currentUser?.phone || ""} initialAvatar={avatar} onSave={async d => { await updateCurrentUserProfile(d); }} />
      </>
    );
  }

  /* ── SLIM SIDEBAR (Untitled UI style) ── */
  const sidebarSide = isLeft ? { left: 0 } : { right: 0 };
  const borderSide = isLeft ? { borderRight: "1px solid var(--color-border)" } : { borderLeft: "1px solid var(--color-border)" };
  const panelSide = isLeft
    ? { left: RAIL_W }
    : { right: RAIL_W };

  const renderRailItem = (s: NavSection, idx: number, isFooter = false) => {
    const isActive = !isFooter && idx === activeSection;
    const hasSubActive = s.items?.some(i => pathname === i.href || (i.href !== "/dashboard" && pathname.startsWith(i.href)));
    const highlighted = isActive || hasSubActive || pathname === s.href;

    return (
      <button
        key={s.href}
        onClick={() => {
          if (!isFooter) setActiveSection(idx);
          if (!s.items?.length) window.location.href = s.href;
        }}
        title={s.label}
        style={{
          width: "100%", height: 44, display: "flex", alignItems: "center", justifyContent: "center",
          background: highlighted ? "#EDF2FF" : "transparent",
          border: "none", cursor: "pointer", borderRadius: 8, margin: "2px 0",
          color: highlighted ? "#4263EB" : "var(--color-text-secondary)",
          position: "relative", transition: "all 0.15s", flexShrink: 0,
        }}
        onMouseEnter={e => { if (!highlighted) e.currentTarget.style.background = "var(--color-bg-hover)"; }}
        onMouseLeave={e => { if (!highlighted) e.currentTarget.style.background = "transparent"; }}
      >
        {s.icon}
        {s.badge ? (
          <span style={{
            position: "absolute", top: 6, right: 6, background: "#FA5252", color: "white",
            minWidth: 16, height: 16, borderRadius: 8, fontSize: 9, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
          }}>{s.badge > 99 ? "99+" : s.badge}</span>
        ) : null}
      </button>
    );
  };

  return (
    <>
      {/* Overlay to catch mouse-leave */}
      <div
        id="sidebar"
        style={{
          position: "fixed",
          top: 0, bottom: 0,
          ...sidebarSide,
          width: showPanel ? RAIL_W + PANEL_W : RAIL_W,
          zIndex: 50,
          display: "flex",
          flexDirection: isLeft ? "row" : "row-reverse",
          transition: "width 0.2s ease",
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* ── Main Icon Rail ── */}
        <div style={{
          width: RAIL_W, flexShrink: 0, height: "100%",
          background: "var(--color-bg-card)",
          ...borderSide,
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "8px 0",
          zIndex: 2,
        }}>
          {/* Logo */}
          <div style={{ width: 40, height: 40, borderRadius: 12, overflow: "hidden", marginBottom: 12, flexShrink: 0 }}>
            {settings.logo
              ? <img src={settings.logo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#4263EB,#7C5CFC)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 18 }}>د</div>
            }
          </div>

          {/* Divider */}
          <div style={{ width: 32, height: 1, background: "var(--color-border-light)", marginBottom: 8 }} />

          {/* Main nav icons */}
          <div style={{ flex: 1, width: "100%", overflowY: "auto", overflowX: "hidden", padding: "0 10px", scrollbarWidth: "none" }}>
            {sections.map((s, i) => renderRailItem(s, i))}
          </div>

          {/* Footer icons */}
          <div style={{ width: "100%", padding: "0 10px", borderTop: "1px solid var(--color-border-light)", paddingTop: 8 }}>
            {footerSections.map((s, i) => renderRailItem(s, i, true))}
          </div>

          {/* User avatar */}
          <div
            onClick={() => setEditProfileOpen(true)}
            title="دەستکاری پرۆفایل"
            style={{ cursor: "pointer", marginTop: 8, position: "relative" }}
          >
            <AvatarEl size={36} />
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "0")}>
              <Edit3 size={11} color="white" />
            </div>
          </div>
        </div>

        {/* ── Secondary Sub-panel ── */}
        <AnimatePresence>
          {showPanel && currentSection?.items && (
            <motion.div
              key="panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: PANEL_W, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              style={{
                overflow: "hidden",
                height: "100%",
                background: "var(--color-bg-card)",
                ...(isLeft ? { borderRight: "1px solid var(--color-border)" } : { borderLeft: "1px solid var(--color-border)" }),
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
                boxShadow: isLeft ? "4px 0 20px rgba(0,0,0,0.06)" : "-4px 0 20px rgba(0,0,0,0.06)",
              }}
            >
              {/* Panel header */}
              <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid var(--color-border-light)", flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>
                  {currentSection.label}
                </div>
              </div>

              {/* Sub-items */}
              <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px", scrollbarWidth: "none" }}>
                {currentSection.items.map(item => {
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 12px", borderRadius: 8, marginBottom: 2,
                        background: isActive ? "#EDF2FF" : "transparent",
                        color: isActive ? "#4263EB" : "var(--color-text-secondary)",
                        fontWeight: isActive ? 600 : 400,
                        fontSize: 13, textDecoration: "none",
                        transition: "all 0.12s", whiteSpace: "nowrap",
                        position: "relative",
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--color-bg-hover)"; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      {/* Active dot */}
                      {isActive && (
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4263EB", flexShrink: 0 }} />
                      )}
                      {!isActive && <span style={{ width: 6, flexShrink: 0 }} />}
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
                      {item.badge ? (
                        <span style={{ background: "#FA5252", color: "white", minWidth: 18, height: 18, borderRadius: 9, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px", flexShrink: 0 }}>
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>

              {/* User info at bottom of panel */}
              <div style={{ borderTop: "1px solid var(--color-border-light)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <AvatarEl size={32} />
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {currentUser?.name || "بەکارهێنەر"}
                  </div>
                  <div style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: `${roleBadgeColor}18`, color: roleBadgeColor, fontWeight: 700, display: "inline-block", marginTop: 2 }}>
                    {roleBadge}
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); logout(); }} title="چوونەدەرەوە"
                  style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)", flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--color-bg-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                  <LogOut size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <EditProfileModal open={editProfileOpen} onClose={() => setEditProfileOpen(false)}
        initialName={currentUser?.name || ""} initialPhone={currentUser?.phone || ""}
        initialAvatar={avatar} onSave={async d => { await updateCurrentUserProfile(d); }} />
    </>
  );
}
