"use client";
import { useState } from "react";
import {
  Search,
  Grid3X3,
  List,
  Plus,
  Package,
  Filter,
  ChevronDown,
  MoreHorizontal,
  Edit3,
  Trash2,
  Eye,
  Calendar,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { formatIQD } from "@/lib/currency";

interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  price: number;
  stock: number;
  image: string;
  supplier: string;
  origin: string;
  expiryDate: string;
  batchNumber: string;
  unitType: string;
  isActive: boolean;
  isSample: boolean;
}

const products: Product[] = [
  { id: "1", name: "پاراسیتامۆل ٥٠٠ملگ", category: "ئازارکوژ", sku: "PAR-500-T", price: 5_000, stock: 1250, image: "💊", supplier: "فارما فرانسا", origin: "فەرەنسا 🇫🇷", expiryDate: "٢٠٢٧/٠٣/١٥", batchNumber: "BT-2025-001", unitType: "حەب", isActive: true, isSample: false },
  { id: "2", name: "ئەمۆکسیسیلین ٢٥٠ملگ", category: "ئەنتیبایۆتیک", sku: "AMX-250-C", price: 12_000, stock: 850, image: "💊", supplier: "مەدیکۆ تورکیا", origin: "تورکیا 🇹🇷", expiryDate: "٢٠٢٧/٠٦/٢٠", batchNumber: "BT-2025-002", unitType: "کاپسوول", isActive: true, isSample: false },
  { id: "3", name: "ئۆمیپرازۆل ٢٠ملگ", category: "گەدە و هەرس", sku: "OMP-020-C", price: 8_500, stock: 620, image: "💊", supplier: "جۆردان فارما", origin: "ئوردن 🇯🇴", expiryDate: "٢٠٢٧/٠١/١٠", batchNumber: "BT-2025-003", unitType: "کاپسوول", isActive: true, isSample: false },
  { id: "4", name: "مێتفۆرمین ٥٠٠ملگ", category: "شەکرە", sku: "MET-500-T", price: 6_000, stock: 980, image: "💊", supplier: "ئینتا فارما", origin: "هندستان 🇮🇳", expiryDate: "٢٠٢٧/٠٨/٠٥", batchNumber: "BT-2025-004", unitType: "حەب", isActive: true, isSample: false },
  { id: "5", name: "ئازیترۆمایسین ٥٠٠ملگ", category: "ئەنتیبایۆتیک", sku: "AZI-500-T", price: 15_000, stock: 430, image: "💊", supplier: "فارما فرانسا", origin: "فەرەنسا 🇫🇷", expiryDate: "٢٠٢٦/١٢/٢٥", batchNumber: "BT-2025-005", unitType: "حەب", isActive: true, isSample: false },
  { id: "6", name: "سیپرۆفلۆکساسین ٥٠٠ملگ", category: "ئەنتیبایۆتیک", sku: "CIP-500-T", price: 11_000, stock: 320, image: "💊", supplier: "مەدیکۆ تورکیا", origin: "تورکیا 🇹🇷", expiryDate: "٢٠٢٧/٠٤/١٨", batchNumber: "BT-2025-006", unitType: "حەب", isActive: true, isSample: false },
  { id: "7", name: "ئایبوپرۆفین ٤٠٠ملگ", category: "ئازارکوژ", sku: "IBU-400-T", price: 4_500, stock: 1100, image: "💊", supplier: "ئینتا فارما", origin: "هندستان 🇮🇳", expiryDate: "٢٠٢٧/٠٩/٣٠", batchNumber: "BT-2025-007", unitType: "حەب", isActive: true, isSample: false },
  { id: "8", name: "دیکلۆفیناک ٥٠ملگ", category: "ئازارکوژ", sku: "DIC-050-T", price: 7_000, stock: 670, image: "💊", supplier: "جۆردان فارما", origin: "ئوردن 🇯🇴", expiryDate: "٢٠٢٧/٠٢/٢٨", batchNumber: "BT-2025-008", unitType: "حەب", isActive: true, isSample: false },
  { id: "9", name: "ڤیتامین C ١٠٠٠ملگ (نموونە)", category: "ڤیتامین", sku: "VTC-1000-T", price: 3_000, stock: 200, image: "🧪", supplier: "مەدیکۆ تورکیا", origin: "تورکیا 🇹🇷", expiryDate: "٢٠٢٧/١١/١٥", batchNumber: "BT-2025-009", unitType: "حەب", isActive: true, isSample: true },
  { id: "10", name: "ئەسپیرین ٣٠٠ملگ", category: "ئازارکوژ", sku: "ASP-300-T", price: 3_500, stock: 45, image: "💊", supplier: "فارما فرانسا", origin: "فەرەنسا 🇫🇷", expiryDate: "٢٠٢٦/٠٩/٠١", batchNumber: "BT-2024-010", unitType: "حەب", isActive: false, isSample: false },
];

const categories = ["هەموو", "ئازارکوژ", "ئەنتیبایۆتیک", "گەدە و هەرس", "شەکرە", "ڤیتامین"];

const kpis = [
  { title: "کۆی بەرهەمەکان", value: "٢٤٨" },
  { title: "بەرهەمی چالاک", value: "٢٣٦" },
  { title: "بەرهەمی کەمبوونەوە", value: "١٢", highlight: true },
  { title: "بەسەرچوو / نزیکی بەسەرچوون", value: "٣", danger: true },
];

function getExpiryStatus(dateStr: string): "ok" | "warning" | "expired" {
  // Simple check based on year/month
  if (dateStr.includes("٢٠٢٦/٠٩") || dateStr.includes("٢٠٢٦/١٢")) return "warning";
  if (dateStr.includes("٢٠٢٦/٠٦") || dateStr.includes("٢٠٢٥")) return "expired";
  return "ok";
}

export default function ProductsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("هەموو");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.includes(searchTerm) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "هەموو" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

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
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>بەرهەمەکان</h1>
            <p style={{ fontSize: 13, color: "#6C757D" }}>بەڕێوەبردنی بەرهەمەکان، کۆگا، و بەسەرچوون</p>
          </div>
        </div>
        <button className="topbar-add-btn" id="add-product">
          <Plus size={16} />
          <span>بەرهەمی نوێ</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {kpis.map((kpi, i) => (
          <div className="kpi-card" key={i} style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="kpi-card-title" style={{ marginBottom: 8 }}>{kpi.title}</div>
            <div className="kpi-card-value" style={{
              fontSize: "1.5rem",
              color: kpi.danger ? "#FA5252" : kpi.highlight ? "#FD7E14" : undefined
            }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <div style={{ position: "relative", maxWidth: 320 }}>
            <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ADB5BD" }} />
            <input
              type="text"
              placeholder="گەڕان بە ناو یان SKU..."
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
          {/* Category Tabs */}
          <div style={{ display: "flex", gap: 4, background: "#F1F3F5", borderRadius: 8, padding: 2 }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                  background: activeCategory === cat ? "white" : "transparent",
                  color: activeCategory === cat ? "#1A1A2E" : "#6C757D",
                  boxShadow: activeCategory === cat ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  border: "none", cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#F1F3F5", borderRadius: 8, padding: 2 }}>
          <button
            onClick={() => setViewMode("grid")}
            style={{
              padding: "6px 10px", borderRadius: 6, display: "flex", border: "none", cursor: "pointer",
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
              padding: "6px 10px", borderRadius: 6, display: "flex", border: "none", cursor: "pointer",
              background: viewMode === "list" ? "white" : "transparent",
              color: viewMode === "list" ? "#1A1A2E" : "#ADB5BD",
              boxShadow: viewMode === "list" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
            }}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* GRID VIEW */}
      {viewMode === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {filteredProducts.map((product, i) => {
            const expiry = getExpiryStatus(product.expiryDate);
            return (
              <div
                key={product.id}
                className="kpi-card"
                style={{ cursor: "pointer", padding: 0, overflow: "hidden", animationDelay: `${i * 0.04}s` }}
                onClick={() => setSelectedProduct(product)}
              >
                <div style={{
                  height: 140, background: product.isSample ? "#FFF9DB" : "#F8F9FA",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 40, position: "relative",
                }}>
                  {product.image}
                  {product.isSample && (
                    <span style={{
                      position: "absolute", top: 8, left: 8,
                      background: "#FD7E14", color: "white", padding: "2px 8px",
                      borderRadius: 4, fontSize: 10, fontWeight: 700,
                    }}>نموونە</span>
                  )}
                  {!product.isActive && (
                    <span style={{
                      position: "absolute", top: 8, left: 8,
                      background: "#FA5252", color: "white", padding: "2px 8px",
                      borderRadius: 4, fontSize: 10, fontWeight: 700,
                    }}>ناچالاک</span>
                  )}
                  {expiry === "warning" && (
                    <span style={{
                      position: "absolute", top: 8, right: 8,
                      display: "flex", alignItems: "center", gap: 4,
                      background: "#FFF9DB", color: "#FD7E14", padding: "2px 8px",
                      borderRadius: 4, fontSize: 10, fontWeight: 600,
                    }}>
                      <AlertTriangle size={10} /> نزیکە
                    </span>
                  )}
                </div>
                <div style={{ padding: "12px 16px 16px" }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{product.name}</div>
                  <div style={{ fontSize: 11, color: "#6C757D", display: "flex", justifyContent: "space-between" }}>
                    <span>{product.category}</span>
                    <span style={{ direction: "ltr" }}>{product.sku}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#ADB5BD", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={10} /> {product.origin}
                  </div>
                  <div style={{ fontSize: 11, color: expiry === "warning" ? "#FD7E14" : "#ADB5BD", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                    <Calendar size={10} /> {product.expiryDate}
                  </div>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginTop: 12, paddingTop: 12, borderTop: "1px solid #E9ECEF",
                  }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{formatIQD(product.price)}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: product.stock > 500 ? "#40C057" : product.stock > 100 ? "#FD7E14" : "#FA5252",
                      background: product.stock > 500 ? "#EBFBEE" : product.stock > 100 ? "#FFF9DB" : "#FFF5F5",
                      padding: "2px 8px", borderRadius: 4,
                    }}>
                      {product.stock.toLocaleString()} {product.unitType}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}><input type="checkbox" style={{ accentColor: "#4263EB" }} /></th>
                <th>بەرهەم</th>
                <th>SKU</th>
                <th>جۆر</th>
                <th>ولاتی دروستکردن</th>
                <th>دابینکەر</th>
                <th>بەسەرچوون</th>
                <th>ژمارەی بەچ</th>
                <th>یەکە</th>
                <th>کۆگا</th>
                <th>نرخ</th>
                <th>بارودۆخ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const expiry = getExpiryStatus(product.expiryDate);
                return (
                  <tr key={product.id} onClick={() => setSelectedProduct(product)} style={{ cursor: "pointer" }}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" style={{ accentColor: "#4263EB" }} />
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{product.image}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{product.name}</div>
                          {product.isSample && (
                            <span style={{ fontSize: 10, background: "#FFF9DB", color: "#FD7E14", padding: "1px 6px", borderRadius: 3, fontWeight: 600 }}>نموونە</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: "#6C757D", direction: "ltr", textAlign: "right" }}>{product.sku}</td>
                    <td style={{ fontSize: 13 }}>{product.category}</td>
                    <td style={{ fontSize: 13 }}>{product.origin}</td>
                    <td style={{ fontSize: 13, color: "#6C757D" }}>{product.supplier}</td>
                    <td>
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: expiry === "expired" ? "#FA5252" : expiry === "warning" ? "#FD7E14" : "#40C057",
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        {expiry === "warning" && <AlertTriangle size={12} />}
                        {product.expiryDate}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: "#6C757D", direction: "ltr", textAlign: "right" }}>{product.batchNumber}</td>
                    <td style={{ fontSize: 12, color: "#6C757D" }}>{product.unitType}</td>
                    <td>
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: product.stock > 500 ? "#40C057" : product.stock > 100 ? "#FD7E14" : "#FA5252",
                      }}>
                        {product.stock.toLocaleString()}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{formatIQD(product.price)}</td>
                    <td>
                      <span className={`status-badge ${product.isActive ? "paid" : "cancelled"}`}>
                        {product.isActive ? "چالاک" : "ناچالاک"}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button style={{ padding: 4, color: "#4263EB" }}><Eye size={14} /></button>
                        <button style={{ padding: 4, color: "#6C757D" }}><Edit3 size={14} /></button>
                        <button style={{ padding: 4, color: "#FA5252" }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="pagination">
            <span className="pagination-info">نیشاندانی {filteredProducts.length} لە {products.length} بەرهەم</span>
            <div className="pagination-buttons">
              <button className="pagination-btn active">١</button>
              <button className="pagination-btn">٢</button>
              <button className="pagination-btn">٣</button>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Drawer */}
      {selectedProduct && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.3)", zIndex: 400,
            display: "flex", justifyContent: "flex-start",
          }}
          onClick={() => setSelectedProduct(null)}
        >
          <div
            style={{
              width: 480, background: "white", height: "100%",
              boxShadow: "4px 0 24px rgba(0,0,0,0.15)",
              padding: 32, overflowY: "auto",
              animation: "slideInRight 0.3s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>وردەکاری بەرهەم</h2>
              <button onClick={() => setSelectedProduct(null)} style={{ padding: 4, color: "#ADB5BD", fontSize: 18 }}>✕</button>
            </div>

            <div style={{ textAlign: "center", background: "#F8F9FA", borderRadius: 12, padding: 32, marginBottom: 24 }}>
              <span style={{ fontSize: 64 }}>{selectedProduct.image}</span>
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{selectedProduct.name}</h3>
            {selectedProduct.isSample && (
              <span style={{ background: "#FFF9DB", color: "#FD7E14", padding: "2px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>نموونەی بازرگانی</span>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
              {[
                { label: "SKU", value: selectedProduct.sku },
                { label: "جۆر", value: selectedProduct.category },
                { label: "یەکەی پێوانە", value: selectedProduct.unitType },
                { label: "نرخی تاک", value: formatIQD(selectedProduct.price) },
                { label: "ولاتی دروستکردن", value: selectedProduct.origin },
                { label: "دابینکەر", value: selectedProduct.supplier },
                { label: "بەرواری بەسەرچوون", value: selectedProduct.expiryDate },
                { label: "ژمارەی بەچ", value: selectedProduct.batchNumber },
                { label: "بڕی کۆگا", value: `${selectedProduct.stock.toLocaleString()} ${selectedProduct.unitType}` },
                { label: "بارودۆخ", value: selectedProduct.isActive ? "چالاک" : "ناچالاک" },
              ].map((item, i) => (
                <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid #E9ECEF" }}>
                  <div style={{ fontSize: 11, color: "#ADB5BD", marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
              <button style={{
                flex: 1, padding: "10px 16px", background: "#4263EB", color: "white",
                borderRadius: 8, fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer",
                fontFamily: "inherit",
              }}>
                <Edit3 size={14} style={{ display: "inline", verticalAlign: "middle", marginLeft: 6 }} />
                دەستکاریکردن
              </button>
              <button style={{
                padding: "10px 16px", border: "1px solid #DEE2E6",
                borderRadius: 8, color: "#6C757D", fontWeight: 600, fontSize: 14,
                cursor: "pointer", background: "white", fontFamily: "inherit",
              }}>
                <Trash2 size={14} style={{ display: "inline", verticalAlign: "middle", marginLeft: 6 }} />
                سڕینەوە
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
