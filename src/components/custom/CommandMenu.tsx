"use client";
import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {  Search, ShoppingCart, Users, Package, Truck,
  LayoutDashboard, FileText, Warehouse, UserCog,
  BarChart2, Building2, User, RotateCcw, Sparkles,
  Settings, Gift, FlaskConical, BadgeCheck, Stethoscope,
  Map, Bot, Wallet, Plus,
} from "lucide-react";
import { useData } from "@/lib/store";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

// ── Status badge colors ───────────────────────────────────────────────────────
const statusLabels: Record<string, string> = {
  WAITING: "چاوەڕوان",
  IN_PROGRESS: "لە پڕۆسەدا",
  NOT_ACCEPTED: "ڕەتکراوە",
  READY: "ئامادەیە",
  SENT: "نێردراوە",
  DELIVERED: "گەیشتووە",
  PAID: "پارەدراوە",
};

const roleLabels: Record<string, string> = {
  ADMIN: "بەڕێوەبەر",
  MANAGER: "بەڕێوەبەری ناوەڕاست",
  REP: "نوێنەر",
};

// ── Nav Pages (all sidebar routes) ────────────────────────────────────────────
const navPages = [
  { label: "داشبۆرد",           href: "/dashboard",            icon: LayoutDashboard, color: "text-primary" },
  { label: "ڕاپۆرت",           href: "/dashboard/analytics",  icon: BarChart2,       color: "text-green-600" },
  { label: "بەرهەمەکان",       href: "/dashboard/products",   icon: Package,         color: "text-green-600" },
  { label: "داواکارییەکان",     href: "/dashboard/orders",     icon: ShoppingCart,    color: "text-orange-500" },
  { label: "بۆنەس",             href: "/dashboard/bonus",      icon: Gift,            color: "text-pink-500" },
  { label: "نموونەکان",        href: "/dashboard/samples",    icon: FlaskConical,    color: "text-cyan-600" },
  { label: "گەڕاوەکان",        href: "/dashboard/returns",    icon: RotateCcw,       color: "text-rose-500" },
  { label: "کڕیارەکان",        href: "/dashboard/clients",    icon: Users,           color: "text-primary" },
  { label: "نوێنەری فرۆشتن",   href: "/dashboard/reps",       icon: UserCog,         color: "text-violet-600" },
  { label: "کۆگاکان",          href: "/dashboard/warehouses",  icon: Building2,      color: "text-amber-600" },
  { label: "دابینکەرەکان",     href: "/dashboard/suppliers",   icon: Building2,      color: "text-sky-600" },
  { label: "گواستنەوە",        href: "/dashboard/logistics",   icon: Truck,          color: "text-red-500" },
  { label: "شۆفێرەکان",       href: "/dashboard/drivers",     icon: BadgeCheck,     color: "text-emerald-600" },
  { label: "پزیشکەکان",       href: "/dashboard/doctors",     icon: Stethoscope,    color: "text-blue-500" },
  { label: "نەخشەی کڕیار",     href: "/dashboard/map",         icon: Map,            color: "text-teal-500" },
  { label: "بۆت",               href: "/dashboard/telegram",    icon: Bot,            color: "text-blue-400" },
  { label: "دارایی",           href: "/dashboard/finance",     icon: Wallet,         color: "text-emerald-600" },
  { label: "بەکارهێنەرەکان",   href: "/dashboard/users",       icon: User,           color: "text-pink-500" },
  { label: "ڕێکخستنەکان",     href: "/dashboard/settings",    icon: Settings,       color: "text-muted-foreground" },
  { label: "دەوا AI",           href: "/dashboard/ai",          icon: Sparkles,       color: "text-primary" },
];

// ── Quick Actions ─────────────────────────────────────────────────────────────
const quickActions = [
  { label: "داواکاری نوێ", action: "new-order", icon: Plus, color: "text-orange-500" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onNewOrder?: () => void;
}

export default function CommandMenu({ open, onClose, onNewOrder }: Props) {
  const router = useRouter();
  const { products, clients, orders, reps, users, warehouses, suppliers, drivers } = useData();

  const go = useCallback((href: string) => {
    router.push(href);
    onClose();
  }, [router, onClose]);

  const handleAction = useCallback((action: string) => {
    switch (action) {
      case "new-order":
        onNewOrder?.();
        router.push("/dashboard/orders");
        break;
    }
    onClose();
  }, [router, onClose, onNewOrder]);

  // Format price with IQD
  const fmtPrice = (n: number) =>
    n.toLocaleString("en-US", { maximumFractionDigits: 0 }) + " د.ع";

  // Memoize searchable data to avoid re-creating on every keystroke
  const orderItems = useMemo(() =>
    orders.map(o => ({
      id: o.id,
      value: `${o.orderNumber} ${o.clientName} ${o.repName || ""} ${statusLabels[o.status] || o.status}`,
      number: o.orderNumber,
      client: o.clientName,
      status: statusLabels[o.status] || o.status,
      total: o.totalAmount,
    })),
    [orders]
  );

  const productItems = useMemo(() =>
    products.map(p => ({
      id: p.id,
      value: `${p.name} ${p.sku || ""} ${p.category || ""} ${p.company || ""} ${p.barcode || ""}`,
      name: p.name,
      sku: p.sku,
      stock: p.stock,
      price: p.price,
    })),
    [products]
  );

  const clientItems = useMemo(() =>
    clients.map(c => ({
      id: c.id,
      value: `${c.name} ${c.city || ""} ${c.phone || ""} ${c.owner || ""}`,
      name: c.name,
      city: c.city,
      phone: c.phone,
    })),
    [clients]
  );

  const repItems = useMemo(() =>
    reps.map(r => ({
      id: r.id,
      value: `${r.name} ${r.city || ""} ${r.phone || ""}`,
      name: r.name,
      city: r.city,
    })),
    [reps]
  );

  const userItems = useMemo(() =>
    users.map(u => ({
      id: u.id,
      value: `${u.name} ${u.email} ${u.role}`,
      name: u.name,
      role: roleLabels[u.role] || u.role,
    })),
    [users]
  );

  const warehouseItems = useMemo(() =>
    warehouses.map(w => ({
      id: w.id,
      value: `${w.name} ${w.city || ""} ${w.phone || ""}`,
      name: w.name,
      city: w.city,
    })),
    [warehouses]
  );

  const supplierItems = useMemo(() =>
    suppliers.map(s => ({
      id: s.id,
      value: `${s.name} ${s.country || ""} ${s.contact || ""}`,
      name: s.name,
      country: s.country,
    })),
    [suppliers]
  );

  const driverItems = useMemo(() =>
    drivers.map(d => ({
      id: d.id,
      value: `${d.name} ${d.phone || ""} ${d.city || ""}`,
      name: d.name,
      phone: d.phone,
    })),
    [drivers]
  );

  return (
    <CommandDialog open={open} onOpenChange={v => !v && onClose()} title="گەڕانی خێرا" description="بگەڕێ بۆ لاپەڕە، بەرهەم، کڕیار، داواکاری، و زۆرتر...">
      <Command>
      <CommandInput placeholder="بگەڕێ... (Ctrl+K)" />
      <CommandList className="max-h-80">
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-4">
            <Search className="size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">هیچ ئەنجامێک نەدۆزرایەوە</p>
          </div>
        </CommandEmpty>

        {/* ── Quick Actions ── */}
        <CommandGroup heading="کردارە خێراکان">
          {quickActions.map(a => (
            <CommandItem key={a.action} value={`action-${a.label}`} onSelect={() => handleAction(a.action)} className="gap-2.5">
              <a.icon className={`size-4 ${a.color}`} />
              <span>{a.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* ── Navigation ── */}
        <CommandGroup heading="لاپەڕەکان">
          {navPages.map(p => (
            <CommandItem key={p.href} value={`nav-${p.label}`} onSelect={() => go(p.href)} className="gap-2.5">
              <p.icon className={`size-4 ${p.color}`} />
              <span>{p.label}</span>
              {p.href === "/dashboard/ai" && <CommandShortcut>AI</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* ── Orders ── */}
        {orderItems.length > 0 && (
          <CommandGroup heading={`داواکارییەکان (${orderItems.length})`}>
            {orderItems.map(o => (
              <CommandItem key={o.id} value={`order-${o.value}`} onSelect={() => go("/dashboard/orders")} className="gap-2.5">
                <ShoppingCart className="size-4 text-orange-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{o.number}</span>
                  <span className="text-muted-foreground ms-2 text-xs">{o.client}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{o.status}</span>
                <span className="text-xs font-medium shrink-0">{fmtPrice(o.total)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* ── Products ── */}
        {productItems.length > 0 && (
          <CommandGroup heading={`بەرهەمەکان (${productItems.length})`}>
            {productItems.map(p => (
              <CommandItem key={p.id} value={`product-${p.value}`} onSelect={() => go("/dashboard/products")} className="gap-2.5">
                <Package className="size-4 text-green-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{p.name}</span>
                  {p.sku && <span className="text-muted-foreground ms-2 text-xs">{p.sku}</span>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{p.stock} بەردەست</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* ── Clients ── */}
        {clientItems.length > 0 && (
          <CommandGroup heading={`کڕیارەکان (${clientItems.length})`}>
            {clientItems.map(c => (
              <CommandItem key={c.id} value={`client-${c.value}`} onSelect={() => go("/dashboard/clients")} className="gap-2.5">
                <Users className="size-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{c.name}</span>
                  {c.city && <span className="text-muted-foreground ms-2 text-xs">{c.city}</span>}
                </div>
                {c.phone && <span className="text-xs text-muted-foreground shrink-0">{c.phone}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* ── Reps ── */}
        {repItems.length > 0 && (
          <CommandGroup heading={`نوێنەرەکان (${repItems.length})`}>
            {repItems.map(r => (
              <CommandItem key={r.id} value={`rep-${r.value}`} onSelect={() => go("/dashboard/reps")} className="gap-2.5">
                <UserCog className="size-4 text-violet-600 shrink-0" />
                <span className="flex-1">{r.name}</span>
                {r.city && <span className="text-xs text-muted-foreground">{r.city}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* ── Warehouses ── */}
        {warehouseItems.length > 0 && (
          <CommandGroup heading={`کۆگاکان (${warehouseItems.length})`}>
            {warehouseItems.map(w => (
              <CommandItem key={w.id} value={`warehouse-${w.value}`} onSelect={() => go("/dashboard/warehouses")} className="gap-2.5">
                <Warehouse className="size-4 text-amber-600 shrink-0" />
                <span className="flex-1">{w.name}</span>
                {w.city && <span className="text-xs text-muted-foreground">{w.city}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* ── Suppliers ── */}
        {supplierItems.length > 0 && (
          <CommandGroup heading={`دابینکەرەکان (${supplierItems.length})`}>
            {supplierItems.map(s => (
              <CommandItem key={s.id} value={`supplier-${s.value}`} onSelect={() => go("/dashboard/suppliers")} className="gap-2.5">
                <Building2 className="size-4 text-sky-600 shrink-0" />
                <span className="flex-1">{s.name}</span>
                {s.country && <span className="text-xs text-muted-foreground">{s.country}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* ── Drivers ── */}
        {driverItems.length > 0 && (
          <CommandGroup heading={`شۆفێرەکان (${driverItems.length})`}>
            {driverItems.map(d => (
              <CommandItem key={d.id} value={`driver-${d.value}`} onSelect={() => go("/dashboard/drivers")} className="gap-2.5">
                <BadgeCheck className="size-4 text-emerald-600 shrink-0" />
                <span className="flex-1">{d.name}</span>
                {d.phone && <span className="text-xs text-muted-foreground">{d.phone}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* ── Users ── */}
        {userItems.length > 0 && (
          <CommandGroup heading={`بەکارهێنەرەکان (${userItems.length})`}>
            {userItems.map(u => (
              <CommandItem key={u.id} value={`user-${u.value}`} onSelect={() => go("/dashboard/users")} className="gap-2.5">
                <User className="size-4 text-pink-500 shrink-0" />
                <span className="flex-1 font-medium">{u.name}</span>
                <span className="text-xs text-muted-foreground">{u.role}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
      </Command>
    </CommandDialog>
  );
}
