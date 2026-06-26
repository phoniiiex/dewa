"use client";
import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
  children: React.ReactNode;
  width?: number;
}

export default function Modal({ open, onClose, title, children, width = 560 }: ModalProps) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 400, animation: "fadeIn 0.15s ease",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--color-bg-card)",
        borderRadius: 16, width: "90%", maxWidth: width, maxHeight: "85vh",
        overflow: "auto", boxShadow: "var(--shadow-lg)", animation: "scaleIn 0.2s ease",
        border: "1px solid var(--color-border)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "20px 24px", borderBottom: "1px solid var(--color-border)",
          position: "sticky", top: 0, background: "var(--color-bg-card)", zIndex: 1,
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text-primary)" }}>{title}</h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--color-text-secondary)", background: "var(--color-bg-hover)",
            border: "none", cursor: "pointer",
          }} aria-label="داخستن">
            <X size={16} />
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: "20px 24px", color: "var(--color-text-primary)" }}>{children}</div>
      </div>
    </div>
  );
}
