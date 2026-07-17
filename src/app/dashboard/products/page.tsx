"use client";
import { useState, useMemo } from "react";
import {
  Search, Plus, Package, Edit3, Trash2, Eye, X,
  Grid3X3, List, AlertTriangle, ImageIcon, MoreVertical, ChevronDown, ChevronUp,
} from "lucide-react";
import { useData } from "@/lib/store";
import { formatIQD } from "@/lib/currency";
import type { Product } from "@/lib/types";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ExportButton from "@/components/custom/ExportButton";
import type { ExportColumn } from "@/lib/export";
import AddProductWizard, { type WizardFormData } from "@/components/custom/AddProductWizard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const productExportCols: ExportColumn[] = [
  { key: "name", label: "ناوی بەرهەم" },
  { key: "sku", label: "SKU" },
  { key: "company", label: "کۆمپانیا" },
  { key: "category", label: "جۆر" },
  { key: "price", label: "نرخ", format: (v) => String(v) },
  { key: "stock", label: "کۆگا" },
  { key: "origin", label: "سەرچاوە" },
  { key: "issueDate", label: "بەرواری بەرهەمهێنان" },
  { key: "expiryDate", label: "بەسەرچوون" },
];

function isNearExpiry(date: string): boolean {
  const diff = new Date(date).getTime() - Date.now();
  return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
}
function isExpired(date: string): boolean {
  return !!date && new Date(date).getTime() < Date.now();
}

function stockLabel(p: Product) {
  return p.stock <= p.lowStock ? "کەمە" : p.stock <= p.lowStock * 3 ? "کەم" : "بەردەست";
}
function stockVariant(p: Product): "destructive" | "warning" | "success" {
  return p.stock <= p.lowStock ? "destructive" : p.stock <= p.lowStock * 3 ? "warning" : "success";
}
function stockCls(p: Product) {
  return p.stock <= p.lowStock
    ? "text-red-500"
    : p.stock <= p.lowStock * 3
    ? "text-orange-500"
    : "text-emerald-500";
}

// ── Figma-style Grid Card ──────────────────────────────────────────────
function ProductGridCard({ p, onEdit, onDelete, onView }: { p: Product; onEdit: () => void; onDelete: () => void; onView: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const mainPrice = p.prices?.[0];
  const expired = p.expiryDate && isExpired(p.expiryDate);
  const nearExpiry = p.expiryDate && isNearExpiry(p.expiryDate);

  return (
    <Card className="overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 cursor-default">
      {/* top dots + menu */}
      <div className="flex justify-between items-center px-3 pt-3">
        <div className="flex gap-1 items-center">
          <div className="w-4 h-1 rounded-full bg-primary" />
          <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
            <MoreVertical className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-32">
            <DropdownMenuItem onClick={onView}><Eye className="size-3 me-2" />وردەکاری</DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}><Edit3 className="size-3 me-2" />دەستکاری</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="size-3 me-2" />سڕینەوە</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Product image */}
      <div className="mx-3 mt-2 h-[138px] rounded-xl bg-muted flex items-center justify-center overflow-hidden">
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="size-7 text-muted-foreground/30" />
        )}
      </div>

      {/* Card body */}
      <CardContent className="px-3 pb-3 pt-2">
        <Button variant="ghost" className="w-full flex justify-between items-start text-start h-auto p-0" onClick={() => setExpanded(!expanded)}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.company || p.category}</p>
          </div>
          <div className="text-muted-foreground mt-0.5 shrink-0 ms-1">
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </div>
        </Button>

        {expanded && (
          <div className="mt-3 animate-in fade-in duration-150">
            <div className="h-px bg-border mb-3" />
            <div className="flex gap-4 mb-3">
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">{mainPrice ? mainPrice.typeName : "نرخ"}</p>
                <p className="text-sm font-black">{mainPrice ? formatIQD(mainPrice.amount) : (p.price ? formatIQD(p.price) : "—")}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">کۆگا</p>
                <div className="flex items-center gap-1">
                  <span className={cn("text-sm font-black", stockCls(p))}>{p.stock.toLocaleString()}</span>
                  <span className="text-[10px] text-muted-foreground">{p.unitType}</span>
                </div>
              </div>
            </div>

            {p.prices && p.prices.length > 1 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {p.prices.slice(1).map(pr => (
                  <Badge key={pr.typeId} variant="secondary" className="text-[9px]">
                    {pr.typeName}: {formatIQD(pr.amount)}
                  </Badge>
                ))}
              </div>
            )}

            {p.expiryDate && (
              <div className="mb-2">
                <Badge variant={expired ? "destructive" : nearExpiry ? "outline" : "secondary"} className="text-[9px]">
                  {expired ? "⚠ بەسەرچووە" : `بەسەرچوون: ${p.expiryDate}`}
                </Badge>
              </div>
            )}

            <Button variant="outline" size="sm" className="w-full text-xs" onClick={onEdit}>
              <Edit3 className="size-3 me-1" /> دەستکاری بەرهەم
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct, loading } = useData();
  const [searchTerm, setSearchTerm]     = useState("");
  const [categoryFilter, setCategoryFilter] = useState("هەموو");
  const [viewMode, setViewMode]         = useState<"grid" | "list">("list");
  const [modalOpen, setModalOpen]       = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId]         = useState<string | null>(null);

  const allCategories = useMemo(() =>
    Array.from(new Set(products.map(p => p.category).filter(Boolean))), [products]);

  const openEdit = (p: Product) => { setEditingProduct(p); setEditModalOpen(true); };

  const handleWizardSubmit = (data: WizardFormData) => {
    const firstPrice = data.prices.find(p => p.amount);
    addProduct({
      name: data.name, sku: data.barcode || "", barcode: data.barcode,
      category: data.category, company: data.company,
      price: firstPrice ? Number(firstPrice.amount) : 0,
      prices: data.prices.filter(p => p.amount).map(p => ({ typeId: p.typeId, typeName: p.typeName, amount: Number(p.amount) })),
      stock: Number(data.stock), lowStock: Number(data.lowStock) || 10,
      unitType: data.unitType, origin: data.origin, supplier: data.supplier,
      issueDate: data.issueDate, expiryDate: data.expiryDate,
      batchNumber: data.batchNumber, isActive: true, imageUrl: data.imageUrl,
    });
  };

  const handleEditSubmit = (data: WizardFormData) => {
    if (!editingProduct) return;
    const firstPrice = data.prices.find(p => p.amount);
    updateProduct(editingProduct.id, {
      name: data.name, sku: data.barcode || editingProduct.sku, barcode: data.barcode,
      category: data.category, company: data.company,
      price: firstPrice ? Number(firstPrice.amount) : 0,
      prices: data.prices.filter(p => p.amount).map(p => ({ typeId: p.typeId, typeName: p.typeName, amount: Number(p.amount) })),
      stock: Number(data.stock), lowStock: Number(data.lowStock) || 10,
      unitType: data.unitType, origin: data.origin, supplier: data.supplier,
      issueDate: data.issueDate, expiryDate: data.expiryDate,
      batchNumber: data.batchNumber, isActive: editingProduct.isActive, imageUrl: data.imageUrl,
    });
    setEditModalOpen(false);
  };

  const filtered = useMemo(() => products.filter(p => {
    const matchSearch = p.name.includes(searchTerm) || p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || (p.company || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === "هەموو" || p.category === categoryFilter;
    return matchSearch && matchCat;
  }), [products, searchTerm, categoryFilter]);

  const kpi = useMemo(() => ({
    total:      products.length,
    totalStock: products.reduce((s, p) => s + p.stock, 0),
    nearExpiry: products.filter(p => p.expiryDate && isNearExpiry(p.expiryDate)).length,
    expired:    products.filter(p => p.expiryDate && isExpired(p.expiryDate)).length,
  }), [products]);

  return (
    <>
      {/* ── Header ── */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Package className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">بەرهەمەکان</h1>
            <p className="text-sm text-muted-foreground">بەڕێوەبردنی هەموو بەرهەمەکان و کۆگا</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={filtered as unknown as Record<string, unknown>[]} columns={productExportCols} filename="products" title="بەرهەمەکان" />
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="size-4 me-1" /> بەرهەمی نوێ
          </Button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-7 w-14" /></CardContent></Card>
        )) : [
          { title: "کۆی بەرهەم",       value: kpi.total,      cls: "text-foreground" },
          { title: "کۆی کۆگا",          value: kpi.totalStock.toLocaleString(), cls: "text-primary" },
          { title: "نزیکی بەسەرچوون", value: kpi.nearExpiry, cls: "text-orange-500" },
          { title: "بەسەرچووە",         value: kpi.expired,   cls: "text-destructive" },
        ].map((k, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-1">{k.title}</p>
              <p className={cn("text-2xl font-black", k.cls)}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filters + View Toggle ── */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute end-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="گەڕان بە ناو، کۆمپانیا..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-60 pe-8 text-sm"
            />
          </div>
          <div className="flex gap-0.5 bg-muted p-0.5 rounded-lg flex-wrap">
            {["هەموو", ...allCategories.slice(0, 5)].map(c => (
              <Button key={c} variant={categoryFilter === c ? "secondary" : "ghost"} size="sm"
                onClick={() => setCategoryFilter(c)}
                className={cn("px-2.5 h-7 rounded-md text-xs font-medium", categoryFilter === c ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}>
                {c}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex gap-0.5 bg-muted p-0.5 rounded-lg">
          <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon"
            onClick={() => setViewMode("list")}
            className={cn("size-8 rounded-md", viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}>
            <List className="size-4" />
          </Button>
          <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon"
            onClick={() => setViewMode("grid")}
            className={cn("size-8 rounded-md", viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}>
            <Grid3X3 className="size-4" />
          </Button>
        </div>
      </div>

      {/* ── GRID VIEW ── */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-60 rounded-xl" />)
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <Package className="size-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold">هیچ بەرهەمێک نەدۆزرایەوە</p>
            </div>
          ) : filtered.map(p => (
            <ProductGridCard key={p.id} p={p}
              onEdit={() => openEdit(p)}
              onDelete={() => setDeleteId(p.id)}
              onView={() => setDetailProduct(p)}
            />
          ))}
        </div>
      ) : (
        /* ── TABLE VIEW ── */
        <Card>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">بەرهەم</TableHead>
                <TableHead className="min-w-[100px]">کۆمپانیا</TableHead>
                <TableHead className="min-w-[80px]">بارکۆد</TableHead>
                <TableHead className="min-w-[80px]">جۆر</TableHead>
                <TableHead className="min-w-[120px]">نرخ</TableHead>
                <TableHead className="min-w-[80px]">کۆگا</TableHead>
                <TableHead className="min-w-[70px]">بارودۆخ</TableHead>
                <TableHead className="min-w-[70px]">ولات</TableHead>
                <TableHead className="min-w-[90px]">بەسەرچوون</TableHead>
                <TableHead className="min-w-[90px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.map(p => (
                <TableRow key={p.id}
                  className={cn(p.expiryDate && isExpired(p.expiryDate) ? "bg-destructive/5" : p.expiryDate && isNearExpiry(p.expiryDate) ? "bg-orange-50/50 dark:bg-orange-950/10" : "")}>
                  <TableCell className="font-semibold">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{p.company || "—"}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.barcode || p.sku || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">{p.category}</Badge>
                  </TableCell>
                  <TableCell>
                    {p.prices && p.prices.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {p.prices.map(pr => (
                          <div key={pr.typeId} className="text-xs">
                            <span className="text-muted-foreground text-[10px]">{pr.typeName}: </span>
                            <span className="font-semibold">{formatIQD(pr.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm font-semibold">{p.price ? formatIQD(p.price) : "—"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={cn("font-bold", stockCls(p))}>{p.stock.toLocaleString()}</span>
                    <span className="text-[10px] text-muted-foreground ms-1">{p.unitType}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={p.stock <= p.lowStock ? "destructive" : p.stock <= p.lowStock * 3 ? "outline" : "secondary"}
                      className="text-[10px]"
                    >
                      {stockLabel(p)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.origin || "—"}</TableCell>
                  <TableCell>
                    {p.expiryDate && isExpired(p.expiryDate) ? (
                      <span className="text-destructive text-xs font-semibold flex items-center gap-1">
                        <AlertTriangle className="size-3" /> بەسەرچووە
                      </span>
                    ) : p.expiryDate && isNearExpiry(p.expiryDate) ? (
                      <span className="text-orange-500 text-xs font-semibold">{p.expiryDate}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{p.expiryDate || "—"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => setDetailProduct(p)}><Eye className="size-3.5 text-primary" /></Button>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(p)}><Edit3 className="size-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => setDeleteId(p.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          <div className="px-4 py-2 border-t border-border">
            <p className="text-xs text-muted-foreground">{filtered.length} بەرهەم</p>
          </div>
        </Card>
      )}

      {/* ── Wizards ── */}
      <AddProductWizard open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleWizardSubmit} existingProducts={products} />
      <AddProductWizard
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSubmit={handleEditSubmit}
        existingProducts={products}
        initialProduct={editingProduct ? {
          id:               editingProduct.id,
          name:             editingProduct.name,
          barcode:          editingProduct.barcode ?? editingProduct.sku ?? "",
          category:         editingProduct.category,
          company:          editingProduct.company,
          stock:            String(editingProduct.stock),
          lowStock:         String(editingProduct.lowStock ?? 10),
          unitType:         editingProduct.unitType,
          origin:           editingProduct.origin,
          supplier:         editingProduct.supplier,
          issueDate:        editingProduct.issueDate,
          expiryDate:       editingProduct.expiryDate,
          batchNumber:      editingProduct.batchNumber,
          imageUrl:         editingProduct.imageUrl,
          description:      ((editingProduct as unknown as Record<string, unknown>).description as string) ?? "",
          activeIngredients:((editingProduct as unknown as Record<string, unknown>).activeIngredients as string) ?? "",
          dosageForm:       ((editingProduct as unknown as Record<string, unknown>).dosageForm as string) ?? "",
          prices:           (editingProduct.prices ?? []).map(p => ({ ...p, amount: String(p.amount) })),
        } : undefined}
      />

      {/* ── Detail Sheet ── */}
      <Sheet open={!!detailProduct} onOpenChange={open => !open && setDetailProduct(null)}>
        <SheetContent side="left" className="w-[420px] overflow-y-auto p-0">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle>وردەکاری بەرهەم</SheetTitle>
          </SheetHeader>
          {detailProduct && (
            <>
              {detailProduct.imageUrl && (
                <img src={detailProduct.imageUrl} alt={detailProduct.name} className="w-full h-48 object-cover" />
              )}
              <div className="p-6 space-y-4">
                {detailProduct.company && <p className="text-xs text-primary font-bold">{detailProduct.company}</p>}
                <div>
                  <h2 className="text-lg font-bold">{detailProduct.name}</h2>
                  <p className="text-xs text-muted-foreground font-mono">{detailProduct.sku}</p>
                </div>

                {detailProduct.prices && detailProduct.prices.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">نرخەکان</p>
                    <div className="flex flex-wrap gap-2">
                      {detailProduct.prices.map(pr => (
                        <div key={pr.typeId} className="px-3 py-2 bg-primary/10 rounded-lg">
                          <p className="text-[10px] text-muted-foreground">{pr.typeName}</p>
                          <p className="text-base font-black text-primary">{formatIQD(pr.amount)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { l: "جۆر",                  v: detailProduct.category },
                    { l: "کۆگا",                  v: `${detailProduct.stock} ${detailProduct.unitType}` },
                    { l: "بارودۆخ",               v: stockLabel(detailProduct) },
                    { l: "ولات",                  v: detailProduct.origin },
                    { l: "دابینکەر",              v: detailProduct.supplier },
                    { l: "بەرواری بەرهەمهێنان",   v: detailProduct.issueDate || "—" },
                    { l: "بەرواری بەسەرچوون",     v: detailProduct.expiryDate || "—" },
                    { l: "ژمارەی بەچ",            v: detailProduct.batchNumber || "—" },
                    { l: "نموونە",                v: detailProduct.isSample ? "بەڵێ" : "نەخێر" },
                  ].map((item, i) => (
                    <div key={i}>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide mb-0.5">{item.l}</p>
                      <p className="text-sm font-semibold">{item.v || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>سڕینەوەی بەرهەم</AlertDialogTitle>
            <AlertDialogDescription>ئایا دڵنیایت لە سڕینەوەی ئەم بەرهەمە؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>پاشگەزبوونەوە</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) deleteProduct(deleteId); setDeleteId(null); }}>سڕینەوە</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
