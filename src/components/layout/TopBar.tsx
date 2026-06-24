"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, Calendar, SlidersHorizontal, Plus, X } from "lucide-react";
import { useLayout } from "@/app/dashboard/layout";
import CommandMenu from "@/components/ui/CommandMenu";


export default function TopBar() {
  const router = useRouter();
  const { searchOpen, setSearchOpen, notifOpen, setNotifOpen, currentUser } = useLayout();
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

  // Get first name for greeting
  const firstName = currentUser?.name?.split(" ")[0] || "بەکارهێنەر";

  const notifications = [
    { id: 1, text: "داواکاری ORD-003 چاوەڕوانی گەیاندنە", time: "٥ خولەک لەمەوپێش", read: false },
    { id: 2, text: "پاراسیتامۆل: بەرواری بەسەرچوون نزیکە", time: "١ کاتژمێر لەمەوپێش", read: false },
    { id: 3, text: "پارەدانی نوێ لە دەرمانخانەی ئازادی", time: "٣ کاتژمێر لەمەوپێش", read: true },
  ];

  const [formattedDate, setFormattedDate] = useState("");
  useEffect(() => {
    setFormattedDate(new Date().toLocaleDateString("ckb", { year: "numeric", month: "long", day: "numeric" }));
  }, []);

  return (
    <>
      <header className="topbar" id="topbar">
        <div className="topbar-right">
          <div className="topbar-welcome">
            {/* Profile avatar — initials from currentUser.name */}
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
          <div style={{ position: "relative" }}>
            <button className="topbar-btn" aria-label="Notifications" id="topbar-notifications" onClick={() => setNotifOpen(!notifOpen)} style={{ position: "relative" }}>
              <Bell size={18} />
              <span style={{ position: "absolute", top: 6, left: 6, width: 8, height: 8, borderRadius: "50%", background: "#FA5252" }} />
            </button>
            {notifOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 8, width: 340, background: "white", borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,0.15)", border: "1px solid #E9ECEF", zIndex: 100, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #E9ECEF", fontWeight: 700, fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  ئاگادارییەکان
                  <button onClick={() => setNotifOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ADB5BD" }}><X size={16} /></button>
                </div>
                {notifications.map(n => (
                  <div key={n.id} style={{ padding: "12px 20px", borderBottom: "1px solid #F1F3F5", background: n.read ? "white" : "#FFF8DB" }}>
                    <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600 }}>{n.text}</div>
                    <div style={{ fontSize: 11, color: "#ADB5BD", marginTop: 4 }}>{n.time}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ position: "relative" }}>
            <button className="topbar-date-btn" id="topbar-date" onClick={() => setDateOpen(!dateOpen)}>
              <Calendar size={16} />
              <span>{formattedDate}</span>
            </button>
            {dateOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 8, width: 280, background: "white", borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,0.15)", border: "1px solid #E9ECEF", zIndex: 100, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
                  ماوەی کات
                  <button onClick={() => setDateOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ADB5BD" }}><X size={16} /></button>
                </div>
                {["ئەمڕۆ", "حەفتەی ڕابردوو", "مانگی ڕابردوو", "٣ مانگی ڕابردوو", "ساڵی ئێستا"].map(period => (
                  <button key={period} onClick={() => setDateOpen(false)} style={{ display: "block", width: "100%", padding: "10px 14px", borderRadius: 8, border: "none", background: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", textAlign: "right", marginBottom: 4, color: "#495057" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#EDF2FF")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                  >{period}</button>
                ))}
              </div>
            )}
          </div>
          <div style={{ position: "relative" }}>
            <button className="topbar-filter-btn" id="topbar-filter" onClick={() => setFilterOpen(!filterOpen)}>
              <SlidersHorizontal size={16} />
              <span>فلتەر</span>
            </button>
            {filterOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 8, width: 260, background: "white", borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,0.15)", border: "1px solid #E9ECEF", zIndex: 100, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
                  فلتەرەکان
                  <button onClick={() => setFilterOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ADB5BD" }}><X size={16} /></button>
                </div>
                {[
                  { label: "هەموو", val: "all" },
                  { label: "چاوەڕوان", val: "pending" },
                  { label: "لە پڕۆسەدا", val: "processing" },
                  { label: "نێردراو", val: "shipped" },
                  { label: "پارەدراو", val: "paid" },
                ].map(f => (
                  <button key={f.val} onClick={() => setFilterOpen(false)} style={{ display: "block", width: "100%", padding: "10px 14px", borderRadius: 8, border: "none", background: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", textAlign: "right", marginBottom: 4, color: "#495057" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#EDF2FF")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                  >{f.label}</button>
                ))}
              </div>
            )}
          </div>
          <button className="topbar-add-btn" id="topbar-add" onClick={() => router.push("/dashboard/orders")}>
            <Plus size={16} />
            <span>داواکاری نوێ</span>
          </button>
        </div>
      </header>

      {/* Command Menu (replaces old basic search overlay) */}
      <CommandMenu open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
