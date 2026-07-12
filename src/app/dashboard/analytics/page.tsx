"use client";
import { useMemo } from "react";
import {
  BarChart3, TrendingUp, Users, Package, ShoppingCart,
  DollarSign, MapPin, Calendar, Activity,
} from "lucide-react";
import { useData } from "@/lib/store";
import { useLayout } from "@/app/dashboard/layout";
import { formatIQD } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ─── Dither-kit ────────────────────────────────────────────────────────────────
import { AreaChart, LineChart } from "@/components/dither-kit/area-chart";
import { BarChart } from "@/components/dither-kit/bar-chart";
import { PieChart } from "@/components/dither-kit/pie-chart";
import { RadarChart } from "@/components/dither-kit/radar-chart";
import { Area, Line } from "@/components/dither-kit/area";
import { Bar } from "@/components/dither-kit/bar";
import { Pie } from "@/components/dither-kit/pie";
import { Radar } from "@/components/dither-kit/radar";
import { XAxis } from "@/components/dither-kit/x-axis";
import { YAxis } from "@/components/dither-kit/y-axis";
import { Grid } from "@/components/dither-kit/grid";
import { Legend } from "@/components/dither-kit/legend";
import { Tooltip } from "@/components/dither-kit/tooltip";
import { Dot, ActiveDot } from "@/components/dither-kit/dot";
import type { DitherColor } from "@/components/dither-kit/palette";

// ─── Constants ─────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  WAITING:      "چاوەڕوان",
  IN_PROGRESS:  "لە پڕۆسەدا",
  NOT_ACCEPTED: "ڕەتکراوە",
  READY:        "ئامادەیە",
  SENT:         "نێردراوە",
  DELIVERED:    "گەیشتووە",
  PAID:         "پارەدراوە",
};

// Colors for pie slices — keyed by the Kurdish status label
const PIE_COLORS: DitherColor[] = ["green", "blue", "purple", "orange", "pink", "red", "grey"];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { orders, products, clients, reps, transactions } = useData();
  const { dateRange } = useLayout();

  const filteredOrders = useMemo(() => {
    if (!dateRange.from) return orders;
    return orders.filter(o => { const d = new Date(o.createdAt); return d >= dateRange.from! && d <= dateRange.to!; });
  }, [orders, dateRange]);

  const filteredTransactions = useMemo(() => {
    if (!dateRange.from) return transactions;
    return transactions.filter(t => { const d = new Date(t.createdAt); return d >= dateRange.from! && d <= dateRange.to!; });
  }, [transactions, dateRange]);

  const totalRevenue = filteredOrders.filter(o => o.status === "PAID").reduce((s, o) => s + o.totalAmount, 0);
  const totalIncome  = filteredTransactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

  // ── Area: weekly revenue ──────────────────────────────────────────────────────
  const revenueWeekly = useMemo(() => {
    const weeks: Record<string, { revenue: number; orders: number }> = {};
    for (let i = 7; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i * 7);
      weeks[`W${8 - i}`] = { revenue: 0, orders: 0 };
    }
    const keys = Object.keys(weeks);
    filteredOrders.forEach(o => {
      const diffWeeks = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / (7 * 24 * 3600 * 1000));
      if (diffWeeks >= 0 && diffWeeks < 8) {
        const key = keys[7 - diffWeeks];
        if (key) { weeks[key].orders++; if (o.status === "PAID") weeks[key].revenue += o.totalAmount; }
      }
    });
    return Object.entries(weeks).map(([week, v]) => ({ week, ...v }));
  }, [filteredOrders]);

  const areaConfig = { revenue: { label: "داهات", color: "blue" as DitherColor } };

  // ── Line: monthly income vs expense ──────────────────────────────────────────
  const financeMonthly = useMemo(() => {
    const months: Record<string, { income: number; expense: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      months[d.toLocaleDateString("en-US", { month: "short" })] = { income: 0, expense: 0 };
    }
    const keys = Object.keys(months);
    filteredTransactions.forEach(t => {
      const key = new Date(t.createdAt).toLocaleDateString("en-US", { month: "short" });
      if (months[key]) {
        if (t.type === "INCOME") months[key].income += t.amount;
        else months[key].expense += t.amount;
      }
    });
    return keys.map(k => ({ month: k, ...months[k] }));
  }, [filteredTransactions]);

  const lineConfig = {
    income:  { label: "داهات",  color: "green" as DitherColor },
    expense: { label: "خەرجی", color: "red"   as DitherColor },
  };

  // ── Bar: order status ─────────────────────────────────────────────────────────
  const statusStats = filteredOrders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1; return acc;
  }, {} as Record<string, number>);
  const statusBarData = Object.entries(statusStats)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({ status: STATUS_LABELS[status] || status, count }));
  const barConfig = { count: { label: "داواکاری", color: "purple" as DitherColor } };

  // ── Bar: city distribution ────────────────────────────────────────────────────
  const cityStats = clients.reduce((acc, c) => {
    acc[c.city] = (acc[c.city] || 0) + 1; return acc;
  }, {} as Record<string, number>);
  const cityBarData = Object.entries(cityStats).sort((a, b) => b[1] - a[1]).slice(0, 7)
    .map(([name, count]) => ({ name, count }));
  const cityBarConfig = { count: { label: "کڕیار", color: "orange" as DitherColor } };

  // ── Pie: order status ─────────────────────────────────────────────────────────
  // PieChart needs: data rows with nameKey + dataKey fields; config keyed by nameKey values
  const pieData = useMemo(() =>
    Object.entries(statusStats)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({ label: STATUS_LABELS[status] || status, count })),
    [statusStats]
  );
  const pieConfig = useMemo(() =>
    Object.fromEntries(
      pieData.map((row, i) => [row.label, { label: row.label, color: PIE_COLORS[i % PIE_COLORS.length] }])
    ),
    [pieData]
  );

  // ── Radar: rep performance ────────────────────────────────────────────────────
  // RadarChart: data rows = axes (one per metric), each column = a rep's value
  // nameKey = "axis" field, config keys = rep names (series)
  const topReps = useMemo(() =>
    reps.slice(0, 5).map(r => ({
      repName: r.name.split(" ")[0] ?? r.name,
      orders:    filteredOrders.filter(o => o.repId === r.id).length,
      paid:      filteredOrders.filter(o => o.repId === r.id && o.status === "PAID").length,
      delivered: filteredOrders.filter(o => o.repId === r.id && o.status === "DELIVERED").length,
      clients:   clients.filter(c => c.repId === r.id).length,
    })),
    [reps, filteredOrders, clients]
  );

  const RADAR_AXES = [
    { key: "orders",    label: "داواکاری" },
    { key: "paid",      label: "پارەدراو" },
    { key: "delivered", label: "گەیشتوو"  },
    { key: "clients",   label: "کڕیار"    },
  ];
  const RADAR_COLORS: DitherColor[] = ["blue", "purple", "green", "orange", "pink"];

  // Transpose: one row per axis, columns = each rep's value for that axis
  const radarData = useMemo(() =>
    RADAR_AXES.map(ax => {
      const row: Record<string, unknown> = { axis: ax.label };
      topReps.forEach(r => { row[r.repName] = r[ax.key as keyof typeof r]; });
      return row;
    }),
    [topReps]
  );
  const radarConfig = useMemo(() =>
    Object.fromEntries(
      topReps.map((r, i) => [r.repName, { label: r.repName, color: RADAR_COLORS[i % RADAR_COLORS.length] }])
    ),
    [topReps]
  );

  // ── Tables ────────────────────────────────────────────────────────────────────
  const productOrderCount = filteredOrders.flatMap(o => o.items).reduce((acc, i) => {
    acc[i.productName] = (acc[i.productName] || 0) + i.quantity; return acc;
  }, {} as Record<string, number>);
  const topProducts = Object.entries(productOrderCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topRepsTable = reps.map(r => ({
    name: r.name,
    orders: filteredOrders.filter(o => o.repId === r.id).length,
    revenue: filteredOrders.filter(o => o.repId === r.id && o.status === "PAID").reduce((s, o) => s + o.totalAmount, 0),
  })).sort((a, b) => b.revenue - a.revenue);

  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">شیکاری و ڕاپۆرتەکان</h1>
            <p className="text-sm text-muted-foreground">شیکاری گشتی ئەدای سیستەم</p>
          </div>
        </div>
        {dateRange.from && (
          <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs font-semibold">
            <Calendar className="size-3" /> {dateRange.label}
          </Badge>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { title: "کۆی داهات", value: formatIQD(totalRevenue), icon: <DollarSign className="size-4" />, cls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
          { title: "داواکاری",  value: filteredOrders.length,    icon: <ShoppingCart className="size-4" />, cls: "text-primary bg-primary/10" },
          { title: "بەرهەم",   value: products.length,           icon: <Package className="size-4" />,      cls: "text-violet-600 bg-violet-50 dark:bg-violet-950/40" },
          { title: "کڕیار",    value: clients.length,            icon: <Users className="size-4" />,        cls: "text-orange-500 bg-orange-50 dark:bg-orange-950/40" },
        ].map((k, i) => (
          <Card key={i} className="card-interactive">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0", k.cls)}>{k.icon}</div>
              <div>
                <p className="text-xl font-black">{k.value}</p>
                <p className="text-xs text-muted-foreground font-medium">{k.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Area Chart: Weekly Revenue ── */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <TrendingUp className="size-4 text-blue-500" />
            داهاتی هەفتانە — ٨ هەفتەی ڕابردوو
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            {revenueWeekly.every(d => d.revenue === 0)
              ? <p className="text-sm text-muted-foreground text-center py-16">هیچ داتایەک نییە</p>
              : <AreaChart
                  data={revenueWeekly}
                  config={areaConfig}
                  bloom="aura"
                  bloomOnHover
                  animate
                  className="h-full"
                >
                  <Grid />
                  <XAxis dataKey="week" maxTicks={8} />
                  <YAxis />
                  <Legend />
                  <Tooltip labelKey="week" valueFormatter={(v) => formatIQD(v)} />
                  <Area dataKey="revenue" variant="gradient" isClickable>
                    <ActiveDot variant="colored-border" />
                  </Area>
                </AreaChart>
            }
          </div>
        </CardContent>
      </Card>

      {/* ── Line Chart: Income vs Expense ── */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Activity className="size-4 text-green-500" />
            داهات دەبەرامبەر خەرجی — ٦ مانگی ڕابردوو
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            {financeMonthly.every(d => d.income === 0 && d.expense === 0)
              ? <p className="text-sm text-muted-foreground text-center py-16">هیچ داتایەک نییە</p>
              : <LineChart
                  data={financeMonthly}
                  config={lineConfig}
                  bloom="aura"
                  animate
                  className="h-full"
                >
                  <Grid />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Legend isClickable />
                  <Tooltip labelKey="month" valueFormatter={(v) => formatIQD(v)} />
                  <Line dataKey="income" strokeVariant="solid">
                    <Dot variant="border" r={2} />
                    <ActiveDot variant="colored-border" r={3} />
                  </Line>
                  <Line dataKey="expense" strokeVariant="dashed">
                    <Dot variant="border" r={2} />
                    <ActiveDot variant="colored-border" r={3} />
                  </Line>
                </LineChart>
            }
          </div>
        </CardContent>
      </Card>

      {/* ── Row: Bar Charts ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Order Status Bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="size-4 text-violet-500" />
              بارودۆخی داواکارییەکان
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-44">
              {statusBarData.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-12">هیچ داتایەک نییە</p>
                : <BarChart
                    data={statusBarData}
                    config={barConfig}
                    animate
                    bloom="aura"
                    bloomOnHover
                    margins={{ left: 56, right: 8, top: 8, bottom: 22 }}
                    className="h-full"
                  >
                    <Grid horizontal vertical={false} />
                    <XAxis dataKey="status" maxTicks={8} />
                    <YAxis />
                    <Tooltip labelKey="status" />
                    <Bar dataKey="count" variant="solid" />
                  </BarChart>
              }
            </div>
          </CardContent>
        </Card>

        {/* City Distribution Bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <MapPin className="size-4 text-orange-500" />
              دابەشبوونی کڕیاران بە شار
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-44">
              {cityBarData.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-12">هیچ داتایەک نییە</p>
                : <BarChart
                    data={cityBarData}
                    config={cityBarConfig}
                    animate
                    bloom="aura"
                    bloomOnHover
                    margins={{ left: 60, right: 8, top: 8, bottom: 22 }}
                    className="h-full"
                  >
                    <Grid horizontal vertical={false} />
                    <XAxis dataKey="name" maxTicks={7} />
                    <YAxis />
                    <Tooltip labelKey="name" />
                    <Bar dataKey="count" variant="hatched" />
                  </BarChart>
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row: Dither Pie + Dither Radar ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Pie: Order Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="size-4 text-pink-500" />
              پای چارتی بارودۆخ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              {pieData.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-16">هیچ داتایەک نییە</p>
                : <PieChart
                    data={pieData}
                    config={pieConfig}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={0.45}
                    bloom="aura"
                    bloomOnHover
                    animate
                    className="h-full"
                  >
                    <Pie variant="gradient" />
                    <Legend isClickable align="center" />
                    <Tooltip />
                  </PieChart>
              }
            </div>
          </CardContent>
        </Card>

        {/* Radar: Rep performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Activity className="size-4 text-purple-500" />
              ئەدای نوێنەران — ڕادار
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              {topReps.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-16">هیچ داتایەک نییە</p>
                : <RadarChart
                    data={radarData}
                    config={radarConfig}
                    nameKey="axis"
                    bloom="aura"
                    bloomOnHover
                    animate
                    className="h-full"
                  >
                    {topReps.map(r => (
                      <Radar key={r.repName} dataKey={r.repName} variant="gradient" />
                    ))}
                    <Legend isClickable align="center" />
                    <Tooltip />
                  </RadarChart>
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Revenue summary cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {[
          { label: "کۆی داهات",   value: totalIncome,               cls: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20", icon: <TrendingUp className="size-5 text-emerald-500" /> },
          { label: "کۆی خەرجی",   value: totalExpense,              cls: "from-red-500/20 to-red-600/5 border-red-500/20",             icon: <Activity className="size-5 text-red-500" /> },
          { label: "قازانجی تەوا", value: totalIncome - totalExpense, cls: "from-primary/20 to-primary/5 border-primary/20",            icon: <DollarSign className="size-5 text-primary" /> },
        ].map(item => (
          <div key={item.label} className={cn("rounded-xl border bg-gradient-to-br p-4 flex items-center gap-3", item.cls)}>
            <div className="size-10 rounded-xl bg-background/60 flex items-center justify-center shrink-0 border border-border/40 shadow-sm">{item.icon}</div>
            <div>
              <p className="text-lg font-black">{formatIQD(item.value)}</p>
              <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tables ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Package className="size-4 text-primary" /> پەرفرۆشترین بەرهەمەکان
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>بەرهەم</TableHead>
                  <TableHead className="text-end">بڕ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.length === 0
                  ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">هیچ داتایەک نییە</TableCell></TableRow>
                  : topProducts.map(([name, qty], i) => (
                    <TableRow key={name}>
                      <TableCell>
                        <span className={cn("size-5 rounded-full flex items-center justify-center text-[9px] font-black",
                          i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-400 text-white" : i === 2 ? "bg-orange-700 text-white" : "bg-muted text-muted-foreground")}>
                          {i + 1}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold text-sm">{name}</TableCell>
                      <TableCell className="text-end"><Badge variant="secondary" className="font-bold text-primary">{qty.toLocaleString()}</Badge></TableCell>
                    </TableRow>
                  ))
                }
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="size-4 text-primary" /> ئەدای نوێنەران
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>نوێنەر</TableHead>
                  <TableHead className="text-center">داواکاری</TableHead>
                  <TableHead className="text-end">داهات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topRepsTable.length === 0
                  ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">هیچ داتایەک نییە</TableCell></TableRow>
                  : topRepsTable.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-semibold">{r.name}</TableCell>
                      <TableCell className="text-center"><Badge variant={r.orders > 0 ? "default" : "outline"}>{r.orders}</Badge></TableCell>
                      <TableCell className="text-end font-bold text-emerald-600">{formatIQD(r.revenue)}</TableCell>
                    </TableRow>
                  ))
                }
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
