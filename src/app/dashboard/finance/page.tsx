"use client";
import { useState, FormEvent, useMemo } from "react";
import { Plus, DollarSign, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle, Search } from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import type { TransactionType, PaymentMethod } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import { FormField, FormGrid, FormActions, inputStyle, selectStyle } from "@/components/ui/FormField";
import ExportButton from "@/components/ui/ExportButton";

const transactionExportCols = [
  { key: "type", label: "جۆر", format: (v: unknown) => v === "INCOME" ? "داهات" : "خەرجی" },
  { key: "description", label: "وێنە" },
  { key: "amount", label: "بڕە", format: (v: unknown) => String(v) },
  { key: "method", label: "ھەڵۚەی پارەدان", format: (v: unknown) => v === "CASH" ? "کاش" : "حاواڵە" },
  { key: "createdAt", label: "بەروار" },
];

const typeLabels: Record<TransactionType, string> = { INCOME: "داهات", EXPENSE: "خەرجی" };
const methodLabels: Record<PaymentMethod, string> = { CASH: "کاش", TRANSFER: "حاوالە" };

export default function FinancePage() {
  const { transactions, addTransaction } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("هەموو");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ type: "INCOME" as TransactionType, description: "", amount: "", method: "CASH" as PaymentMethod, relatedOrderId: null as string | null });

  const { totalIncome, totalExpense, netProfit, filtered } = useMemo(() => {
    const income  = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
    const filt = transactions.filter(t => {
      const matchSearch = t.description.includes(searchTerm);
      const matchType = typeFilter === "هەموو" || typeLabels[t.type] === typeFilter;
      return matchSearch && matchType;
    });
    return { totalIncome: income, totalExpense: expense, netProfit: income - expense, filtered: filt };
  }, [transactions, searchTerm, typeFilter]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    addTransaction({ ...form, amount: Number(form.amount), relatedOrderId: form.relatedOrderId });
    setModalOpen(false);
    setForm({ type: "INCOME", description: "", amount: "", method: "CASH", relatedOrderId: null });
  };


  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "#EBFBEE", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#40C057" }}><DollarSign size={20} /></div>
          <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>دارایی و حیساب</h1><p style={{ fontSize: 13, color: "#6C757D" }}>بەدواداچوونی داهات، خەرجی، و قازانج</p></div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportButton data={filtered as unknown as Record<string, unknown>[]} columns={transactionExportCols} filename="finance" title="دارایی" />
          <button onClick={() => setModalOpen(true)} className="topbar-add-btn"><Plus size={16} /><span>مامەڵەی نوێ</span></button>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        {[
          { title: "کۆی داهات", value: formatIQD(totalIncome), color: "#40C057", icon: <TrendingUp size={16} /> },
          { title: "کۆی خەرجی", value: formatIQD(totalExpense), color: "#FA5252", icon: <TrendingDown size={16} /> },
          { title: "قازانجی تەوا", value: formatIQD(netProfit), color: netProfit >= 0 ? "#40C057" : "#FA5252" },
          { title: "کۆی مامەڵە", value: String(transactions.length) },
        ].map((k, i) => (
          <div className="kpi-card" key={i}>
            <div className="kpi-card-title" style={{ marginBottom: 8 }}>{k.title}</div>
            <div className="kpi-card-value" style={{ fontSize: "1.3rem", color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "linear-gradient(135deg, #40C057, #2B8A3E)", color: "white", borderRadius: 14, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, opacity: 0.9 }}><ArrowUpCircle size={20} /> <span style={{ fontSize: 14 }}>داهات</span></div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{formatIQD(totalIncome)}</div>
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>{transactions.filter(t => t.type === "INCOME").length} مامەڵە</div>
        </div>
        <div style={{ background: "linear-gradient(135deg, #FA5252, #C92A2A)", color: "white", borderRadius: 14, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, opacity: 0.9 }}><ArrowDownCircle size={20} /> <span style={{ fontSize: 14 }}>خەرجی</span></div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{formatIQD(totalExpense)}</div>
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>{transactions.filter(t => t.type === "EXPENSE").length} مامەڵە</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ADB5BD" }} />
          <input type="text" placeholder="گەڕان..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: 280, padding: "8px 36px 8px 12px", border: "1px solid #DEE2E6", borderRadius: 8, fontSize: 13, background: "#F8F9FA", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "flex", gap: 4, background: "#F1F3F5", borderRadius: 8, padding: 2 }}>
          {["هەموو", "داهات", "خەرجی"].map(s => (
            <button key={s} onClick={() => setTypeFilter(s)} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: typeFilter === s ? "white" : "transparent", color: typeFilter === s ? "#1A1A2E" : "#6C757D", boxShadow: typeFilter === s ? "0 1px 2px rgba(0,0,0,0.05)" : "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>{s}</button>
          ))}
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>جۆر</th><th>وەسف</th><th>بڕ</th><th>شێواز</th><th>بەروار</th></tr></thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id}>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: t.type === "INCOME" ? "#D3F9D8" : "#FFE3E3", color: t.type === "INCOME" ? "#2B8A3E" : "#C92A2A" }}>
                    {t.type === "INCOME" ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {typeLabels[t.type]}
                  </span>
                </td>
                <td style={{ fontWeight: 600, fontSize: 13 }}>{t.description}</td>
                <td style={{ fontWeight: 700, fontSize: 14, color: t.type === "INCOME" ? "#40C057" : "#FA5252" }}>{t.type === "INCOME" ? "+" : "-"}{formatIQD(t.amount)}</td>
                <td><span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, background: "#F1F3F5" }}>{methodLabels[t.method]}</span></td>
                <td style={{ fontSize: 12, color: "#6C757D" }}>{t.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination"><span className="pagination-info">{filtered.length} مامەڵە</span></div>
      </div>

      {/* Add Transaction Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="مامەڵەی نوێ" width={480}>
        <form onSubmit={handleSubmit}>
          <FormGrid cols={1}>
            <FormField label="جۆر">
              <div style={{ display: "flex", gap: 8 }}>
                {(["INCOME", "EXPENSE"] as TransactionType[]).map(t => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, type: t })} style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: `2px solid ${form.type === t ? (t === "INCOME" ? "#40C057" : "#FA5252") : "#DEE2E6"}`, background: form.type === t ? (t === "INCOME" ? "#D3F9D8" : "#FFE3E3") : "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: form.type === t ? (t === "INCOME" ? "#2B8A3E" : "#C92A2A") : "#6C757D" }}>
                    {t === "INCOME" ? "↗ داهات" : "↘ خەرجی"}
                  </button>
                ))}
              </div>
            </FormField>
            <FormField label="وەسف" required><input style={inputStyle} required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="بۆ نموونە: پارەدانی دەرمانخانەی ئازادی" /></FormField>
            <FormField label="بڕ (د.ع)" required><input style={inputStyle} type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="5000000" /></FormField>
            <FormField label="شێوازی پارەدان">
              <div style={{ display: "flex", gap: 8 }}>
                {(["CASH", "TRANSFER"] as PaymentMethod[]).map(m => (
                  <button key={m} type="button" onClick={() => setForm({ ...form, method: m })} style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: `2px solid ${form.method === m ? "#4263EB" : "#DEE2E6"}`, background: form.method === m ? "#EDF2FF" : "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: form.method === m ? "#4263EB" : "#6C757D" }}>
                    {methodLabels[m]}
                  </button>
                ))}
              </div>
            </FormField>
          </FormGrid>
          <FormActions onCancel={() => setModalOpen(false)} submitLabel="تۆمارکردن" />
        </form>
      </Modal>
    </>
  );
}
