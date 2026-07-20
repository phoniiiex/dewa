"use client";
import { useState, FormEvent, useRef } from "react";
import {
  FlaskConical, Plus, Eye, Trash2, X, Printer, CheckCircle, XCircle,
  Clock, Send, Package, User, ChevronDown,
} from "lucide-react";
import { useData } from "@/lib/store";
import { useLayout } from "@/app/dashboard/layout";
import type { SampleRequest, SampleStatus } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";

const statusConfig: Record<SampleStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  PENDING:  { label: "چاوەڕوان",   cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",   icon: <Clock className="size-3" /> },
  ACCEPTED: { label: "پەسەندکرا", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",     icon: <CheckCircle className="size-3" /> },
  SENT:     { label: "نێردرا",    cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", icon: <Send className="size-3" /> },
  ARRIVED:  { label: "گەیشت",    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: <Package className="size-3" /> },
  DECLINED: { label: "ڕەتکرایەوە", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",        icon: <XCircle className="size-3" /> },
};

const statusFlow: SampleStatus[] = ["PENDING", "ACCEPTED", "SENT", "ARRIVED"];

function SampleReceipt({ sr }: { sr: SampleRequest }) {
  return (
    <div style={{ fontFamily: "inherit", padding: 32, maxWidth: 600, margin: "0 auto", direction: "rtl" }}>
      <div style={{ textAlign: "center", marginBottom: 24, borderBottom: "2px solid #1A1A2E", paddingBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1A1A2E" }}>داواکاری نموونە</div>
        <div style={{ fontSize: 13, color: "#6C757D", marginTop: 4 }}>Sample Request Receipt</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#7C5CFC", marginTop: 8 }}>{sr.requestNumber}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20, fontSize: 13 }}>
        <div><span style={{ color: "#ADB5BD" }}>نوێنەر: </span><strong>{sr.repName}</strong></div>
        <div><span style={{ color: "#ADB5BD" }}>بارودۆخ: </span><strong>{statusConfig[sr.status].label}</strong></div>
        {sr.doctorName && <div><span style={{ color: "#ADB5BD" }}>دکتۆر: </span><strong>{sr.doctorName}</strong></div>}
        <div><span style={{ color: "#ADB5BD" }}>بەروار: </span><strong>{new Date(sr.createdAt).toLocaleDateString("ar-IQ")}</strong></div>
        {sr.sentAt && <div><span style={{ color: "#ADB5BD" }}>نێردراو لە: </span><strong>{sr.sentAt}</strong></div>}
        {sr.arrivedAt && <div><span style={{ color: "#ADB5BD" }}>گەیشتووە لە: </span><strong>{sr.arrivedAt}</strong></div>}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
        <thead>
          <tr style={{ background: "#1A1A2E", color: "white" }}>
            <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>بەرهەم</th>
            <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>بڕ</th>
          </tr>
        </thead>
        <tbody>
          {sr.items.map((item, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #E9ECEF", background: i % 2 === 0 ? "white" : "#F8F9FA" }}>
              <td style={{ padding: "8px 12px", fontWeight: 600 }}>{item.productName}</td>
              <td style={{ padding: "8px 12px", textAlign: "center" }}>{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sr.note && (
        <div style={{ padding: 12, background: "#F8F9FA", borderRadius: 8, fontSize: 12, color: "#6C757D", borderRight: "3px solid #7C5CFC" }}>
          <strong>تێبینی:</strong> {sr.note}
        </div>
      )}
      <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#ADB5BD", borderTop: "1px dashed #DEE2E6", paddingTop: 12 }}>
        <span>دەوا فارما</span><span>{sr.requestNumber}</span><span>{new Date().toLocaleDateString("ar-IQ")}</span>
      </div>
    </div>
  );
}

export default function SamplesPage() {
  const { sampleRequests, products, reps, addSampleRequest, updateSampleRequest, deleteSampleRequest, loading } = useData();
  const { currentUser } = useLayout();
  const isRep = currentUser?.role === "REP";
  const myRep = isRep ? reps.find(r => r.name === currentUser?.name) : undefined;

  const [modalOpen, setModalOpen] = useState(false);
  const [detailSr, setDetailSr] = useState<SampleRequest | null>(null);
  const [printSr, setPrintSr] = useState<SampleRequest | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | SampleStatus>("ALL");
  const printRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({ doctorName: "", note: "" });
  const [items, setItems] = useState<{ productId: string; quantity: string }[]>([{ productId: "", quantity: "" }]);

  const resetForm = () => { setForm({ doctorName: "", note: "" }); setItems([{ productId: "", quantity: "" }]); };
  const addItemRow = () => setItems([...items, { productId: "", quantity: "" }]);
  const removeItemRow = (i: number) => setItems(items.filter((_, j) => j !== i));
  const updateItem = (i: number, field: string, value: string) =>
    setItems(items.map((it, j) => j === i ? { ...it, [field]: value } : it));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(it => it.productId && it.quantity);
    if (validItems.length === 0) return;
    const srItems = validItems.map(it => {
      const prod = products.find(p => p.id === it.productId);
      return { productId: it.productId, productName: prod?.name || "", quantity: Number(it.quantity) };
    });
    const repRecord = isRep ? myRep : undefined;
    await addSampleRequest({
      repId: repRecord?.id || currentUser?.id || "",
      repName: repRecord?.name || currentUser?.name || "",
      items: srItems, doctorName: form.doctorName, status: "PENDING",
      note: form.note, sentAt: "", arrivedAt: "", declinedReason: "",
    });
    resetForm(); setModalOpen(false);
  };

  const advance = (sr: SampleRequest) => {
    const idx = statusFlow.indexOf(sr.status);
    if (idx < 0 || idx >= statusFlow.length - 1) return;
    const next = statusFlow[idx + 1];
    const now = new Date().toLocaleDateString("ar-IQ");
    const extra: Partial<SampleRequest> = { status: next };
    if (next === "SENT") extra.sentAt = now;
    if (next === "ARRIVED") extra.arrivedAt = now;
    updateSampleRequest(sr.id, extra);
  };

  const decline = (id: string) => {
    updateSampleRequest(id, { status: "DECLINED", declinedReason: declineReason });
    setDeclineId(null); setDeclineReason("");
  };

  const handlePrint = (sr: SampleRequest) => {
    setPrintSr(sr);
    setTimeout(() => {
      if (printRef.current) {
        const w = window.open("", "_blank", "width=700,height=900");
        if (w) {
          w.document.write(`<html><head><title>${sr.requestNumber}</title><style>body{direction:rtl;font-family:system-ui,sans-serif;margin:0;padding:0}*{box-sizing:border-box}</style></head><body>`);
          w.document.write(printRef.current.innerHTML);
          w.document.write("</body></html>");
          w.document.close(); w.focus();
          setTimeout(() => { w.print(); w.close(); }, 300);
        }
      }
    }, 100);
  };

  const filtered = sampleRequests.filter(sr => {
    if (isRep && sr.repName !== (myRep?.name || currentUser?.name)) return false;
    if (statusFilter !== "ALL" && sr.status !== statusFilter) return false;
    return true;
  });

  const pendingCount = sampleRequests.filter(s => s.status === "PENDING").length;

  return (
    <div className="page-stagger">
      {/* ── Page Header ── */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <FlaskConical className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">نموونەکان</h1>
            <p className="text-sm text-muted-foreground">داواکاری نموونە و شوێنکەوتنی بارودۆخ</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setModalOpen(true); }}><Plus className="size-4 me-1" />داواکاری نموونە</Button>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-6 w-12 mb-2" /><Skeleton className="h-3 w-20" /></CardContent></Card>
        )) : [
          { title: "کۆی داواکاری", value: String(sampleRequests.length), cls: "text-primary" },
          { title: "چاوەڕوان", value: String(pendingCount), cls: "text-amber-600" },
          { title: "نێردراو", value: String(sampleRequests.filter(s => s.status === "SENT").length), cls: "text-violet-600" },
          { title: "گەیشتووە", value: String(sampleRequests.filter(s => s.status === "ARRIVED").length), cls: "text-emerald-600" },
        ].map((k, i) => (
          <Card key={i} className="card-interactive"><CardContent className="p-4">
            <p className={cn("text-xl font-black", k.cls)}>{k.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{k.title}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* ── Status Filter ── */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)} className="mb-5 w-fit">
        <TabsList className="flex-wrap h-auto">
          {(["ALL", ...statusFlow, "DECLINED"] as ("ALL" | SampleStatus)[]).map(s => (
            <TabsTrigger key={s} value={s} className="px-3.5">
              {s === "ALL" ? "هەموو" : statusConfig[s as SampleStatus].label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* ── Data Table ── */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-right">ژمارە</TableHead>
                {!isRep && <TableHead className="text-right">نوێنەر</TableHead>}
                <TableHead className="text-right">بەرهەمەکان</TableHead>
                <TableHead className="text-right">دکتۆر</TableHead>
                <TableHead className="text-right">بارودۆخ</TableHead>
                <TableHead className="text-right">بەروار</TableHead>
                <TableHead className="w-[180px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: isRep ? 6 : 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isRep ? 6 : 7} className="p-0">
                    <Empty className="py-16 border-0">
                      <EmptyHeader>
                        <EmptyMedia variant="icon"><FlaskConical className="size-4" /></EmptyMedia>
                        <EmptyTitle>هیچ داواکارییەک نەدۆزرایەوە</EmptyTitle>
                        <EmptyDescription>داواکاریی نموونە زیاد بکە یان فلتەرەکان بگۆڕە</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              ) : filtered.map(sr => {
                const cfg = statusConfig[sr.status];
                const nextIdx = statusFlow.indexOf(sr.status);
                const canAdvance = !isRep && nextIdx >= 0 && nextIdx < statusFlow.length - 1;
                const canDecline = !isRep && (sr.status === "PENDING" || sr.status === "ACCEPTED");
                return (
                  <TableRow key={sr.id}>
                    <TableCell className="font-bold font-mono text-primary">{sr.requestNumber}</TableCell>
                    {!isRep && <TableCell className="font-semibold"><span className="flex items-center gap-1.5"><User className="size-3 text-muted-foreground" />{sr.repName}</span></TableCell>}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {sr.items.map((it, i) => (
                          <span key={i} className="px-2 py-0.5 bg-primary/5 rounded text-[11px] text-primary font-semibold">
                            {it.productName} ×{it.quantity}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{sr.doctorName || "—"}</TableCell>
                    <TableCell><Badge className={cn("gap-1 text-[11px]", cfg.cls)}>{cfg.icon} {cfg.label}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(sr.createdAt).toLocaleDateString("ar-IQ")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 items-center flex-wrap">
                        <Button variant="ghost" size="icon" className="size-7 text-primary" onClick={() => setDetailSr(sr)}><Eye className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="size-7 text-emerald-600" onClick={() => handlePrint(sr)}><Printer className="size-3.5" /></Button>
                        {canAdvance && (
                          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-0.5 px-2 border-blue-300 text-primary hover:bg-primary/5"
                            onClick={() => advance(sr)}>
                            <ChevronDown className="size-2.5" /> {statusConfig[statusFlow[nextIdx + 1]].label}
                          </Button>
                        )}
                        {canDecline && (
                          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 border-red-300 text-destructive hover:bg-destructive/5"
                            onClick={() => { setDeclineId(sr.id); setDeclineReason(""); }}>ڕەت</Button>
                        )}
                        {!isRep && (
                          <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => setDeleteId(sr.id)}><Trash2 className="size-3.5" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="px-4 py-2.5 border-t bg-muted/20 text-xs text-muted-foreground">{filtered.length} داواکاری</div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════
          NEW REQUEST DIALOG
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>داواکاری نموونەی نوێ</DialogTitle>
            <DialogDescription>بەرهەمەکان و زانیاری داواکاری پڕبکەوە</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {isRep && (
                <div className="space-y-2">
                  <Label>نوێنەر</Label>
                  <div className="px-3 py-2 rounded-lg bg-primary/5 text-primary font-bold text-sm flex items-center gap-1.5">
                    👤 {myRep?.name || currentUser?.name}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="sr-doc">ناوی دکتۆر (ئارەزووی)</Label>
                <Input id="sr-doc" value={form.doctorName} onChange={e => setForm({ ...form, doctorName: e.target.value })} placeholder="دکتۆر ..." />
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold">بەرهەمەکان</h4>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addItemRow}>
                  <Plus className="size-3" /> زیادکردن
                </Button>
              </div>
              {items.map((it, i) => (
                <div key={i} className="flex gap-2 mb-2 items-center">
                  <Select value={it.productId || null} onValueChange={(v: string | null) => v && updateItem(i, "productId", v)}>
                    <SelectTrigger className="flex-[2]"><SelectValue placeholder="بەرهەم هەڵبژێرە..." /></SelectTrigger>
                    <SelectContent>
                      {products.filter(p => p.isActive).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" min={1} placeholder="بڕ" value={it.quantity} onChange={e => updateItem(i, "quantity", e.target.value)} className="flex-1" />
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="size-8 text-destructive shrink-0" onClick={() => removeItemRow(i)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sr-note">تێبینی</Label>
              <Textarea id="sr-note" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="تێبینی دڵخوازانە..." className="min-h-[60px]" />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>پاشگەزبوونەوە</Button>
              <Button type="submit">نێردنی داواکاری</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          DETAIL SHEET
      ═══════════════════════════════════════════════════════════ */}
      <Sheet open={!!detailSr} onOpenChange={open => !open && setDetailSr(null)}>
        <SheetContent side="left" className="w-[460px] overflow-y-auto">
          <SheetHeader className="border-b pb-4 mb-4">
            <SheetTitle>وردەکاری {detailSr?.requestNumber}</SheetTitle>
          </SheetHeader>
          {detailSr && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <Badge className={cn("gap-1.5 text-sm px-4 py-2", statusConfig[detailSr.status].cls)}>
                  {statusConfig[detailSr.status].icon} {statusConfig[detailSr.status].label}
                </Badge>
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handlePrint(detailSr)}>
                  <Printer className="size-3" /> چاپ
                </Button>
              </div>

              {/* Timeline */}
              <div className="flex justify-center gap-1">
                {statusFlow.map((s, i) => {
                  const idx = statusFlow.indexOf(detailSr.status);
                  const done = i <= idx && detailSr.status !== "DECLINED";
                  return (
                    <div key={s} className="flex items-center gap-1">
                      <div className={cn("size-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                        done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{i + 1}</div>
                      {i < statusFlow.length - 1 && (
                        <div className={cn("w-6 h-0.5", i < idx && detailSr.status !== "DECLINED" ? "bg-emerald-500" : "bg-border")} />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: "نوێنەر", v: detailSr.repName },
                  { l: "دکتۆر", v: detailSr.doctorName || "—" },
                  { l: "بەروار", v: new Date(detailSr.createdAt).toLocaleDateString("ar-IQ") },
                  { l: "نێردراو لە", v: detailSr.sentAt || "—" },
                  { l: "گەیشتووە لە", v: detailSr.arrivedAt || "—" },
                  ...(detailSr.declinedReason ? [{ l: "هۆکاری ڕەتکردنەوە", v: detailSr.declinedReason }] : []),
                ].map((it, i) => (
                  <div key={i} className="px-3 py-2 bg-muted/50 rounded-xl border">
                    <p className="text-[11px] text-muted-foreground mb-0.5">{it.l}</p>
                    <p className="font-semibold text-sm">{it.v}</p>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="text-sm font-bold mb-2.5">بەرهەمەکان</h4>
                <div className="border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/5">
                        <TableHead className="text-right text-primary font-semibold text-xs">بەرهەم</TableHead>
                        <TableHead className="text-center text-primary font-semibold text-xs">بڕ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailSr.items.map((it, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-semibold text-xs">{it.productName}</TableCell>
                          <TableCell className="text-center font-bold text-primary text-xs">{it.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {detailSr.note && (
                <div className="p-3 bg-muted/50 rounded-xl border-s-4 border-primary text-sm text-muted-foreground">
                  <strong className="text-foreground">تێبینی:</strong> {detailSr.note}
                </div>
              )}

              {!isRep && (
                <div className="flex gap-2 flex-wrap">
                  {statusFlow.indexOf(detailSr.status) >= 0 && statusFlow.indexOf(detailSr.status) < statusFlow.length - 1 && (
                    <Button className="flex-1 gap-2" onClick={() => { advance(detailSr); setDetailSr(prev => prev ? { ...prev, status: statusFlow[statusFlow.indexOf(prev.status) + 1] } : prev); }}>
                      <ChevronDown className="size-4" /> {statusConfig[statusFlow[statusFlow.indexOf(detailSr.status) + 1]]?.label}
                    </Button>
                  )}
                  {(detailSr.status === "PENDING" || detailSr.status === "ACCEPTED") && (
                    <Button variant="outline" className="gap-2 text-destructive border-red-300 hover:bg-destructive/5"
                      onClick={() => { setDeclineId(detailSr.id); setDetailSr(null); }}>
                      ڕەتکردنەوە
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ═══════════════════════════════════════════════════════════
          DECLINE DIALOG
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={!!declineId} onOpenChange={open => !open && setDeclineId(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-destructive">ڕەتکردنەوەی داواکاری</DialogTitle>
            <DialogDescription>هۆکاری ڕەتکردنەوە بنووسە (ئارەزووی)</DialogDescription>
          </DialogHeader>
          <Textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)}
            placeholder="هۆکاری ڕەتکردنەوە (ئارەزووی)..." className="min-h-[80px]" />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeclineId(null)}>هەڵوەشاندنەوە</Button>
            <Button className="bg-destructive hover:bg-destructive/80 text-destructive-foreground" onClick={() => declineId && decline(declineId)}>ڕەتکردنەوە</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden print area */}
      <div ref={printRef} style={{ display: "none" }}>
        {printSr && <SampleReceipt sr={printSr} />}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          DELETE CONFIRM
      ═══════════════════════════════════════════════════════════ */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>سڕینەوەی داواکاری</AlertDialogTitle>
            <AlertDialogDescription>ئایا دڵنیایت لە سڕینەوەی ئەم داواکارییە؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>پاشگەزبوونەوە</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) deleteSampleRequest(deleteId); setDeleteId(null); }}>
              سڕینەوە
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
