"use client";
import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportCSV, exportPDF, type ExportColumn } from "@/lib/export";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

interface ExportButtonProps {
  data: Record<string, unknown>[];
  columns: ExportColumn[];
  filename: string;
  title: string;
}

export default function ExportButton({ data, columns, filename, title }: ExportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5" />
        }
      >
        <Download className="size-3.5" />
        دەرهێنان
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 p-1" dir="rtl">
        <Button variant="ghost" size="sm"
          onClick={() => { exportCSV(data, columns, filename); setOpen(false); }}
          className="w-full justify-start gap-2 px-3 py-2 text-sm"
        >
          <FileSpreadsheet className="size-3.5 text-emerald-500" />
          CSV دەرهێنان
        </Button>
        <Button variant="ghost" size="sm"
          onClick={() => { exportPDF(data, columns, title); setOpen(false); }}
          className="w-full justify-start gap-2 px-3 py-2 text-sm"
        >
          <FileText className="size-3.5 text-red-500" />
          PDF چاپکردن
        </Button>
      </PopoverContent>
    </Popover>
  );
}
