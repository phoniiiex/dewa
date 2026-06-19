"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  ChevronLeft,
  BadgeCheck,
  MoreHorizontal,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "سەرەکی",
    items: [
      { label: "پێشانگا", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
      { label: "شیکاری", href: "/dashboard/analytics", icon: <BarChart3 size={18} /> },
      { label: "بەرهەمەکان", href: "/dashboard/products", icon: <Package size={18} /> },
      { label: "داواکارییەکان", href: "/dashboard/orders", icon: <ShoppingCart size={18} />, badge: 3 },
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

  return (
    <aside className="sidebar" id="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">د</div>
        <div className="sidebar-company">
          <span className="sidebar-company-name">دەوا</span>
          <span className="sidebar-company-type">دەرمانسازی و فرۆشتن</span>
        </div>
        <button className="sidebar-collapse-btn" aria-label="Collapse sidebar">
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Nav Sections */}
      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="sidebar-section-label">{section.title}</div>
            {section.items.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-item ${isActive ? "active" : ""}`}
                  id={`nav-${item.href.split("/").pop()}`}
                >
                  <span className="sidebar-item-icon">{item.icon}</span>
                  <span className="sidebar-item-text">{item.label}</span>
                  {item.badge && (
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
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-item ${pathname === item.href ? "active" : ""}`}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            <span className="sidebar-item-text">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* User */}
      <div className="sidebar-user">
        <div className="sidebar-user-avatar">ئا</div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">
            ئاسۆ ئەحمەد
            <BadgeCheck size={14} className="sidebar-user-verified" style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
          </span>
          <span className="sidebar-user-email">aso@dewa.com</span>
        </div>
        <button className="sidebar-user-more" aria-label="More options">
          <MoreHorizontal size={16} />
        </button>
      </div>
    </aside>
  );
}
