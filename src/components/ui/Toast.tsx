"use client";
import { useData } from "@/lib/store";
import { CheckCircle2, XCircle } from "lucide-react";

export default function Toast() {
  const { toast } = useData();
  if (!toast.visible) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: toast.type === "success" ? "#1A1A2E" : "#FA5252",
      color: "white", padding: "12px 24px", borderRadius: 12,
      display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600,
      boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 500,
      animation: "fadeInUp 0.3s ease", fontFamily: "inherit",
    }}>
      {toast.type === "success" ? <CheckCircle2 size={18} color="#40C057" /> : <XCircle size={18} />}
      {toast.message}
    </div>
  );
}
