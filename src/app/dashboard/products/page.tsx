"use client";
import { useState } from "react";
import { Search, Grid3X3, List, Plus, Package } from "lucide-react";
import { formatIQD } from "@/lib/currency";

const products = [
  { name: "پاراسیتامۆل ٥٠٠ملگ", category: "ئازارکوژ", sku: "PAR-500-T", price: 5_000, stock: 1250, image: "💊" },
  { name: "ئەمۆکسیسیلین ٢٥٠ملگ", category: "ئەنتیبایۆتیک", sku: "AMX-250-C", price: 12_000, stock: 850, image: "💊" },
  { name: "ئۆمیپرازۆل ٢٠ملگ", category: "گەدە", sku: "OMP-020-C", price: 8_500, stock: 620, image: "💊" },
  { name: "مێتفۆرمین ٥٠٠ملگ", category: "شەکرە", sku: "MET-500-T", price: 6_000, stock: 980, image: "💊" },
  { name: "ئازیترۆمایسین ٥٠٠ملگ", category: "ئەنتیبایۆتیک", sku: "AZI-500-T", price: 15_000, stock: 430, image: "💊" },
  { name: "سیپرۆفلۆکساسین ٥٠٠ملگ", category: "ئەنتیبایۆتیک", sku: "CIP-500-T", price: 11_000, stock: 320, image: "💊" },
  { name: "ئایبوپرۆفین ٤٠٠ملگ", category: "ئازارکوژ", sku: "IBU-400-T", price: 4_500, stock: 1100, image: "💊" },
  { name: "دیکلۆفیناک ٥٠ملگ", category: "ئازارکوژ", sku: "DIC-050-T", price: 7_000, stock: 670, image: "💊" },
];

const kpis = [
  { title: "کۆی بەرهەمەکان", value: "٢٤٨", change: "+١٢ لەم هەفتەیە" },
  { title: "بەرهەمی چالاک", value: "١٨٦", change: "+٢٪ لە کۆی" },
  { title: "کۆی فرۆشتن", value: "٨,٩٤٤", change: "+٢.١٪ لەم هەفتەیە" },
  { title: "کۆی داهات", value: formatIQD(8_944_000), change: "-٠.٥٪ بە بەراورد بە هەفتەی پێشوو" },
];

export default function ProductsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProducts = products.filter((p) =>
    p.name.includes(searchTerm) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, background: "#EDF2FF", borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center", color: "#4263EB"
          }}>
            <Package size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>بەرهەمەکانم</h1>
            <p style={{ fontSize: 13, color: "#6C757D" }}>بەڕێوەبردن و هاوکاری لەسەر بەرهەمەکانت</p>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {kpis.map((kpi, i) => (
          <div className="kpi-card" key={i} style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="kpi-card-title" style={{ marginBottom: 8 }}>{kpi.title}</div>
            <div className="kpi-card-value" style={{ fontSize: "1.5rem" }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: "#6C757D", marginTop: 4 }}>{kpi.change}</div>
          </div>
        ))}
      </div>

      {/* Search & View Toggle */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20, gap: 12
      }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
          <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ADB5BD" }} />
          <input
            type="text"
            placeholder="گەڕان لە بەرهەمەکان..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            id="products-search"
            style={{
              width: "100%", padding: "8px 36px 8px 12px",
              border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 13,
              background: "#F8F9FA", fontFamily: "inherit",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 4, background: "#F1F3F5", borderRadius: 8, padding: 2 }}>
          <button
            onClick={() => setViewMode("grid")}
            style={{
              padding: "6px 10px", borderRadius: 6, display: "flex",
              background: viewMode === "grid" ? "white" : "transparent",
              color: viewMode === "grid" ? "#1A1A2E" : "#ADB5BD",
              boxShadow: viewMode === "grid" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
            }}
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            style={{
              padding: "6px 10px", borderRadius: 6, display: "flex",
              background: viewMode === "list" ? "white" : "transparent",
              color: viewMode === "list" ? "#1A1A2E" : "#ADB5BD",
              boxShadow: viewMode === "list" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
            }}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Product Grid */}
      {viewMode === "grid" ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 20,
        }}>
          {filteredProducts.map((product, i) => (
            <div
              key={i}
              className="kpi-card"
              style={{
                cursor: "pointer",
                padding: 0,
                overflow: "hidden",
                animationDelay: `${i * 0.04}s`,
              }}
            >
              {/* Product Image Area */}
              <div style={{
                height: 160, background: "#F8F9FA",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 48, position: "relative",
              }}>
                {product.image}
                {/* Stock indicator dots */}
                <div style={{
                  position: "absolute", top: 12, right: 12,
                  display: "flex", gap: 4,
                }}>
                  <span style={{ width: 12, height: 4, borderRadius: 2, background: "#4263EB" }} />
                  <span style={{ width: 4, height: 4, borderRadius: 2, background: "#DEE2E6" }} />
                  <span style={{ width: 4, height: 4, borderRadius: 2, background: "#DEE2E6" }} />
                </div>
              </div>
              {/* Product Info */}
              <div style={{ padding: "12px 16px 16px" }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                  {product.name}
                </div>
                <div style={{ fontSize: 12, color: "#6C757D" }}>{product.category}</div>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginTop: 12, paddingTop: 12, borderTop: "1px solid #E9ECEF",
                }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{formatIQD(product.price)}</span>
                  <span style={{
                    fontSize: 11, color: product.stock > 500 ? "#40C057" : "#FD7E14",
                    background: product.stock > 500 ? "#EBFBEE" : "#FFF9DB",
                    padding: "2px 8px", borderRadius: 4,
                  }}>
                    {product.stock.toLocaleString()} یەکە
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>بەرهەم</th>
                <th>هۆنراو</th>
                <th>جۆر</th>
                <th>نرخ</th>
                <th>کۆگا</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 24 }}>{product.image}</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{product.name}</div>
                        <div style={{ fontSize: 11, color: "#ADB5BD" }}>{product.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: "#6C757D" }}>{product.sku}</td>
                  <td>{product.category}</td>
                  <td style={{ fontWeight: 600 }}>{formatIQD(product.price)}</td>
                  <td>
                    <span style={{
                      fontSize: 12, color: product.stock > 500 ? "#40C057" : "#FD7E14",
                      fontWeight: 600,
                    }}>
                      {product.stock.toLocaleString()} یەکە
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
