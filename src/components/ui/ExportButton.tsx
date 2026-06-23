"use client";
import { useState, useRef } from "react";
import { Download } from "lucide-react";
import { exportCSV, exportPDF, type ExportColumn } from "@/lib/export";

interface ExportButtonProps {
  data: Record<string, unknown>[];
  columns: ExportColumn[];
  filename: string;
  title: string;
}

export default function ExportButton({ data, columns, filename, title }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid #DEE2E6", background: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#495057" }}
      >
        <Download size={14} />
        <span>دەرهێنان</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "white", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", border: "1px solid #E9ECEF", zIndex: 50, overflow: "hidden", minWidth: 140 }}>
          <button onClick={() => { exportCSV(data, columns, filename); setOpen(false); }}
            style={{ display: "block", width: "100%", padding: "10px 16px", border: "none", background: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", textAlign: "right", color: "#495057" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#EDF2FF")}
            onMouseLeave={e => (e.currentTarget.style.background = "white")}
          >CSV دەرهێنان</button>
          <button onClick={() => { exportPDF(data, columns, title); setOpen(false); }}
            style={{ display: "block", width: "100%", padding: "10px 16px", border: "none", background: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", textAlign: "right", color: "#495057", borderTop: "1px solid #F1F3F5" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#EDF2FF")}
            onMouseLeave={e => (e.currentTarget.style.background = "white")}
          >PDF چاپکردن</button>
        </div>
      )}
    </div>
  );
}
