"use client";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayout } from "@/app/dashboard/layout";
import { useData } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard, BarChart3, Package, ShoppingCart, Truck, Users, Building2,
  Factory, Gift, UserCog, Wallet, Settings, HelpCircle, ChevronLeft, ChevronRight,
  BadgeCheck, FileText, Bot, Camera, LogOut, Shield, FlaskConical,
  Edit3, Save, X, Phone, Mail, User,
} from "lucide-react";

interface NavItem { label: string; href: string; icon: React.ReactNode; badge?: number; managerOnly?: boolean; }
interface NavSection { title: string; items: NavItem[]; }

// ── Inline "Edit Profile" popover ───────────────────────────────────────────
function EditProfileModal({
  open, onClose,
  initialName, initialPhone, initialAvatar,
  onSave,
}: {
  open: boolean; onClose: () => void;
  initialName: string; initialPhone: string; initialAvatar: string;
  onSave: (data: { name: string; phone: string; avatarUrl: string }) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset when opened
  useEffect(() => {
    if (open) { setName(initialName); setPhone(initialPhone); setAvatar(initialAvatar); }
  }, [open, initialName, initialPhone, initialAvatar]);

  if (!open) return null;

  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 200;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        setAvatar(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = ev.target!.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ name: name.trim(), phone: phone.trim(), avatarUrl: avatar });
    setSaving(false);
    onClose();
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 12px", border: "1.5px solid var(--color-border)",
    borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none",
    background: "var(--color-surface)", color: "var(--color-text-primary)",
    boxSizing: "border-box",
  };

  return (
    <>
      {/* backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 999 }} />
      {/* modal */}
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        background: "var(--color-surface)", borderRadius: 18, boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        padding: "28px 28px 22px", width: 360, zIndex: 1000,
        border: "1px solid var(--color-border)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <Edit3 size={16} color="#4263EB" /> دەستکاری زانیاری کەسی
          </span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "var(--color-bg-hover)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)" }}><X size={13} /></button>
        </div>

        {/* Avatar picker */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 22, gap: 10 }}>
          <div
            style={{ position: "relative", cursor: "pointer" }}
            onClick={() => fileRef.current?.click()}
            title="گۆڕینی وێنەی پرۆفایل"
          >
            {avatar ? (
              <img src={avatar} alt="avatar" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "3px solid #4263EB" }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#4263EB,#7C5CFC)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "white", border: "3px solid #4263EB" }}>
                {name?.[0] || "؟"}
              </div>
            )}
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: "50%", background: "#4263EB", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white" }}>
              <Camera size={11} color="white" />
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} />
          <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>کلیک بکە بۆ گۆڕینی وێنە</span>
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}>
              <User size={11} /> ناو
            </div>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="ناوت بنووسە" />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}>
              <Phone size={11} /> ژمارەی مۆبایل
            </div>
            <input style={inp} value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XX XXX XXXX" type="tel" />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          style={{ width: "100%", padding: "11px", borderRadius: 10, border: "none", background: saving ? "#ADB5BD" : "linear-gradient(135deg,#4263EB,#7C5CFC)", color: "white", fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
        >
          <Save size={14} /> {saving ? "پاشەکەوتکردن..." : "پاشەکەوتکردن"}
        </button>
      </div>
    </>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { settings } = useData();
  const { sidebarCollapsed, toggleSidebar, logout, currentUser, updateCurrentUserProfile, showToast } = useLayout() as ReturnType<typeof useLayout> & { showToast?: (m: string) => void };
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const isTop = (useLayout() as { sidebarPosition: string }).sidebarPosition === "top";
  const { sidebarPosition } = useLayout();

  const isAdmin = currentUser?.role === "ADMIN";
  const isManager = currentUser?.role === "MANAGER";
  const isAdminOrManager = isAdmin || isManager;

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from("client_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "PENDING");
      setPendingRequestsCount(count || 0);
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  const navSections: NavSection[] = [
    {
      title: "سەرەکی",
      items: [
        { label: "پێشانگا",       href: "/dashboard",           icon: <LayoutDashboard size={18} /> },
        { label: "شیکاری",       href: "/dashboard/analytics", icon: <BarChart3 size={18} />,   managerOnly: true },
        { label: "بەرهەمەکان",   href: "/dashboard/products",  icon: <Package size={18} /> },
        { label: "داواکارییەکان", href: "/dashboard/orders",   icon: <ShoppingCart size={18} /> },
        { label: "پسوولەکان",    href: "/dashboard/invoices",  icon: <FileText size={18} /> },
        { label: "بۆنەس",        href: "/dashboard/bonus",     icon: <Gift size={18} />,        managerOnly: true },
        { label: "نموونەکان",     href: "/dashboard/samples",   icon: <FlaskConical size={18} /> },
      ],
    },
    {
      title: "بەڕێوەبردن",
      items: [
        { label: "کڕیارەکان",       href: "/dashboard/clients",    icon: <Users size={18} />,     badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined },
        { label: "نوێنەری پزیشکی", href: "/dashboard/reps",       icon: <UserCog size={18} />,   managerOnly: true },
        { label: "کۆگاکان",         href: "/dashboard/warehouses", icon: <Building2 size={18} />, managerOnly: true },
        { label: "دابینکەرەکان",   href: "/dashboard/suppliers",  icon: <Factory size={18} />,   managerOnly: true },
        { label: "گواستنەوە",       href: "/dashboard/logistics",  icon: <Truck size={18} /> },
        { label: "شوفێرەکان",      href: "/dashboard/drivers",    icon: <BadgeCheck size={18} />, managerOnly: true },
        { label: "بۆت",            href: "/dashboard/telegram",   icon: <Bot size={18} />,       managerOnly: true },
      ],
    },
    {
      title: "کۆمپانیا",
      items: [
        { label: "دارایی",        href: "/dashboard/finance", icon: <Wallet size={18} />, managerOnly: true },
        { label: "بەکارهێنەران", href: "/dashboard/users",   icon: <Shield size={18} />, managerOnly: true },
      ],
    },
  ];

  const footerItems: NavItem[] = [
    { label: "ڕێکخستنەکان", href: "/dashboard/settings", icon: <Settings size={18} />, managerOnly: true },
    { label: "یارمەتی",      href: "#",                   icon: <HelpCircle size={18} /> },
  ];

  const filteredSections = navSections.map(s => ({
    ...s,
    items: s.items.filter(i => !i.managerOnly || isAdminOrManager),
  })).filter(s => s.items.length > 0);

  const filteredFooter = footerItems.filter(i => !i.managerOnly || isAdminOrManager);
  const allNavItems = filteredSections.flatMap(s => s.items);

  const userInitials = currentUser?.name
    ? currentUser.name.split(" ").map(w => w[0]).join("").slice(0, 2)
    : "؟";

  const avatar = currentUser?.avatarUrl || "";

  const roleBadge = isAdmin ? "بەڕێوەبەر" : isManager ? "بەڕێوەبەری مامناوەند" : "نوێنەر";
  const roleBadgeColor = isAdmin ? "#4263EB" : isManager ? "#7C5CFC" : "#40C057";

  const AvatarEl = ({ size = 36 }: { size?: number }) => avatar ? (
    <img src={avatar} alt="profile" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg,#4263EB,#7C5CFC)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 800, color: "white", flexShrink: 0,
    }}>{userInitials}</div>
  );

  const handleSaveProfile = async (data: { name: string; phone: string; avatarUrl: string }) => {
    await updateCurrentUserProfile(data);
  };

  /* ─────────────────────────────────────────
     TOP NAV MODE
  ───────────────────────────────────────── */
  if (sidebarPosition === "top") {
    return (
      <>
        <header className="top-nav" id="sidebar">
          {/* Logo */}
          <div className="top-nav-logo">
            {settings.logo ? (
              <img src={settings.logo} alt="logo" style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover" }} />
            ) : (
              <div className="sidebar-logo" style={{ width: 28, height: 28, fontSize: 13 }}>د</div>
            )}
            <span className="top-nav-brand">{settings.name || ""}</span>
          </div>

          {/* Nav items */}
          <nav className="top-nav-items">
            {allNavItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`top-nav-item ${isActive ? "active" : ""}`}
                  id={`nav-top-${item.href.split("/").pop()}`}
                >
                  <span className="top-nav-item-icon">{item.icon}</span>
                  <span className="top-nav-item-text">{item.label}</span>
                  {item.badge ? (
                    <span style={{ background: "#FA5252", color: "white", minWidth: 16, height: 16, borderRadius: 8, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="top-nav-end">
            {filteredFooter.map((item) => (
              <Link key={item.href} href={item.href} className={`top-nav-item ${pathname === item.href ? "active" : ""}`}>
                <span className="top-nav-item-icon">{item.icon}</span>
                <span className="top-nav-item-text">{item.label}</span>
              </Link>
            ))}

            {/* User avatar — click opens edit profile */}
            <div className="top-nav-user" onClick={() => setEditProfileOpen(true)} title="دەستکاری زانیاری کەسی" style={{ cursor: "pointer" }}>
              <AvatarEl size={30} />
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>{currentUser?.name || "بەکارهێنەر"}</span>
                <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: `${roleBadgeColor}20`, color: roleBadgeColor, fontWeight: 700 }}>{roleBadge}</span>
              </div>
            </div>

            <button onClick={logout} title="چوونەدەرەوە" style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "var(--color-bg-hover)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)", marginRight: 8 }}>
              <LogOut size={15} />
            </button>
          </div>
        </header>

        <EditProfileModal
          open={editProfileOpen}
          onClose={() => setEditProfileOpen(false)}
          initialName={currentUser?.name || ""}
          initialPhone={currentUser?.phone || ""}
          initialAvatar={avatar}
          onSave={handleSaveProfile}
        />
      </>
    );
  }

  /* ─────────────────────────────────────────
     STANDARD VERTICAL SIDEBAR
  ───────────────────────────────────────── */
  return (
    <>
      <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`} id="sidebar">
        {/* Header */}
        <div className="sidebar-header">
          {settings.logo ? (
            <img src={settings.logo} alt="logo" style={{ width: 40, height: 40, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div className="sidebar-logo">د</div>
          )}
          {!sidebarCollapsed && (
            <div className="sidebar-company">
              <span className="sidebar-company-name">{settings.name || ""}</span>
              <span className="sidebar-company-type">دەرمانسازی و فرۆشتن</span>
            </div>
          )}
          <button className="sidebar-collapse-btn" aria-label="Toggle sidebar" onClick={toggleSidebar}>
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav Sections */}
        <nav className="sidebar-nav">
          {filteredSections.map((section) => (
            <div key={section.title}>
              {!sidebarCollapsed && <div className="sidebar-section-label">{section.title}</div>}
              {section.items.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href}
                    className={`sidebar-item ${isActive ? "active" : ""}`}
                    id={`nav-${item.href.split("/").pop()}`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <span className="sidebar-item-icon">{item.icon}</span>
                    {!sidebarCollapsed && <span className="sidebar-item-text">{item.label}</span>}
                    {item.badge ? (
                      <span className="sidebar-item-badge" style={{
                        background: isActive ? "rgba(255,255,255,0.3)" : "#4263EB",
                        color: "white", minWidth: 18, height: 18, borderRadius: 9,
                        fontSize: 10, fontWeight: 700, display: "flex",
                        alignItems: "center", justifyContent: "center", padding: "0 5px",
                        marginRight: sidebarCollapsed ? 0 : "auto",
                        animation: "pulse 2s ease infinite",
                      }}>
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {filteredFooter.map((item) => (
            <Link key={item.href} href={item.href}
              className={`sidebar-item ${pathname === item.href ? "active" : ""}`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="sidebar-item-text">{item.label}</span>}
            </Link>
          ))}
        </div>

        {/* User profile — click opens edit */}
        <div className="sidebar-user" style={{ cursor: "pointer" }} onClick={() => setEditProfileOpen(true)} title="دەستکاری زانیاری کەسی">
          <div style={{ position: "relative", flexShrink: 0 }}>
            <AvatarEl size={36} />
            {/* camera overlay */}
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
            >
              <Edit3 size={13} color="white" />
            </div>
          </div>

          {!sidebarCollapsed && (
            <>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">
                  {currentUser?.name || "بەکارهێنەر"}
                  {isAdminOrManager && <BadgeCheck size={14} className="sidebar-user-verified" style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />}
                </span>
                <span className="sidebar-user-email" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ padding: "1px 6px", borderRadius: 4, background: `${roleBadgeColor}15`, color: roleBadgeColor, fontSize: 9, fontWeight: 700 }}>
                    {roleBadge}
                  </span>
                  {currentUser?.email || ""}
                </span>
              </div>
              <button className="sidebar-user-more" aria-label="Logout" onClick={e => { e.stopPropagation(); logout(); }} title="چوونەدەرەوە">
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>
      </aside>

      <EditProfileModal
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        initialName={currentUser?.name || ""}
        initialPhone={currentUser?.phone || ""}
        initialAvatar={avatar}
        onSave={handleSaveProfile}
      />
    </>
  );
}
