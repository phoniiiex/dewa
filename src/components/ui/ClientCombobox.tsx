"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Plus, MapPin, Building2 } from "lucide-react";
import type { Client } from "@/lib/types";

const typeLabel: Record<string, string> = {
  PHARMACY: "داروخانە",
  HOSPITAL: "نەخۆشخانە",
  CLINIC: "کلینیک",
  WHOLESALE: "کڕینی گشتی",
};
const typeBg: Record<string, string> = {
  PHARMACY: "#EDF2FF",
  HOSPITAL: "#FFE3E3",
  CLINIC: "#D3F9D8",
  WHOLESALE: "#FFF3BF",
};
const typeColor: Record<string, string> = {
  PHARMACY: "#4263EB",
  HOSPITAL: "#C92A2A",
  CLINIC: "#2B8A3E",
  WHOLESALE: "#E67700",
};

interface Props {
  clients: Client[];
  value: string;           // selected client id
  clientName: string;      // display name in input
  onChange: (id: string, name: string) => void;
  onRequestNew: (name: string) => void; // called with the typed name when user wants to create
}

export default function ClientCombobox({ clients, value, clientName, onChange, onRequestNew }: Props) {
  const [query, setQuery] = useState(clientName);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep input in sync when parent resets
  useEffect(() => { setQuery(clientName); }, [clientName]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query.trim()
    ? clients.filter(c =>
        c.isActive && (
          c.name.includes(query) ||
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.city?.includes(query) ||
          c.owner?.includes(query)
        )
      ).slice(0, 8)
    : clients.filter(c => c.isActive).slice(0, 8);

  const handleSelect = useCallback((c: Client) => {
    setQuery(c.name);
    onChange(c.id, c.name);
    setOpen(false);
  }, [onChange]);

  const handleInput = (v: string) => {
    setQuery(v);
    setOpen(true);
    if (!v) onChange("", "");
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 36px 9px 12px",
    border: "1px solid #DEE2E6",
    borderRadius: 8,
    fontSize: 13,
    fontFamily: "inherit",
    background: "#F8F9FA",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <Search size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ADB5BD", pointerEvents: "none" }} />
        <input
          ref={inputRef}
          type="text"
          placeholder="ناوی کڕیار بنووسە یان بگەڕێ..."
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          style={inputStyle}
          autoComplete="off"
        />
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0, left: 0,
          background: "white", borderRadius: 10, boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          border: "1px solid #E9ECEF", zIndex: 500, maxHeight: 280, overflowY: "auto",
        }}>
          {filtered.length === 0 && (
            <div style={{ padding: "10px 14px", fontSize: 12, color: "#ADB5BD" }}>
              هیچ کڕیارێک نەدۆزرایەوە
            </div>
          )}

          {filtered.map(c => (
            <div
              key={c.id}
              onClick={() => handleSelect(c)}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderBottom: "1px solid #F8F9FA",
                background: value === c.id ? "#EDF2FF" : "white",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F8F9FA")}
              onMouseLeave={e => (e.currentTarget.style.background = value === c.id ? "#EDF2FF" : "white")}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: typeBg[c.type] || "#F1F3F5",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Building2 size={14} color={typeColor[c.type] || "#6C757D"} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  {c.city && (
                    <span style={{ fontSize: 11, color: "#ADB5BD", display: "flex", alignItems: "center", gap: 2 }}>
                      <MapPin size={9} />{c.city}
                    </span>
                  )}
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: typeBg[c.type] || "#F1F3F5", color: typeColor[c.type] || "#6C757D", fontWeight: 600 }}>
                    {typeLabel[c.type] || c.type}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Create new option — always shown at bottom */}
          <div
            onClick={() => { setOpen(false); onRequestNew(query); }}
            style={{
              padding: "11px 14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              borderTop: "1px solid #E9ECEF",
              background: "#FAFAFA",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#EDF2FF")}
            onMouseLeave={e => (e.currentTarget.style.background = "#FAFAFA")}
          >
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #4263EB, #7C5CFC)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Plus size={14} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#4263EB" }}>
                {query.trim() ? `داوا بکە بۆ: "${query}"` : "زیادکردنی کڕیاری نوێ"}
              </div>
              <div style={{ fontSize: 11, color: "#ADB5BD" }}>داواکاری دەنێردرێت بۆ بەرپرسان</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
