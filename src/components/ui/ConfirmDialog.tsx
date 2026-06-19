"use client";
import React from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export default function ConfirmDialog({ open, onClose, onConfirm, title = "دڵنیایت؟", message = "ئەم کردارە ناگەڕێتەوە." }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={420}>
      <div style={{ textAlign: "center", padding: "12px 0" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FFF5F5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#FA5252" }}>
          <AlertTriangle size={24} />
        </div>
        <p style={{ fontSize: 14, color: "#6C757D", marginBottom: 24 }}>{message}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onClose} style={{ padding: "10px 24px", borderRadius: 8, border: "1px solid #DEE2E6", background: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#6C757D" }}>
            پاشگەزبوونەوە
          </button>
          <button onClick={() => { onConfirm(); onClose(); }} style={{ padding: "10px 24px", borderRadius: 8, background: "#FA5252", color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            سڕینەوە
          </button>
        </div>
      </div>
    </Modal>
  );
}
