"use client";
import { useState, FormEvent, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, DollarSign, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle,
  Search, ExternalLink, Users, UserCheck, CreditCard, AlertTriangle, Wallet,
} from "lucide-react";
import {
  Bar, BarChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip as RechartsTooltip,
} from "recharts";
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
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig,
} from "@/components/ui/chart";

// ── Constants ────────────────────────────────────────────────────────────────
const transactionExportCols = [
  { key: "type", label: "جۆر", format: (v: unknown) => v === "INCOME" ? "داهات" : "خەرجی" },
  { key: "description", label: "وێنە" },
  { key: "amount", label: "بڕە", format: (v: unknown) => String(v) },
  { key: "method", label: "ھەڵۚەی پارەدان", format: (v: unknown) => v === "CASH" ? "کاش" : "حاواڵە" },
  { key: "createdAt", label: "بەروار" },
];

const typeLabels: Record<TransactionType, string> = { INCOME: "داهات", EXPENSE: "خەرجی" };
const methodLabels: Record<PaymentMethod, string> = { CASH: "کاش", TRANSFER: "حاوالە" };

const CHART_COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))",
  "#8b5cf6", "#f97316", "#06b6d4", "#ec4899", "#84cc16",
];

const TABS = [
  { key: "overview", label: "پوختە" },
  { key: "debts",    label: "قەرزەکان" },
  { key: "reps",     label: "نوێنەرەکان" },
  { key: "txns",     label: "مامەڵەکان" },
] as const;
type TabKey = typeof TABS[number]["key"];

// ── Helpers ──────────────────────────────────────────────────────────────────
function shortNum(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function FinancePage() {
  const router = useRouter();
  const { transactions, addTransaction, clients, orders, reps } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("هەموو");
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [form, setForm] = useState({ type: "INCOME" as TransactionType, description: "", amount: "", method: "CASH" as PaymentMethod, relatedOrderId: null as string | null });

  // ── Memoized data ──────────────────────────────────────────────────────────
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

  // ── Customer debts ─────────────────────────────────────────────────────────
  const debtData = useMemo(() => {
    const debtors = clients
      .filter(c => c.balance > 0)
      .sort((a, b) => b.balance - a.balance);
    const totalDebt = debtors.reduce((s, c) => s + c.balance, 0);
    const debtorCount = debtors.length;
    const top10 = debtors.slice(0, 10).map(c => ({
      name: c.name.length > 15 ? c.name.slice(0, 15) + "…" : c.name,
      fullName: c.name,
      amount: c.balance,
      city: c.city,
      repId: c.repId,
    }));
    return { debtors, totalDebt, debtorCount, top10 };
  }, [clients]);

  // ── Rep performance ────────────────────────────────────────────────────────
  const repData = useMemo(() => {
    const repMap = new Map<string, { name: string; sales: number; count: number }>();
    orders.forEach(o => {
      if (!o.repName || o.status === "NOT_ACCEPTED") return;
      const existing = repMap.get(o.repId) || { name: o.repName, sales: 0, count: 0 };
      existing.sales += o.totalAmount;
      existing.count += 1;
      repMap.set(o.repId, existing);
    });
    const repList = Array.from(repMap.entries())
      .map(([id, d]) => ({ id, name: d.name, sales: d.sales, count: d.count, avg: d.count > 0 ? Math.round(d.sales / d.count) : 0 }))
      .sort((a, b) => b.sales - a.sales);
    const totalRepSales = repList.reduce((s, r) => s + r.sales, 0);
    return { repList, totalRepSales };
  }, [orders]);

  // ── Chart configs ──────────────────────────────────────────────────────────
  const debtChartConfig: ChartConfig = {
    amount: { label: "قەرز", color: "hsl(var(--chart-1))" },
  };

  const repBarConfig: ChartConfig = {
    sales: { label: "فرۆشتن", color: "hsl(var(--chart-2))" },
  };

  const repPieConfig: ChartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    repData.repList.forEach((r, i) => {
      cfg[r.name] = { label: r.name, color: CHART_COLORS[i % CHART_COLORS.length] };
    });
    return cfg;
  }, [repData.repList]);

  // ── Get rep name by ID ─────────────────────────────────────────────────────
  const getRepName = (repId: string) => {
    const rep = reps.find(r => r.id === repId);
    return rep?.name || "—";
  };

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
            <p className="text-sm text-muted-foreground">بەدواداچوونی داهات، خەرجی، قەرز، و نوێنەرەکان</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={filtered as unknown as Record<string, unknown>[]} columns={transactionExportCols} filename="finance" title="دارایی" />
          <Button onClick={() => setModalOpen(true)}><Plus className="size-4 me-1" />مامەڵەی نوێ</Button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { title: "کۆی داهات",    value: formatIQD(totalIncome),         cls: "text-emerald-600",  icon: <TrendingUp className="size-4" /> },
          { title: "کۆی خەرجی",    value: formatIQD(totalExpense),        cls: "text-destructive",  icon: <TrendingDown className="size-4" /> },
          { title: "قازانجی تەوا",  value: formatIQD(netProfit),          cls: netProfit >= 0 ? "text-emerald-600" : "text-destructive", icon: <DollarSign className="size-4" /> },
          { title: "کۆی قەرز",     value: formatIQD(debtData.totalDebt), cls: "text-orange-500",   icon: <CreditCard className="size-4" /> },
          { title: "قەرزدارەکان",   value: String(debtData.debtorCount),  cls: "text-amber-600",    icon: <AlertTriangle className="size-4" /> },
        ].map((k, i) => (
          <Card key={i} className="card-interactive">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2 text-muted-foreground">{k.icon}<p className="text-xs">{k.title}</p></div>
              <p className={cn("text-xl font-black", k.cls)}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex bg-muted p-1 rounded-xl gap-1 mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <Button key={tab.key} variant={activeTab === tab.key ? "secondary" : "ghost"} size="sm"
            onClick={() => setActiveTab(tab.key)}
            className={cn("px-4 rounded-lg text-xs font-bold whitespace-nowrap",
              activeTab === tab.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
            {tab.label}
          </Button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          OVERVIEW TAB
      ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <>
          {/* Summary Gradient Cards */}
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

          {/* Quick Debt + Rep Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Top Debtors Chart */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold flex items-center gap-2"><CreditCard className="size-4 text-orange-500" />زۆرترین قەرزدارەکان</h3>
                  <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => setActiveTab("debts")}>هەمووی ببینە</Button>
                </div>
                {debtData.top10.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">هیچ قەرزێک نییە ✔️</div>
                ) : (
                  <ChartContainer config={debtChartConfig} className="h-[280px] w-full">
                    <BarChart data={debtData.top10} layout="vertical" margin={{ left: 8, right: 8, top: 0, bottom: 0 }}>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/50" />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <XAxis type="number" tickFormatter={shortNum} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatIQD(Number(value))} />} />
                      <Bar dataKey="amount" fill="var(--color-amount)" radius={[0, 6, 6, 0]} maxBarSize={28} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Rep Performance Chart */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold flex items-center gap-2"><UserCheck className="size-4 text-primary" />فرۆشتنی نوێنەرەکان</h3>
                  <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => setActiveTab("reps")}>هەمووی ببینە</Button>
                </div>
                {repData.repList.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">هیچ داتایەک نییە</div>
                ) : (
                  <ChartContainer config={repBarConfig} className="h-[280px] w-full">
                    <BarChart data={repData.repList.slice(0, 8)} margin={{ left: 8, right: 8, top: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis tickFormatter={shortNum} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatIQD(Number(value))} />} />
                      <Bar dataKey="sales" fill="var(--color-sales)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          DEBTS TAB
      ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "debts" && (
        <>
          {/* Debt summary */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3 opacity-90"><CreditCard className="size-5" /><span className="text-sm">کۆی قەرز</span></div>
              <p className="text-3xl font-black">{formatIQD(debtData.totalDebt)}</p>
              <p className="mt-2 text-xs opacity-80">{debtData.debtorCount} قەرزدار</p>
            </div>
            <div className="bg-gradient-to-br from-violet-500 to-purple-700 text-white rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3 opacity-90"><Users className="size-5" /><span className="text-sm">تێکڕای قەرز</span></div>
              <p className="text-3xl font-black">{debtData.debtorCount > 0 ? formatIQD(Math.round(debtData.totalDebt / debtData.debtorCount)) : "—"}</p>
              <p className="mt-2 text-xs opacity-80">بۆ هەر قەرزدارێک</p>
            </div>
          </div>

          {/* Debt bar chart */}
          {debtData.top10.length > 0 && (
            <Card className="mb-6">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <CreditCard className="size-4 text-orange-500" />١٠ قەرزدارە باڵاکان
                </h3>
                <ChartContainer config={debtChartConfig} className="h-[320px] w-full">
                  <BarChart data={debtData.top10} layout="vertical" margin={{ left: 12, right: 12, top: 0, bottom: 0 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/50" />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <XAxis type="number" tickFormatter={shortNum} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatIQD(Number(value))} />} />
                    <Bar dataKey="amount" fill="var(--color-amount)" radius={[0, 6, 6, 0]} maxBarSize={28}>
                      {debtData.top10.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Debt table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-right">#</TableHead>
                    <TableHead className="text-right">کڕیار</TableHead>
                    <TableHead className="text-right">شار</TableHead>
                    <TableHead className="text-right">نوێنەر</TableHead>
                    <TableHead className="text-right">قەرز</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debtData.debtors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <Empty className="py-16 border-0">
                          <EmptyHeader>
                            <EmptyMedia variant="icon"><CreditCard className="size-4" /></EmptyMedia>
                            <EmptyTitle>هیچ قەرزێک نییە</EmptyTitle>
                            <EmptyDescription>هەموو کڕیارەکان پارەیان داوە ✔️</EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      </TableCell>
                    </TableRow>
                  ) : debtData.debtors.map((c, i) => (
                    <TableRow key={c.name} className="hover:bg-muted/20 cursor-pointer transition-colors"
                      onClick={() => router.push("/dashboard/clients")}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="font-semibold">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{c.city || "—"}</TableCell>
                      <TableCell className="text-sm">{getRepName(c.repId)}</TableCell>
                      <TableCell className="font-bold text-orange-600">{formatIQD(c.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="px-4 py-2.5 border-t bg-muted/20 text-xs text-muted-foreground flex justify-between">
                <span>{debtData.debtorCount} قەرزدار</span>
                <span className="font-bold text-orange-600">کۆ: {formatIQD(debtData.totalDebt)}</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          REPS TAB
      ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "reps" && (
        <>
          {/* Rep summary */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-br from-indigo-500 to-blue-700 text-white rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3 opacity-90"><DollarSign className="size-5" /><span className="text-sm">کۆی فرۆشتن</span></div>
              <p className="text-3xl font-black">{formatIQD(repData.totalRepSales)}</p>
              <p className="mt-2 text-xs opacity-80">{repData.repList.length} نوێنەر</p>
            </div>
            <div className="bg-gradient-to-br from-cyan-500 to-teal-700 text-white rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3 opacity-90"><Users className="size-5" /><span className="text-sm">کۆی داواکاری</span></div>
              <p className="text-3xl font-black">{repData.repList.reduce((s, r) => s + r.count, 0)}</p>
              <p className="mt-2 text-xs opacity-80">لە {repData.repList.length} نوێنەر</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Sales bar chart */}
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" />فرۆشتن بۆ هەر نوێنەرێک
                </h3>
                {repData.repList.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">هیچ داتایەک نییە</div>
                ) : (
                  <ChartContainer config={repBarConfig} className="h-[320px] w-full">
                    <BarChart data={repData.repList} margin={{ left: 8, right: 8, top: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis tickFormatter={shortNum} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatIQD(Number(value))} />} />
                      <Bar dataKey="sales" fill="var(--color-sales)" radius={[6, 6, 0, 0]} maxBarSize={44}>
                        {repData.repList.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Order count pie chart */}
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <UserCheck className="size-4 text-violet-500" />پشکی داواکاری بۆ هەر نوێنەرێک
                </h3>
                {repData.repList.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">هیچ داتایەک نییە</div>
                ) : (
                  <ChartContainer config={repPieConfig} className="h-[320px] w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                      <Pie
                        data={repData.repList.map(r => ({ name: r.name, value: r.count, fill: repPieConfig[r.name]?.color }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={2}
                        strokeWidth={2}
                        stroke="hsl(var(--background))"
                      >
                        {repData.repList.map((r, i) => (
                          <Cell key={r.id} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                )}
                {/* Legend */}
                <div className="flex flex-wrap gap-2 mt-3 justify-center">
                  {repData.repList.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-1.5 text-xs">
                      <div className="size-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-muted-foreground">{r.name}</span>
                      <span className="font-bold">{r.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rep table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-right">#</TableHead>
                    <TableHead className="text-right">نوێنەر</TableHead>
                    <TableHead className="text-right">کۆی فرۆشتن</TableHead>
                    <TableHead className="text-right">ژمارەی داواکاری</TableHead>
                    <TableHead className="text-right">تێکڕای داواکاری</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repData.repList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <Empty className="py-16 border-0">
                          <EmptyHeader>
                            <EmptyMedia variant="icon"><UserCheck className="size-4" /></EmptyMedia>
                            <EmptyTitle>هیچ نوێنەرێک نییە</EmptyTitle>
                            <EmptyDescription>هیچ داواکارییەک تۆمار نەکراوە</EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      </TableCell>
                    </TableRow>
                  ) : repData.repList.map((r, i) => (
                    <TableRow key={r.id} className="hover:bg-muted/20 cursor-pointer transition-colors"
                      onClick={() => router.push("/dashboard/reps")}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}>
                            {r.name.charAt(0)}
                          </div>
                          {r.name}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-emerald-600">{formatIQD(r.sales)}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[11px]">{r.count} داواکاری</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{formatIQD(r.avg)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="px-4 py-2.5 border-t bg-muted/20 text-xs text-muted-foreground flex justify-between">
                <span>{repData.repList.length} نوێنەر</span>
                <span className="font-bold text-emerald-600">کۆ: {formatIQD(repData.totalRepSales)}</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TRANSACTIONS TAB
      ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "txns" && (
        <>
          {/* Filters */}
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

          {/* Data Table */}
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
                      <TableCell colSpan={5} className="p-0">
                        <Empty className="py-16 border-0">
                          <EmptyHeader>
                            <EmptyMedia variant="icon"><Wallet className="size-4" /></EmptyMedia>
                            <EmptyTitle>هیچ مامەڵەیەک نەدۆزرایەوە</EmptyTitle>
                            <EmptyDescription>مامەڵەی نوێ زیاد بکە یان فلتەرەکان بگۆڕە</EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      </TableCell>
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
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ADD TRANSACTION DIALOG
      ═══════════════════════════════════════════════════════════════════ */}
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
