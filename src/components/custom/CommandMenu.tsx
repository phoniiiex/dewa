"use client";
import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, ShoppingCart, Users, Package, Truck,
  LayoutDashboard, FileText, Warehouse,
  UserCog, BarChart2, Building2, User, RotateCcw,
} from "lucide-react";
import { useData } from "@/lib/store";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

// ── Nav Pages ────────────────────────────────────────────────────────────────
const navPages = [
  { label: "داشبۆرد",          href: "/dashboard",            icon: <LayoutDashboard className="size-4 text-primary" /> },
  { label: "داواکارییەکان",    href: "/dashboard/orders",     icon: <ShoppingCart className="size-4 text-orange-500" /> },
  { label: "بەرهەمەکان",      href: "/dashboard/products",   icon: <Package className="size-4 text-green-600" /> },
  { label: "کڕیارەکان",       href: "/dashboard/clients",    icon: <Users className="size-4 text-primary" /> },
  { label: "نوێنەرەکان",      href: "/dashboard/reps",       icon: <UserCog className="size-4 text-violet-600" /> },
  { label: "کۆگاکان",         href: "/dashboard/warehouses", icon: <Warehouse className="size-4 text-amber-600" /> },
  { label: "گواستنەوەکان",    href: "/dashboard/logistics",  icon: <Truck className="size-4 text-red-500" /> },
  { label: "ڕاپۆرت",          href: "/dashboard/analytics",  icon: <BarChart2 className="size-4 text-green-600" /> },
  { label: "پسووڵەکان",       href: "/dashboard/invoices",   icon: <FileText className="size-4 text-amber-600" /> },
  { label: "بەکارهێنەرەکان",  href: "/dashboard/users",      icon: <User className="size-4 text-pink-500" /> },
  { label: "پاڵگرەکان",       href: "/dashboard/suppliers",  icon: <Building2 className="size-4 text-sky-600" /> },
  { label: "گەڕاوەکان",       href: "/dashboard/returns",    icon: <RotateCcw className="size-4 text-rose-500" /> },
];

const roleLabels: Record<string, string> = {
  ADMIN: "بەڕێوەبەر",
  MANAGER: "بەڕێوەبەری ناوەڕاست",
  REP: "نوێنەر",
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommandMenu({ open, onClose }: Props) {
  const router = useRouter();
  const { products, clients, orders, reps, users, warehouses, suppliers } = useData();

  // Close on Escape is handled by shadcn Dialog

  const go = useCallback((href: string) => {
    router.push(href);
    onClose();
  }, [router, onClose]);

  // Keep Ctrl+K working even when dialog is closed
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        // The parent controls `open`, so just prevent default here
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={v => !v && onClose()} title="گەڕانی خێرا" description="بگەڕێ بۆ لاپەڕە، بەرهەم، کڕیار، و نوێنەر...">
      <CommandInput placeholder="بگەڕێ... (Ctrl+K)" />
      <CommandList>
        <CommandEmpty>
          <Search className="size-8 mx-auto mb-2 opacity-20" />
          هیچ ئەنجامێک نەدۆزرایەوە
        </CommandEmpty>

        {/* ── Pages ── */}
        <CommandGroup heading="لاپەڕەکان">
          {navPages.map(p => (
            <CommandItem key={p.href} value={p.label} onSelect={() => go(p.href)} className="gap-2.5">
              {p.icon}
              <span>{p.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* ── Products ── */}
        {products.length > 0 && (
          <CommandGroup heading="بەرهەمەکان">
            {products.slice(0, 5).map(p => (
              <CommandItem key={p.id} value={`${p.name} ${p.sku}`} onSelect={() => go("/dashboard/products")} className="gap-2.5">
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
        {clients.length > 0 && (
          <CommandGroup heading="کڕیارەکان">
            {clients.slice(0, 4).map(c => (
              <CommandItem key={c.id} value={`${c.name} ${c.city} ${c.phone}`} onSelect={() => go("/dashboard/clients")} className="gap-2.5">
                <Users className="size-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{c.name}</span>
                  {c.city && <span className="text-muted-foreground ms-2 text-xs">{c.city}</span>}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* ── Orders ── */}
        {orders.length > 0 && (
          <CommandGroup heading="داواکارییەکان">
            {orders.slice(0, 4).map(o => (
              <CommandItem key={o.id} value={`${o.orderNumber} ${o.clientName}`} onSelect={() => go("/dashboard/orders")} className="gap-2.5">
                <ShoppingCart className="size-4 text-orange-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{o.orderNumber}</span>
                  {o.clientName && <span className="text-muted-foreground ms-2 text-xs">{o.clientName}</span>}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* ── Reps ── */}
        {reps.length > 0 && (
          <CommandGroup heading="نوێنەرەکان">
            {reps.slice(0, 3).map(r => (
              <CommandItem key={r.id} value={`${r.name} ${r.city}`} onSelect={() => go("/dashboard/reps")} className="gap-2.5">
                <UserCog className="size-4 text-violet-600 shrink-0" />
                <span className="flex-1">{r.name}</span>
                {r.city && <span className="text-xs text-muted-foreground">{r.city}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* ── Users ── */}
        {users.length > 0 && (
          <CommandGroup heading="بەکارهێنەرەکان">
            {users.slice(0, 3).map(u => (
              <CommandItem key={u.id} value={`${u.name} ${u.email} ${u.role}`} onSelect={() => go("/dashboard/users")} className="gap-2.5">
                <User className="size-4 text-pink-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{u.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{roleLabels[u.role] || u.role}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* ── Warehouses ── */}
        {warehouses.length > 0 && (
          <CommandGroup heading="کۆگاکان">
            {warehouses.slice(0, 3).map(w => (
              <CommandItem key={w.id} value={`${w.name} ${w.city}`} onSelect={() => go("/dashboard/warehouses")} className="gap-2.5">
                <Warehouse className="size-4 text-amber-600 shrink-0" />
                <span className="flex-1">{w.name}</span>
                {w.city && <span className="text-xs text-muted-foreground">{w.city}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* ── Suppliers ── */}
        {suppliers.length > 0 && (
          <CommandGroup heading="پاڵگرەکان">
            {suppliers.slice(0, 3).map(s => (
              <CommandItem key={s.id} value={`${s.name} ${s.country}`} onSelect={() => go("/dashboard/suppliers")} className="gap-2.5">
                <Building2 className="size-4 text-sky-600 shrink-0" />
                <span className="flex-1">{s.name}</span>
                {s.country && <span className="text-xs text-muted-foreground">{s.country}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
