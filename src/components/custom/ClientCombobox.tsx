"use client";
import { useState, useEffect } from "react";
import { Search, Plus, MapPin, Building2, Check, ChevronsUpDown } from "lucide-react";
import type { Client } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";

const typeLabel: Record<string, string> = {
  PHARMACY: "داروخانە",
  HOSPITAL: "نەخۆشخانە",
  CLINIC: "کلینیک",
  WHOLESALE: "کڕینی گشتی",
};

const typeVariantColor: Record<string, string> = {
  PHARMACY: "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/30 dark:border-blue-800",
  HOSPITAL: "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/30 dark:border-red-800",
  CLINIC: "text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-950/30 dark:border-green-800",
  WHOLESALE: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-800",
};

interface Props {
  clients: Client[];
  value: string;
  clientName: string;
  onChange: (id: string, name: string) => void;
  onRequestNew: (name: string) => void;
}

export default function ClientCombobox({ clients, value, clientName, onChange, onRequestNew }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Reset query when popover opens
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const filtered = query.trim()
    ? clients.filter(c =>
        c.isActive && (
          c.name.includes(query) ||
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.city?.includes(query) ||
          c.owner?.includes(query)
        )
      ).slice(0, 8)
    : clients.filter(c => c.isActive).slice(0, 8);

  const selectedClient = clients.find(c => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {selectedClient ? (
          <span className="flex items-center gap-2 truncate">
            <Building2 className="size-3.5 text-muted-foreground shrink-0" />
            {selectedClient.name}
            {selectedClient.city && (
              <span className="text-xs text-muted-foreground">— {selectedClient.city}</span>
            )}
          </span>
        ) : clientName ? (
          <span className="flex items-center gap-2 truncate">
            <Plus className="size-3.5 text-primary shrink-0" />
            <span className="text-primary">{clientName}</span>
            <span className="text-xs text-muted-foreground">(نوێ)</span>
          </span>
        ) : (
          <span className="text-muted-foreground">ناوی کڕیار بگەڕێ...</span>
        )}
        <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="گەڕان بە ناو، شار، خاوەن..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              <Search className="size-6 mx-auto mb-1.5 opacity-20" />
              <span className="text-xs">هیچ کڕیارێک نەدۆزرایەوە</span>
            </CommandEmpty>

            <CommandGroup>
              {filtered.map(c => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  onSelect={() => {
                    onChange(c.id, c.name);
                    setOpen(false);
                  }}
                  className="gap-2.5 py-2"
                >
                  <div className={cn(
                    "size-8 rounded-lg flex items-center justify-center shrink-0",
                    typeVariantColor[c.type] || "bg-muted text-muted-foreground"
                  )}>
                    <Building2 className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{c.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {c.city && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="size-2.5" />{c.city}
                        </span>
                      )}
                      <Badge variant="outline" className={cn(
                        "text-[9px] px-1.5 py-0 h-4 font-semibold",
                        typeVariantColor[c.type]
                      )}>
                        {typeLabel[c.type] || c.type}
                      </Badge>
                    </div>
                  </div>
                  {value === c.id && (
                    <Check className="size-4 text-primary shrink-0" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            {/* Create new client */}
            <CommandGroup>
              <CommandItem
                value="__create_new__"
                onSelect={() => {
                  setOpen(false);
                  onRequestNew(query);
                }}
                className="gap-2.5 py-2"
              >
                <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shrink-0">
                  <Plus className="size-3.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-primary">
                    {query.trim() ? `داوا بکە بۆ: "${query}"` : "زیادکردنی کڕیاری نوێ"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">داواکاری دەنێردرێت بۆ بەرپرسان</div>
                </div>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
