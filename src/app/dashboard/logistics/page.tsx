"use client";
import { useState } from "react";
import { Truck, Search, Eye, CheckCircle, Upload } from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import type { Order, OrderStatus } from "@/lib/types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

type ActiveStatus = "SENT" | "DELIVERED";

const STATUS_META: Partial<Record<OrderStatus, { label: string; cls: string; icon: React.ReactNode }>> = {
  SENT:      { label: "نێردراوە",  cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", icon: <Truck className="size-3" /> },
  DELIVERED: { label: "گەیشتووە", cls: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",     icon: <CheckCircle className="size-3" /> },
};

const TABS: { key: ActiveStatus | "all"; label: string }[] = [
  { key: "all",       label: "هەموو" },
  { key: "SENT",      label: "لە ڕێگادا" },
  { key: "DELIVERED", label: "گەیشتووە" },
];

export default function LogisticsPage() {
  const { orders, updateOrder, showToast } = useData();

  const [tab, setTab] = useState<"all" | ActiveStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const inFlight = orders.filter(o => o.status === "SENT" || o.status === "DELIVERED");
  const filtered = inFlight.filter(o => {
    const matchTab = tab === "all" || o.status === tab;
    const matchSearch = o.orderNumber.includes(searchTerm) || o.clientName.includes(searchTerm) || (o.driverName || "").includes(searchTerm);
    return matchTab && matchSearch;
  });

  const kpi = {
    sent:      inFlight.filter(o => o.status === "SENT").length,
    delivered: inFlight.filter(o => o.status === "DELIVERED").length,
    drivers:   new Set(inFlight.filter(o => o.driverId).map(o => o.driverId)).size,
    value:     inFlight.filter(o => o.status === "SENT").reduce((s, o) => s + o.totalAmount, 0),
  };

  const confirmDelivered = async () => {
    if (!detailOrder) return;
    setUploading(true);
    let invoiceUrl = "";
    if (invoiceFile) {
      const { supabase } = await import("@/lib/supabase");
      const { data, error } = await supabase.storage
        .from("order-docs")
        .upload(`invoices/${detailOrder.id}_${Date.now()}`, invoiceFile, { upsert: true });
      if (error) { showToast("هەڵە لە بارکردن: " + error.message, "error"); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from("order-docs").getPublicUrl(data.path);
      invoiceUrl = urlData.publicUrl;
    }
    await updateOrder(detailOrder.id, {
      status: "DELIVERED",
      deliveredAt: new Date().toISOString(),
      signedInvoiceUrl: invoiceUrl,
    });
    showToast("گەیشتووە — تۆمارکرا ✓");
    setUploading(false);
    setDetailOrder(null);
    setInvoiceFile(null);
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 bg-violet-50 dark:bg-violet-950/40 rounded-xl flex items-center justify-center text-violet-600">
          <Truck className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">لۆجستیک</h1>
          <p className="text-sm text-muted-foreground">شوفێرەکان و داواکارییەکانی لە ڕێگادا</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "لە ڕێگادا",      value: kpi.sent,              cls: "text-violet-600" },
          { label: "گەیشتووە",       value: kpi.delivered,          cls: "text-cyan-600" },
          { label: "شوفێری چالاک",   value: kpi.drivers,            cls: "text-emerald-600" },
          { label: "نرخی لە ڕێگادا", value: formatIQD(kpi.value),   cls: "text-amber-600" },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className={cn("text-xl font-black", k.cls)}>{k.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs + Search */}
      <Card className="mb-5">
        <CardContent className="p-3 flex gap-3 items-center flex-wrap">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              {TABS.map(t => (
                <TabsTrigger key={t.key} value={t.key} className="px-3.5">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative flex-1 min-w-48">
            <Search className="size-3.5 absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="گەڕان بە کڕیار، ژمارە، یان شوفێر..." className="pe-9" />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {["ژمارە", "کڕیار", "شوفێر", "تەلەفۆن", "بارودۆخ", "نرخ", "کردار"].map(h => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">هیچ داواکارییەک نەدۆزرایەوە</TableCell></TableRow>
                ) : filtered.map(o => {
                  const meta = STATUS_META[o.status as ActiveStatus];
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-bold text-primary">{o.orderNumber}</TableCell>
                      <TableCell>
                        <p className="font-semibold">{o.clientName}</p>
                        <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("ku")}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="size-7 bg-violet-100 dark:bg-violet-900/40 rounded-full flex items-center justify-center text-violet-700 font-bold text-xs shrink-0">
                            {(o.driverName || "?").charAt(0)}
                          </div>
                          <span className="font-semibold">{o.driverName || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{o.driverPhone || "—"}</TableCell>
                      <TableCell>
                        {meta && (
                          <Badge className={cn("gap-1 text-[11px]", meta.cls)}>
                            {meta.icon} {meta.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">{formatIQD(o.totalAmount)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"
                          onClick={() => { setDetailOrder(o); setInvoiceFile(null); }}>
                          <Eye className="size-3" /> بینین
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail modal */}
      {detailOrder && (
        <Dialog open={true} onOpenChange={open => !open && setDetailOrder(null)}>
          <DialogContent className="sm:max-w-[580px] max-h-[85vh] overflow-y-auto" dir="rtl">
            <DialogHeader><DialogTitle>{detailOrder.orderNumber} — وردەکاری</DialogTitle><DialogDescription>زانیاری داواکاری</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-3.5">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "کڕیار",   value: detailOrder.clientName },
                { label: "نوێنەر", value: detailOrder.repName },
                { label: "شوفێر",  value: detailOrder.driverName || "—" },
                { label: "تەلەفۆن", value: detailOrder.driverPhone || "—" },
                { label: "نرخ",    value: formatIQD(detailOrder.totalAmount) },
                { label: "بارودۆخ", value: STATUS_META[detailOrder.status as ActiveStatus]?.label || detailOrder.status },
              ].map(f => (
                <div key={f.label} className="px-3.5 py-2.5 bg-muted/50 rounded-xl border border-border">
                  <p className="text-[11px] text-muted-foreground mb-0.5">{f.label}</p>
                  <p className="font-semibold text-sm">{f.value}</p>
                </div>
              ))}
            </div>

            {/* Items */}
            <div className="border border-border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {["بەرهەم", "ژمارە", "بۆنەس", "نرخ"].map(h => <TableHead key={h}>{h}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailOrder.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell className="text-emerald-600 font-semibold">{item.bonusQty > 0 ? `+${item.bonusQty}` : "—"}</TableCell>
                      <TableCell>{formatIQD(item.unitPrice)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {detailOrder.signedInvoiceUrl && (
              <a href={detailOrder.signedInvoiceUrl} target="_blank" rel="noopener noreferrer"
                className="text-primary text-sm font-semibold hover:underline">📄 پسوولەی واژووکراو</a>
            )}

            {detailOrder.status === "SENT" && (
              <div className="pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground mb-3">پسوولەی واژووکراو بارکە تا گەیشتووە تۆمار بکرێت.</p>
                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors mb-3"
                  onClick={() => document.getElementById("log-inv-file")?.click()}>
                  <Upload className="size-5 text-muted-foreground mx-auto mb-1.5" />
                  <p className="text-xs text-muted-foreground">{invoiceFile ? invoiceFile.name : "هەڵبژاردنی فایل (ئەگەر هەبوو)"}</p>
                  <input id="log-inv-file" type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setInvoiceFile(e.target.files?.[0] || null)} />
                </div>
                <Button className="w-full gap-2 bg-cyan-600 hover:bg-cyan-700" onClick={confirmDelivered} disabled={uploading}>
                  {uploading ? "بارکردن..." : "✓ گەیشتووە — تۆمارکردن"}
                </Button>
              </div>
            )}
          </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
