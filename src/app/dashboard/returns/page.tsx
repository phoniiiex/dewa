"use client";
import { useState, useMemo } from "react";
import {
  PackageX, Plus, Search, CheckCircle2, Clock, XCircle,
  Trash2, Edit3, ChevronDown, ChevronRight, TrendingDown,
  RotateCcw, Award, RefreshCw, Info, AlertCircle,
} from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { ReturnRecord, ReturnStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ReturnWizard } from "@/components/custom/ReturnWizard";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<ReturnStatus, {
  label: string; icon: React.ReactNode;
  className: string; dotClass: string;
}> = {
  PENDING:   { label: "چاوەڕوانی پەسەندکردن", icon: <Clock size={12}/>,        className: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",       dotClass: "bg-amber-500" },
  PROCESSED: { label: "پەسەندکرا",            icon: <CheckCircle2 size={12}/>, className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", dotClass: "bg-emerald-500" },
  REJECTED:  { label: "ڕەتکرا",              icon: <XCircle size={12}/>,      className: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",             dotClass: "bg-rose-500" },
};

function StatusBadge({ status }: { status: ReturnStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${cfg.className}`}>
      <span className={`size-1.5 rounded-full ${cfg.dotClass}`}/>
      {cfg.label}
    </span>
  );
}

// ── Row (expand controlled with local state, no asChild needed) ───────────────
function ReturnRow({
  ret, onApprove, onReject, onEdit, onDelete,
}: {
  ret: ReturnRecord;
  onApprove: () => void;
  onReject:  () => void;
  onEdit:    () => void;
  onDelete:  () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const locked = ret.status === "PROCESSED";

  return (
    <>
      {/* Main row */}
      <TableRow
        className="cursor-pointer hover:bg-muted/40 transition-colors group select-none"
        onClick={() => setExpanded((e) => !e)}
      >
        <TableCell className="w-8 text-center">
          {expanded
            ? <ChevronDown size={13} className="text-primary"/>
            : <ChevronRight size={13} className="text-muted-foreground group-hover:text-foreground transition-colors"/>}
        </TableCell>
        <TableCell className="font-bold text-xs">{ret.returnNumber}</TableCell>
        <TableCell className="text-xs">{ret.clientName}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{ret.createdAt}</TableCell>
        <TableCell className="text-center text-xs">{ret.items.length} جۆر</TableCell>
        <TableCell className="text-center">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-bold">{ret.totalReturnedUnits}</span>
            <div className="flex gap-1 text-[9px]">
              <span className="text-amber-600">+{ret.totalBonusUnits}B</span>
              <span className="text-emerald-600">{ret.totalPaidUnits}P</span>
            </div>
          </div>
        </TableCell>
        <TableCell className="text-right text-sm font-bold text-primary">
          {formatIQD(ret.totalDebtCredit)}
        </TableCell>
        <TableCell><StatusBadge status={ret.status}/></TableCell>
        <TableCell>
          <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
            {ret.status === "PENDING" && (
              <>
                <Tooltip>
                  <TooltipTrigger>
                    <button
                      className="size-7 inline-flex items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                      onClick={onApprove}
                    >
                      <CheckCircle2 size={13}/>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">پەسەندکردن (قەرز کەم دەکاتەوە)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger>
                    <button
                      className="size-7 inline-flex items-center justify-center rounded-md text-primary hover:bg-primary/5 transition-colors"
                      onClick={onEdit}
                    >
                      <Edit3 size={13}/>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">گۆڕین</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger>
                    <button
                      className="size-7 inline-flex items-center justify-center rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      onClick={onReject}
                    >
                      <XCircle size={13}/>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">ڕەتکردنەوە</TooltipContent>
                </Tooltip>
              </>
            )}
            {ret.status === "REJECTED" && (
              <Tooltip>
                <TooltipTrigger>
                  <button
                    className="size-7 inline-flex items-center justify-center rounded-md text-destructive hover:bg-destructive/5 transition-colors"
                    onClick={onDelete}
                  >
                    <Trash2 size={13}/>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">سڕینەوە</TooltipContent>
              </Tooltip>
            )}
            {locked && (
              <span className="text-[10px] text-muted-foreground px-2">🔒</span>
            )}
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded detail row */}
      {expanded && (
        <TableRow className="bg-muted/10 hover:bg-muted/10">
          <TableCell colSpan={9} className="py-3 px-8">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-[11px] font-bold">بەرهەم</TableHead>
                    <TableHead className="text-[11px] font-bold text-center">گەڕاوە</TableHead>
                    <TableHead className="text-[11px] font-bold text-center text-amber-600">بۆنەس ٣٠٪</TableHead>
                    <TableHead className="text-[11px] font-bold text-center text-emerald-600">پارەدار ٧٠٪</TableHead>
                    <TableHead className="text-[11px] font-bold">داواکاری</TableHead>
                    <TableHead className="text-[11px] font-bold text-right">کەمکردنەوەی قەرز</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ret.items.map((item) => (
                    <TableRow key={item.productId} className="text-xs">
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-center font-bold">{item.returnedQty}</TableCell>
                      <TableCell className="text-center text-amber-600 font-bold">{item.bonusQty}</TableCell>
                      <TableCell className="text-center text-emerald-600 font-bold">{item.paidQty}</TableCell>
                      <TableCell className="text-muted-foreground">{item.fromOrderNumber || "—"}</TableCell>
                      <TableCell className="text-right font-bold">{formatIQD(item.debtCredit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {ret.notes && (
              <p className="text-xs text-muted-foreground mt-2 px-1 flex items-center gap-1">
                <Info size={11}/> {ret.notes}
              </p>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReturnsPage() {
  const { returns, updateReturn, deleteReturn } = useData();

  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | "all">("all");
  const [wizardOpen, setWizardOpen]     = useState(false);
  const [editTarget, setEditTarget]     = useState<ReturnRecord | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<ReturnRecord | null>(null);
  const [confirmReject, setConfirmReject]   = useState<ReturnRecord | null>(null);
  const [confirmDelete, setConfirmDelete]   = useState<ReturnRecord | null>(null);

  const filtered = useMemo(() => {
    return returns.filter((r) => {
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch = !q || r.returnNumber.toLowerCase().includes(q) || r.clientName.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [returns, search, statusFilter]);

  // Stats (this month)
  const now = new Date();
  const thisMonth = returns.filter((r) => {
    const d = new Date(r.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalCreditThisMonth = thisMonth.filter((r) => r.status === "PROCESSED").reduce((s, r) => s + r.totalDebtCredit, 0);
  const pendingCount = returns.filter((r) => r.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600">
            <RotateCcw size={20}/>
          </div>
          <div>
            <h1 className="text-xl font-bold">گەڕاوەکان</h1>
            <p className="text-sm text-muted-foreground">بەڕێوەبردنی گەڕاندنەوەی بەرهەم لە کڕیار</p>
          </div>
        </div>
        <Button onClick={() => { setEditTarget(null); setWizardOpen(true); }} className="gap-2">
          <Plus size={15}/> گەڕاوەی نوێ
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <RefreshCw size={12}/> گەڕاوەی ئەم مانگە
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{thisMonth.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <TrendingDown size={12}/> کەمکردنەوەی قەرز ئەم مانگە
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-primary">{formatIQD(totalCreditThisMonth)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Clock size={12}/> چاوەڕوانی پەسەندکردن
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className={cn("text-2xl font-bold", pendingCount > 0 ? "text-amber-600" : "")}>{pendingCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <div className="flex items-center gap-3 p-4 border-b flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
            <Input
              placeholder="گەڕان بەژمارە یان ناوی کڕیار..."
              className="pl-8 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-48 h-9 text-xs">
              <SelectValue placeholder="هەموو باراودۆخەکان"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">هەموو</SelectItem>
              <SelectItem value="PENDING">چاوەڕوانی پەسەندکردن</SelectItem>
              <SelectItem value="PROCESSED">پەسەندکراو</SelectItem>
              <SelectItem value="REJECTED">ڕەتکراو</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-8"/>
                <TableHead className="text-xs font-bold">ژمارە</TableHead>
                <TableHead className="text-xs font-bold">کڕیار</TableHead>
                <TableHead className="text-xs font-bold">بەروار</TableHead>
                <TableHead className="text-xs font-bold text-center">جۆرەکان</TableHead>
                <TableHead className="text-xs font-bold text-center">دانەکان</TableHead>
                <TableHead className="text-xs font-bold text-right">کەمکردنەوەی قەرز</TableHead>
                <TableHead className="text-xs font-bold">باراودۆخ</TableHead>
                <TableHead className="text-xs font-bold text-right">کردارەکان</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="p-0">
                    <Empty className="py-16 border-0">
                      <EmptyHeader>
                        <EmptyMedia variant="icon"><RotateCcw className="size-4" /></EmptyMedia>
                        <EmptyTitle>هیچ گەڕاوەیەک نەدۆزرایەوە</EmptyTitle>
                        <EmptyDescription>گەڕاوەی نوێ تۆمار بکە</EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button size="sm" onClick={() => { setEditTarget(null); setWizardOpen(true); }}><Plus className="size-4 me-1" />گەڕاوەی نوێ</Button>
                      </EmptyContent>
                    </Empty>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((ret) => (
                  <ReturnRow
                    key={ret.id}
                    ret={ret}
                    onApprove={() => setConfirmApprove(ret)}
                    onReject={() => setConfirmReject(ret)}
                    onEdit={() => { setEditTarget(ret); setWizardOpen(true); }}
                    onDelete={() => setConfirmDelete(ret)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Wizard */}
      <ReturnWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        editReturn={editTarget}
      />

      {/* Approve confirm */}
      <AlertDialog open={!!confirmApprove} onOpenChange={(o) => !o && setConfirmApprove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600"/> پەسەندکردنی گەڕاوە
            </AlertDialogTitle>
            <AlertDialogDescription>
              ئایا دڵنیایت لە پەسەندکردنی <strong>{confirmApprove?.returnNumber}</strong>؟<br/>
              <span className="text-emerald-600 font-bold">
                {formatIQD(confirmApprove?.totalDebtCredit ?? 0)}
              </span> لە قەرزی <strong>{confirmApprove?.clientName}</strong> کەم دەکرێتەوە
              و <strong>{confirmApprove?.totalReturnedUnits}</strong> دانە دەگەڕێتەوە بۆ ئەنبار.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>هەڵوەشاندنەوە</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                if (!confirmApprove) return;
                updateReturn(confirmApprove.id, { status: "PROCESSED" });
                setConfirmApprove(null);
              }}
            >
              بەڵێ، پەسەند بکە
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject confirm */}
      <AlertDialog open={!!confirmReject} onOpenChange={(o) => !o && setConfirmReject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle size={18} className="text-rose-600"/> ڕەتکردنەوەی گەڕاوە
            </AlertDialogTitle>
            <AlertDialogDescription>
              ئایا دڵنیایت لە ڕەتکردنەوەی <strong>{confirmReject?.returnNumber}</strong>؟
              قەرز ناگۆڕێت و بەرهەم نەگەڕێتەوە بۆ ئەنبار.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>هەڵوەشاندنەوە</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => {
                if (!confirmReject) return;
                updateReturn(confirmReject.id, { status: "REJECTED" });
                setConfirmReject(null);
              }}
            >
              بەڵێ، ڕەتی بکەوە
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>سڕینەوەی گەڕاوە</AlertDialogTitle>
            <AlertDialogDescription>
              ئایا دڵنیایت لە سڕینەوەی <strong>{confirmDelete?.returnNumber}</strong>؟ ئەم کردارە ناگەڕێتەوە.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>هەڵوەشاندنەوە</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white"
              onClick={() => {
                if (!confirmDelete) return;
                deleteReturn(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              سڕینەوە
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
