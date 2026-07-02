"use client";
import React from "react";

interface Props { children: React.ReactNode; fallback?: React.ReactNode; }
interface State { hasError: boolean; error?: Error; }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "#F8F9FA", fontFamily: "inherit", padding: 32,
        }}>
          <div style={{
            background: "white", borderRadius: 16, padding: "40px 48px",
            boxShadow: "0 4px 24px rgba(0,0,0,.08)", textAlign: "center", maxWidth: 480,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1A1A2E", marginBottom: 8 }}>
              هەڵەیەک ڕوویدا
            </h2>
            <p style={{ color: "#6C757D", fontSize: 14, marginBottom: 24 }}>
              {this.state.error?.message || "کێشەیەک لە بارکردنی ئەم بەشە ڕوویدا."}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              style={{
                background: "#4263EB", color: "white", border: "none",
                borderRadius: 10, padding: "10px 24px", fontWeight: 600,
                fontSize: 14, cursor: "pointer",
              }}
            >
              نوێکردنەوە
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
