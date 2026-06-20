"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayout } from "@/app/dashboard/layout";
import { useData } from "@/lib/store";
import {
  LayoutDashboard, BarChart3, Package, ShoppingCart, Truck, Users, Building2,
  Factory, Gift, UserCog, Wallet, Settings, HelpCircle, ChevronLeft, ChevronRight,
  BadgeCheck, MoreHorizontal, FileText, Bot, Camera, LogOut,
} from "lucide-react";

interface NavItem { label: string; href: string; icon: React.ReactNode; badge?: number; }
interface NavSection { title: string; items: NavItem[]; }

const navSections: NavSection[] = [
  {
    title: "سەرەکی",
    items: [
      { label: "پێشانگا", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
      { label: "شیکاری", href: "/dashboard/analytics", icon: <BarChart3 size={18} /> },
      { label: "بەرهەمەکان", href: "/dashboard/products", icon: <Package size={18} /> },
      { label: "داواکارییەکان", href: "/dashboard/orders", icon: <ShoppingCart size={18} />, badge: 3 },
      { label: "پسوولەکان", href: "/dashboard/invoices", icon: <FileText size={18} /> },
      { label: "بۆنەس", href: "/dashboard/bonus", icon: <Gift size={18} /> },
    ],
  },
  {
    title: "بەڕێوەبردن",
    items: [
      { label: "کڕیارەکان", href: "/dashboard/clients", icon: <Users size={18} /> },
      { label: "نوێنەری پزیشکی", href: "/dashboard/reps", icon: <UserCog size={18} /> },
      { label: "کۆگاکان", href: "/dashboard/warehouses", icon: <Building2 size={18} /> },
      { label: "دابینکەرەکان", href: "/dashboard/suppliers", icon: <Factory size={18} /> },
      { label: "گواستنەوە", href: "/dashboard/logistics", icon: <Truck size={18} /> },
      { label: "بۆتی شۆفێر", href: "/dashboard/telegram", icon: <Bot size={18} /> },
    ],
  },
  {
    title: "کۆمپانیا",
    items: [
      { label: "دارایی", href: "/dashboard/finance", icon: <Wallet size={18} /> },
    ],
  },
];

const footerItems: NavItem[] = [
  { label: "ڕێکخستنەکان", href: "/dashboard/settings", icon: <Settings size={18} /> },
  { label: "یارمەتی", href: "#", icon: <HelpCircle size={18} /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { settings, updateSettings, showToast } = useData();
  const { sidebarCollapsed, toggleSidebar, logout } = useLayout();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) { alert("فایلەکە زۆر گەورەیە (حد: 500KB)"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        updateSettings({ profilePic: ev.target.result as string });
        showToast("وێنەی پرۆفایل نوێکرایەوە");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
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
            <span className="sidebar-company-name">{settings.name || "دەوا"}</span>
            <span className="sidebar-company-type">دەرمانسازی و فرۆشتن</span>
          </div>
        )}
        <button className="sidebar-collapse-btn" aria-label="Toggle sidebar" onClick={toggleSidebar}>
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav Sections */}
      <nav className="sidebar-nav">
        {navSections.map((section) => (
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
                  {!sidebarCollapsed && item.badge && (
                    <span className="sidebar-item-badge">{item.badge}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {footerItems.map((item) => (
          <Link key={item.href} href={item.href}
            className={`sidebar-item ${pathname === item.href ? "active" : ""}`}
            title={sidebarCollapsed ? item.label : undefined}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            {!sidebarCollapsed && <span className="sidebar-item-text">{item.label}</span>}
          </Link>
        ))}
      </div>

      {/* User with profile pic upload */}
      <div className="sidebar-user">
        <div style={{ position: "relative", cursor: "pointer", flexShrink: 0 }} onClick={() => fileRef.current?.click()} title="گۆڕینی وێنەی پرۆفایل">
          {settings.profilePic ? (
            <img src={settings.profilePic} alt="profile" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div className="sidebar-user-avatar">ئا</div>
          )}
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
          >
            <Camera size={14} color="white" />
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleProfileUpload} style={{ display: "none" }} />
        </div>
        {!sidebarCollapsed && (
          <>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">
                ئاسۆ ئەحمەد
                <BadgeCheck size={14} className="sidebar-user-verified" style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              </span>
              <span className="sidebar-user-email">admin@dewa.com</span>
            </div>
            <button className="sidebar-user-more" aria-label="Logout" onClick={logout} title="چوونەدەرەوە">
              <LogOut size={16} />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
