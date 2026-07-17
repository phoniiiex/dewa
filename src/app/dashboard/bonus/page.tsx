"use client";
import { Gift, Warehouse as WarehouseIcon, UserCheck, Package, Tag } from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function BonusPage() {
  const { orders, warehouses, reps } = useData();

  const bonusOrders = orders.filter(o => o.items.some(i => i.bonusQty > 0));

  const warehouseStats = warehouses.map(w => {
    const wo = orders.filter(o => o.clientId === w.id);
    const totalBonusUnits = wo.reduce((s, o) => s + o.items.reduce((a, i) => a + i.bonusQty, 0), 0);
    const totalBonusValue = wo.reduce((s, o) => s + o.items.reduce((a, i) => a + i.bonusQty * i.unitPrice, 0), 0);
    return { ...w, orders: wo.length, totalBonusUnits, totalBonusValue };
  });

  const repStats = reps.map(r => {
    const ro = orders.filter(o => o.repId === r.id);
    const totalBonusUnits = ro.reduce((s, o) => s + o.items.reduce((a, i) => a + i.bonusQty, 0), 0);
    const totalBonusValue = ro.reduce((s, o) => s + o.items.reduce((a, i) => a + i.bonusQty * i.unitPrice, 0), 0);
    return { ...r, orders: ro.length, totalBonusUnits, totalBonusValue };
  });

  const allBonusRows = bonusOrders.flatMap(o =>
    o.items
      .filter(i => i.bonusQty > 0)
      .map(i => ({
        orderNumber: o.orderNumber,
        clientName: o.clientName,
        repName: o.repName,
        warehouseName: o.pharmacyName ?? null,
        productName: i.productName,
        quantity: i.quantity,
        bonusPct: i.bonusPct ?? 0,
        bonusQty: i.bonusQty,
        unitPrice: i.unitPrice,
      }))
  );

  const totalBonusUnits = orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.bonusQty, 0), 0);
  const totalBonusValue = orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.bonusQty * i.unitPrice, 0), 0);


  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 bg-gradient-to-br from-violet-600 to-primary rounded-xl flex items-center justify-center text-white">
          <Gift className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">سیستەمی بۆنەس</h1>
          <p className="text-sm text-muted-foreground">شیکاری بۆنەسی کۆگاکان — بە دانە و ڕێژە</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { title: "داواکاری بە بۆنەس", value: String(bonusOrders.length),          cls: "text-foreground" },
          { title: "کۆی دانەی بۆنەس",  value: totalBonusUnits + " دانە",            cls: "text-violet-600" },
          { title: "نرخی بۆنەسی کۆ",   value: formatIQD(totalBonusValue),           cls: "text-primary" },
          { title: "ڕیزی بۆنەس",        value: String(allBonusRows.length) + " ڕیز", cls: "text-foreground" },
        ].map(k => (
          <Card key={k.title}>
            <CardContent className="p-4">
              <p className={cn("text-xl font-black", k.cls)}>{k.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* How Bonus Works */}
      <div className="bg-gradient-to-br from-slate-900 to-violet-950 text-white rounded-2xl p-6 mb-6">
        <h3 className="text-base font-bold mb-4">چۆنیەتی کارکردنی سیستەمی بۆنەس</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: "١", title: "بۆنەسی بنەڕەتی کۆگا",     color: "text-amber-400", desc: "هەر کۆگایەک ڕێژەیەکی بنەڕەت هەیە (بۆ نموونە: ٢٠٪) بۆ هەموو بەرهەمەکان" },
            { step: "٢", title: "یاسای تایبەت بە بەرهەم",  color: "text-violet-300", desc: "هەر بەرهەمێک دەتوانێت ڕێژەی بۆنەسی تایبەتی خۆی هەبێت (بۆ نموونە: پاراسیتامۆڵ ٣٠٪)" },
            { step: "٣", title: "دانەی بۆنەس",              color: "text-emerald-400", desc: "بڕ × ڕێژەی بۆنەس = دانەی بۆنەسی دەنێردرێت (بۆ نموونە: ١٠ × ٢٠٪ = ٢ دانە بۆنەس)" },
          ].map(item => (
            <div key={item.step} className="p-4 bg-white/10 rounded-xl">
              <p className={cn("text-sm font-bold mb-2", item.color)}>{item.step}. {item.title}</p>
              <p className="text-xs text-white/75 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Warehouse Bonus Table */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <WarehouseIcon className="size-4 text-violet-600" /> بۆنەسی کۆگاکان
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
              <TableHeader>
                <TableRow>
                  {["کۆگا","شار","ڕێژەی بنەڕەت","یاسای تایبەت","داواکاری","کۆی دانەی بۆنەس","نرخی بۆنەسی کۆ"].map(h =>
                    <TableHead key={h}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouseStats.map(w => (
                  <TableRow key={w.id}>
                    <TableCell className="font-semibold">{w.name}</TableCell>
                    <TableCell className="text-muted-foreground">{w.city}</TableCell>
                    <TableCell>
                      <span className="px-3 py-1 rounded-lg bg-gradient-to-r from-violet-600 to-primary text-white font-bold text-sm">{w.bonusPct}٪</span>
                    </TableCell>
                    <TableCell>
                      {(w.bonusRules || []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {w.bonusRules.map((r, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] text-violet-700 border-violet-300 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-300">
                              <Tag className="size-2 me-0.5" />{r.productName}: {r.percent}٪
                            </Badge>
                          ))}
                        </div>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="font-semibold">{w.orders}</TableCell>
                    <TableCell className="font-bold text-emerald-600">{w.totalBonusUnits} دانە</TableCell>
                    <TableCell className="font-bold text-violet-600">{formatIQD(w.totalBonusValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Rep Bonus Table */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="size-4 text-emerald-600" /> بۆنەسی نوێنەران
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {["نوێنەر","شار","داواکاری","کۆی دانەی بۆنەس","نرخی بۆنەسی کۆ"].map(h => <TableHead key={h}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {repStats.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-semibold">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.city}</TableCell>
                    <TableCell className="font-semibold">{r.orders}</TableCell>
                    <TableCell className="font-bold text-emerald-600">{r.totalBonusUnits} دانە</TableCell>
                    <TableCell className="font-bold text-emerald-600">{formatIQD(r.totalBonusValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Per-product bonus detail */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="size-4 text-amber-500" />
            شیکاری بۆنەس بەرهەم بەرهەم
            <span className="text-xs font-normal text-muted-foreground">— چەند دانە دەنێردرێت هەر داواکارییەک</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {["ژمارەی داواکاری","کڕیار","نوێنەر","کۆگا","بەرهەم","بڕی داواکراو","ڕێژەی بۆنەس","دانەی بۆنەس دەنێردرێت"].map(h =>
                    <TableHead key={h}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allBonusRows.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">هیچ بۆنەسێک تۆمار نەکراوە</TableCell></TableRow>
                ) : allBonusRows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono font-bold">{row.orderNumber}</TableCell>
                    <TableCell>{row.clientName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.repName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.warehouseName || "—"}</TableCell>
                    <TableCell className="font-semibold">{row.productName}</TableCell>
                    <TableCell className="text-center font-semibold">{row.quantity}</TableCell>
                    <TableCell className="text-center">
                      <span className="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-violet-600 to-primary text-white font-bold text-xs">{row.bonusPct}٪</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="px-3.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-black text-base">+{row.bonusQty}</span>
                      <span className="text-[11px] text-muted-foreground me-1"> دانە</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
