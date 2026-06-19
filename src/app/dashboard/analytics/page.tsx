import { BarChart3 } from "lucide-react";

export default function Page() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16 }}>
      <div style={{ width: 64, height: 64, background: "#EDF2FF", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "#4263EB" }}>
        <BarChart3 size={28} />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700 }}>شیکاری</h2>
      <p style={{ color: "#6C757D", fontSize: 14 }}>ئەم پەڕەیە بەم زووانە دروست دەکرێت</p>
      <span style={{ background: "#FFF9DB", color: "#FD7E14", padding: "4px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600 }}>بەم زووانە</span>
    </div>
  );
}
