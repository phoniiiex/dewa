"use client";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import Toast from "@/components/ui/Toast";
import { DataProvider } from "@/lib/store";
import "@/styles/dashboard.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataProvider>
      <div className="app-layout">
        <Sidebar />
        <TopBar />
        <main className="main-content">{children}</main>
        <Toast />
      </div>
    </DataProvider>
  );
}
