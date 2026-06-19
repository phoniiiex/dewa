"use client";
import React from "react";

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}

export function FormField({ label, children, required }: FormFieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#495057" }}>
        {label} {required && <span style={{ color: "#FA5252" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1px solid #DEE2E6",
  borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "#F8F9FA",
  outline: "none", transition: "border-color 0.2s",
};

export const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: "pointer", appearance: "none" as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236C757D' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "left 12px center",
};

export function FormGrid({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>{children}</div>;
}

export function FormActions({ onCancel, submitLabel = "زیادکردن", isEdit }: { onCancel: () => void; submitLabel?: string; isEdit?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 12, justifyContent: "flex-start", marginTop: 24, paddingTop: 16, borderTop: "1px solid #E9ECEF" }}>
      <button type="submit" style={{
        padding: "10px 28px", borderRadius: 8, background: "#4263EB", color: "white",
        fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit",
      }}>
        {isEdit ? "نوێکردنەوە" : submitLabel}
      </button>
      <button type="button" onClick={onCancel} style={{
        padding: "10px 28px", borderRadius: 8, border: "1px solid #DEE2E6", background: "white",
        fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#6C757D",
      }}>
        پاشگەزبوونەوە
      </button>
    </div>
  );
}
