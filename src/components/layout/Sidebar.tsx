"use client";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayout } from "@/app/dashboard/layout";
import { useData } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard, BarChart3, Package, ShoppingCart, Truck, Users, Building2,
  Factory, Gift, UserCog, Wallet, Settings, HelpCircle,
  BadgeCheck, FileText, Bot, Camera, LogOut, Shield, FlaskConical,
  Edit3, Save, X, Phone, Mail, User,
} from "lucide-react";

interface NavItem { label: string; href: string; icon: React.ReactNode; badge?: number; managerOnly?: boolean; }
interface NavSection { title: string; items: NavItem[]; }

/* ─── Edit Profile Modal ─────────────────────────────────────────────────── */
function EditProfileModal({
  open, onClose, initialName, initialPhone, initialAvatar, onSave,
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
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 999 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        background: "var(--color-surface)", borderRadius: 18, boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        width: 380, zIndex: 1000, padding: 28, direction: "rtl",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>دەستکاری پرۆفایل</span>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "var(--color-bg-hover)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)" }}><X size={16} /></button>
        </div>

        {/* Avatar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
          <div style={{ position: "relative", cursor: "pointer" }} onClick={() => fileRef.current?.click()}>
            {avatar ? (
              <img src={avatar} alt="avatar" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid #4263EB" }} />
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
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} />
          {avatar && <button onClick={() => setAvatar("")} style={{ marginTop: 6, fontSize: 11, color: "#FA5252", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>سڕینەوەی وێنە</button>}
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>ناو</label>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="ناوی خۆت بنووسە" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>ژمارەی مۆبایل</label>
            <div style={{ position: "relative" }}>
              <Phone size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-secondary)" }} />
              <input style={{ ...inp, paddingRight: 30 }} value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XX XXX XXXX" type="tel" />
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving || !name.trim()}
          style={{ marginTop: 22, width: "100%", padding: "12px 0", borderRadius: 10, background: "linear-gradient(135deg,#4263EB,#7C5CFC)", color: "white", fontSize: 14, fontWeight: 700, border: "none", cursor: saving ? "default" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: saving ? 0.7 : 1 }}>
          <Save size={15} /> {saving ? "پاشەکەوتکردن..." : "پاشەکەوتکردن"}
        </button>
      </div>
    </>
  );
}

/* ─── Nav Tooltip ────────────────────────────────────────────────────────── */
function NavLink({ item, isActive, collapsed }: {
  item: NavItem; isActive: boolean; collapsed: boolean;
}) {
  return (
    <Link
      href={item.href}
      id={`nav-${item.href.split("/").pop()}`}
      className={`rail-item${isActive ? " active" : ""}`}
      title={item.label}
    >
      <span className="rail-icon">{item.icon}</span>
      <span className="rail-label">{item.label}</span>
      {item.badge ? (
        <span className="rail-badge">{item.badge > 99 ? "99+" : item.badge}</span>
      ) : null}
    </Link>
  );
}

/* ─── Main Sidebar ───────────────────────────────────────────────────────── */
export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarPosition, currentUser, updateCurrentUserProfile, logout } = useLayout();
  const { settings } = useData();
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Poll pending client requests every 30s
  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from("client_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "PENDING");
      setPendingRequestsCount(count || 0);
    };
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, []);

  const isAdmin   = currentUser?.role === "ADMIN";
  const isManager = currentUser?.role === "MANAGER";
  const isAdminOrManager = isAdmin || isManager;

  const navSections: NavSection[] = [
    {
      title: "سەرەکی",
      items: [
        { label: "پێشانگا",       href: "/dashboard",          icon: <LayoutDashboard size={18} /> },
        { label: "شیکاری",        href: "/dashboard/analytics", icon: <BarChart3 size={18} />,       managerOnly: true },
      ],
    },
    {
      title: "فرۆشتن",
      items: [
        { label: "بەرهەمەکان",    href: "/dashboard/products", icon: <Package size={18} /> },
        { label: "داواکارییەکان", href: "/dashboard/orders",   icon: <ShoppingCart size={18} /> },
        { label: "پسوولەکان",     href: "/dashboard/invoices", icon: <FileText size={18} /> },
        { label: "بۆنەس",         href: "/dashboard/bonus",    icon: <Gift size={18} />,        managerOnly: true },
        { label: "نموونەکان",     href: "/dashboard/samples",  icon: <FlaskConical size={18} /> },
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
        { label: "بۆت",             href: "/dashboard/telegram",   icon: <Bot size={18} />,       managerOnly: true },
      ],
    },
    {
      title: "کۆمپانیا",
      items: [
        { label: "دارایی",        href: "/dashboard/finance",   icon: <Wallet size={18} />,  managerOnly: true },
        { label: "بەکارهێنەران", href: "/dashboard/users",     icon: <Shield size={18} />,  managerOnly: true },
        { label: "ڕێکخستنەکان", href: "/dashboard/settings",  icon: <Settings size={18} />, managerOnly: true },
      ],
    },
  ];

  const footerItems: NavItem[] = [
    { label: "یارمەتی", href: "#", icon: <HelpCircle size={18} /> },
  ];

  const filteredSections = navSections.map(s => ({
    ...s,
    items: s.items.filter(i => !i.managerOnly || isAdminOrManager),
  })).filter(s => s.items.length > 0);

  const filteredFooter = footerItems.filter(i => !i.managerOnly || isAdminOrManager);
  const allNavItems = filteredSections.flatMap(s => s.items);

  const userInitials = currentUser?.name
    ? currentUser.name.trim().split(" ").slice(0, 2).map(w => w[0]).join("")
    : "؟";
  const avatar = currentUser?.avatarUrl || "";

  const roleBadge = isAdmin ? "بەڕێوەبەر" : isManager ? "مامناوەند" : "نوێنەر";
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

  /* ── TOP NAV ── */
  if (sidebarPosition === "top") {
    return (
      <>
        <header className="top-nav" id="sidebar">
          <div className="top-nav-logo">
            {settings.logo ? (
              <img src={settings.logo} alt="logo" style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover" }} />
            ) : (
              <div className="sidebar-logo" style={{ width: 28, height: 28, fontSize: 13 }}>د</div>
            )}
            <span className="top-nav-brand">{settings.name || ""}</span>
          </div>
          <nav className="top-nav-items">
            {allNavItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} className={`top-nav-item ${isActive ? "active" : ""}`} id={`nav-top-${item.href.split("/").pop()}`}>
                  <span className="top-nav-item-icon">{item.icon}</span>
                  <span className="top-nav-item-text">{item.label}</span>
                  {item.badge ? <span style={{ background: "#FA5252", color: "white", minWidth: 16, height: 16, borderRadius: 8, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{item.badge > 99 ? "99+" : item.badge}</span> : null}
                </Link>
              );
            })}
          </nav>
          <div className="top-nav-end">
            {filteredFooter.map((item) => (
              <Link key={item.href} href={item.href} className={`top-nav-item ${pathname === item.href ? "active" : ""}`}>
                <span className="top-nav-item-icon">{item.icon}</span>
                <span className="top-nav-item-text">{item.label}</span>
              </Link>
            ))}
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

        <EditProfileModal open={editProfileOpen} onClose={() => setEditProfileOpen(false)}
          initialName={currentUser?.name || ""} initialPhone={currentUser?.phone || ""}
          initialAvatar={avatar} onSave={handleSaveProfile} />
      </>
    );
  }

  /* ── ICON RAIL SIDEBAR ── */
  const isLeft = sidebarPosition === "left";

  return (
    <>
      <style>{`
        .sidebar-rail {
          position: fixed;
          top: 0; bottom: 0;
          ${isLeft ? "left: 0;" : "right: 0;"}
          width: 68px;
          background: var(--color-bg-card);
          border-${isLeft ? "right" : "left"}: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          z-index: 50;
          overflow: hidden;
          transition: width 0.25s cubic-bezier(0.4,0,0.2,1);
        }
        .sidebar-rail:hover {
          width: 260px;
          box-shadow: ${isLeft ? "4px" : "-4px"} 0 24px rgba(0,0,0,0.08);
        }

        /* logo area */
        .rail-logo-area {
          height: 68px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 14px;
          border-bottom: 1px solid var(--color-border-light);
          flex-shrink: 0;
          overflow: hidden;
        }
        .rail-logo-icon {
          width: 40px; height: 40px; flex-shrink: 0;
          border-radius: 12px;
          background: linear-gradient(135deg, #4263EB, #7C5CFC);
          display: flex; align-items: center; justify-content: center;
          color: white; font-weight: 800; font-size: 18px;
          overflow: hidden;
        }
        .rail-logo-icon img { width: 100%; height: 100%; object-fit: cover; }
        .rail-company-name {
          font-size: 13px; font-weight: 700;
          color: var(--color-text-primary);
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.2s 0.05s;
          flex: 1; overflow: hidden; text-overflow: ellipsis;
        }
        .sidebar-rail:hover .rail-company-name { opacity: 1; }

        /* nav scroll area */
        .rail-nav {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 10px 0;
          scrollbar-width: none;
        }
        .rail-nav::-webkit-scrollbar { display: none; }

        /* section divider */
        .rail-section-divider {
          height: 1px;
          background: var(--color-border-light);
          margin: 6px 14px;
        }

        /* nav item */
        .rail-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 14px;
          height: 44px;
          color: var(--color-text-secondary);
          text-decoration: none;
          position: relative;
          transition: background 0.15s, color 0.15s;
          white-space: nowrap;
          overflow: hidden;
        }
        .rail-item:hover {
          background: var(--color-bg-hover);
          color: var(--color-text-primary);
        }
        .rail-item.active {
          background: #EDF2FF;
          color: #4263EB;
          font-weight: 600;
        }
        [data-theme="dark"] .rail-item.active {
          background: rgba(66,99,235,0.15);
          color: #7C9EFF;
        }
        /* active accent bar */
        .rail-item.active::${isLeft ? "before" : "after"} {
          content: "";
          position: absolute;
          ${isLeft ? "left" : "right"}: 0;
          top: 6px; bottom: 6px;
          width: 3px;
          background: #4263EB;
          border-radius: 3px;
        }

        .rail-icon {
          width: 40px; height: 40px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          border-radius: 10px;
          transition: background 0.15s;
        }
        .rail-item:hover .rail-icon { background: var(--color-bg); }
        .rail-item.active .rail-icon { background: #fff; }
        [data-theme="dark"] .rail-item.active .rail-icon { background: rgba(255,255,255,0.08); }

        .rail-label {
          font-size: 13px;
          font-weight: 500;
          opacity: 0;
          transition: opacity 0.18s 0.06s;
          flex: 1;
        }
        .sidebar-rail:hover .rail-label { opacity: 1; }

        .rail-badge {
          background: #4263EB; color: white;
          font-size: 10px; font-weight: 700;
          min-width: 18px; height: 18px;
          border-radius: 9px; padding: 0 5px;
          display: flex; align-items: center; justify-content: center;
          opacity: 0;
          transition: opacity 0.18s 0.06s;
          flex-shrink: 0;
        }
        .sidebar-rail:hover .rail-badge { opacity: 1; }

        /* footer area */
        .rail-footer {
          border-top: 1px solid var(--color-border-light);
          padding: 8px 0;
          flex-shrink: 0;
        }

        /* user area at bottom */
        .rail-user {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 14px;
          height: 60px;
          cursor: pointer;
          border-top: 1px solid var(--color-border-light);
          overflow: hidden;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .rail-user:hover { background: var(--color-bg-hover); }
        .rail-user-info {
          opacity: 0;
          transition: opacity 0.18s 0.06s;
          display: flex; flex-direction: column; gap: 2px;
          flex: 1; overflow: hidden; min-width: 0;
        }
        .sidebar-rail:hover .rail-user-info { opacity: 1; }
        .rail-user-name {
          font-size: 13px; font-weight: 700;
          color: var(--color-text-primary);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .rail-logout {
          width: 30px; height: 30px; flex-shrink: 0;
          border: none; background: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: var(--color-text-secondary);
          border-radius: 8px;
          opacity: 0;
          transition: opacity 0.18s 0.06s, background 0.15s;
        }
        .sidebar-rail:hover .rail-logout { opacity: 1; }
        .rail-logout:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
      `}</style>

      <aside className="sidebar-rail" id="sidebar">
        {/* Logo */}
        <div className="rail-logo-area">
          <div className="rail-logo-icon">
            {settings.logo ? <img src={settings.logo} alt="logo" /> : "د"}
          </div>
          <span className="rail-company-name">{settings.name || "دەوا"}</span>
        </div>

        {/* Nav */}
        <nav className="rail-nav">
          {filteredSections.map((section, si) => (
            <div key={section.title}>
              {si > 0 && <div className="rail-section-divider" />}
              {section.items.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <NavLink key={item.href} item={item} isActive={isActive} collapsed={true} />
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer items (help) */}
        <div className="rail-footer">
          {filteredFooter.map((item) => {
            const isActive = pathname === item.href;
            return <NavLink key={item.href} item={item} isActive={isActive} collapsed={true} />;
          })}
        </div>

        {/* User area */}
        <div className="rail-user" onClick={() => setEditProfileOpen(true)} title="دەستکاری پرۆفایل">
          <div style={{ position: "relative", flexShrink: 0 }}>
            <AvatarEl size={38} />
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "0")}>
              <Edit3 size={13} color="white" />
            </div>
          </div>
          <div className="rail-user-info">
            <span className="rail-user-name">{currentUser?.name || "بەکارهێنەر"}</span>
            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: `${roleBadgeColor}15`, color: roleBadgeColor, fontWeight: 700, display: "inline-block", width: "fit-content" }}>{roleBadge}</span>
          </div>
          <button className="rail-logout" aria-label="Logout"
            onClick={e => { e.stopPropagation(); logout(); }} title="چوونەدەرەوە">
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      <EditProfileModal open={editProfileOpen} onClose={() => setEditProfileOpen(false)}
        initialName={currentUser?.name || ""} initialPhone={currentUser?.phone || ""}
        initialAvatar={avatar} onSave={handleSaveProfile} />
    </>
  );
}
