"use client";
import { useState, FormEvent, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, DollarSign, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle, Search, ExternalLink } from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import type { TransactionType, PaymentMethod } from "@/lib/types";
import ExportButton from "@/components/custom/ExportButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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
  const router = useRouter();
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
    <div className="page-stagger">
      {/* ── Page Header ── */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center text-emerald-600">
            <DollarSign className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">دارایی و حیساب</h1>
            <p className="text-sm text-muted-foreground">بەدواداچوونی داهات، خەرجی، و قازانج</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={filtered as unknown as Record<string, unknown>[]} columns={transactionExportCols} filename="finance" title="دارایی" />
          <Button onClick={() => setModalOpen(true)}><Plus className="size-4 me-1" />مامەڵەی نوێ</Button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { title: "کۆی داهات",   value: formatIQD(totalIncome),  cls: "text-emerald-600" },
          { title: "کۆی خەرجی",   value: formatIQD(totalExpense), cls: "text-destructive" },
          { title: "قازانجی تەوا", value: formatIQD(netProfit),   cls: netProfit >= 0 ? "text-emerald-600" : "text-destructive" },
          { title: "کۆی مامەڵە",  value: String(transactions.length), cls: "text-primary" },
        ].map((k, i) => (
          <Card key={i} className="card-interactive">
            <CardContent className="p-4">
              <p className={cn("text-xl font-black", k.cls)}>{k.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Summary Gradient Cards ── */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3 opacity-90"><ArrowUpCircle className="size-5" /><span className="text-sm">داهات</span></div>
          <p className="text-3xl font-black">{formatIQD(totalIncome)}</p>
          <p className="mt-2 text-xs opacity-80">{transactions.filter(t => t.type === "INCOME").length} مامەڵە</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-700 text-white rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3 opacity-90"><ArrowDownCircle className="size-5" /><span className="text-sm">خەرجی</span></div>
          <p className="text-3xl font-black">{formatIQD(totalExpense)}</p>
          <p className="mt-2 text-xs opacity-80">{transactions.filter(t => t.type === "EXPENSE").length} مامەڵە</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <div className="relative">
          <Search className="size-3.5 absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input type="text" placeholder="گەڕان..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-64 pe-9" />
        </div>
        <div className="flex bg-muted p-1 rounded-xl gap-1">
          {["هەموو", "داهات", "خەرجی"].map(s => (
            <Button key={s} variant={typeFilter === s ? "secondary" : "ghost"} size="sm"
              onClick={() => setTypeFilter(s)}
              className={cn("px-3.5 rounded-lg text-xs font-bold",
                typeFilter === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Data Table ── */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-right">جۆر</TableHead>
                <TableHead className="text-right">وەسف</TableHead>
                <TableHead className="text-right">بڕ</TableHead>
                <TableHead className="text-right">شێواز</TableHead>
                <TableHead className="text-right">بەروار</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">هیچ مامەڵەیەک نەدۆزرایەوە</TableCell>
                </TableRow>
              ) : filtered.map(t => (
                <TableRow key={t.id}
                  onClick={() => { if (t.relatedOrderId) router.push("/dashboard/orders"); }}
                  className={cn(t.relatedOrderId && "cursor-pointer")}>
                  <TableCell>
                    <Badge className={cn("gap-1 text-[11px]",
                      t.type === "INCOME" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                           : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300")}>
                      {t.type === "INCOME" ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                      {typeLabels[t.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    <span className="flex items-center gap-1.5">
                      {t.description}
                      {t.relatedOrderId && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          <ExternalLink className="size-2" /> داواکاری
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className={cn("font-bold", t.type === "INCOME" ? "text-emerald-600" : "text-destructive")}>
                    {t.type === "INCOME" ? "+" : "-"}{formatIQD(t.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[11px]">{methodLabels[t.method]}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.createdAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-4 py-2.5 border-t bg-muted/20 text-xs text-muted-foreground">{filtered.length} مامەڵە</div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════
          ADD TRANSACTION DIALOG
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>مامەڵەی نوێ</DialogTitle>
            <DialogDescription>زانیاری مامەڵەکە پڕبکەوە</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type selector */}
            <div className="space-y-2">
              <Label>جۆر</Label>
              <div className="flex gap-2">
                {(["INCOME", "EXPENSE"] as TransactionType[]).map(t => (
                  <Button key={t} type="button" variant={form.type === t ? "outline" : "ghost"}
                    onClick={() => setForm({ ...form, type: t })}
                    className={cn("flex-1 py-2.5 rounded-xl border-2 text-sm font-bold",
                      form.type === t
                        ? t === "INCOME" ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                        : "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                        : "border-border text-muted-foreground")}>
                    {t === "INCOME" ? "↗ داهات" : "↘ خەرجی"}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="txn-desc">وەسف *</Label>
              <Input id="txn-desc" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="بۆ نموونە: پارەدانی دەرمانخانەی ئازادی" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="txn-amount">بڕ (د.ع) *</Label>
              <Input id="txn-amount" type="number" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="5000000" />
            </div>

            {/* Method selector */}
            <div className="space-y-2">
              <Label>شێوازی پارەدان</Label>
              <div className="flex gap-2">
                {(["CASH", "TRANSFER"] as PaymentMethod[]).map(m => (
                  <Button key={m} type="button" variant={form.method === m ? "outline" : "ghost"}
                    onClick={() => setForm({ ...form, method: m })}
                    className={cn("flex-1 py-2.5 rounded-xl border-2 text-sm font-bold",
                      form.method === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
                    {methodLabels[m]}
                  </Button>
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>پاشگەزبوونەوە</Button>
              <Button type="submit">تۆمارکردن</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
