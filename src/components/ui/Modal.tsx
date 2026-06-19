"use client";
import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
}

export default function Modal({ open, onClose, title, children, width = 560 }: ModalProps) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 400, animation: "fadeIn 0.15s ease",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "white", borderRadius: 16, width: "90%", maxWidth: width, maxHeight: "85vh",
        overflow: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.15)", animation: "scaleIn 0.2s ease",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "20px 24px", borderBottom: "1px solid #E9ECEF", position: "sticky", top: 0, background: "white", zIndex: 1,
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            color: "#6C757D", background: "#F1F3F5", border: "none", cursor: "pointer",
          }} aria-label="داخستن">
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: "20px 24px" }}>{children}</div>
      </div>
    </div>
  );
}
