import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import "@/styles/dashboard.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-layout">
      <Sidebar />
      <TopBar />
      <main className="main-content">{children}</main>
    </div>
  );
}
