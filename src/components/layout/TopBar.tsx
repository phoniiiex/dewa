"use client";
import {
  Search,
  Bell,
  Calendar,
  SlidersHorizontal,
  Plus,
} from "lucide-react";

export default function TopBar() {
  return (
    <header className="topbar" id="topbar">
      <div className="topbar-right">
        <div className="topbar-welcome">
          <div className="topbar-avatar">👋</div>
          <div className="topbar-greeting">
            <h2>بەخێربێیتەوە، ئاسۆ</h2>
            <p>بەخێربێیتەوە بۆ دەوا 🌿</p>
          </div>
        </div>
      </div>

      <div className="topbar-left">
        <button className="topbar-btn" aria-label="Search" id="topbar-search">
          <Search size={18} />
        </button>
        <button className="topbar-btn" aria-label="Notifications" id="topbar-notifications">
          <Bell size={18} />
        </button>
        <button className="topbar-date-btn" id="topbar-date">
          <Calendar size={16} />
          <span>مانگی ڕابردوو</span>
        </button>
        <button className="topbar-filter-btn" id="topbar-filter">
          <SlidersHorizontal size={16} />
          <span>فلتەر</span>
        </button>
        <button className="topbar-add-btn" id="topbar-add">
          <Plus size={16} />
          <span>داواکاری نوێ</span>
        </button>
      </div>
    </header>
  );
}
