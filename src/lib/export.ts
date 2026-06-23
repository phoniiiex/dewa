// Export utilities for CSV and PDF
export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: unknown) => string;
}

export function exportCSV(data: Record<string, unknown>[], columns: ExportColumn[], filename: string) {
  const BOM = "\uFEFF";
  const header = columns.map(c => c.label).join(",");
  const rows = data.map(row =>
    columns.map(col => {
      const raw = row[col.key];
      const val = col.format ? col.format(raw) : String(raw ?? "");
      return `"${val.replace(/"/g, '""')}"`;
    }).join(",")
  );
  const csv = BOM + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPDF(data: Record<string, unknown>[], columns: ExportColumn[], title: string) {
  const rows = data.map(row =>
    columns.map(col => {
      const raw = row[col.key];
      return col.format ? col.format(raw) : String(raw ?? "");
    })
  );
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ckb"><head><meta charset="UTF-8"/><title>${title}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Sans Arabic',sans-serif;direction:rtl;padding:32px;background:white;color:#1a1a2e;font-size:13px}
h1{font-size:20px;font-weight:800;margin-bottom:20px;color:#1A1A2E}
table{width:100%;border-collapse:collapse}thead{background:#1A1A2E;color:white}
th{padding:10px 14px;font-size:12px;font-weight:700;text-align:right}
td{padding:10px 14px;font-size:13px;border-bottom:1px solid #E9ECEF}
tr:nth-child(even){background:#F8F9FA}
.footer{margin-top:24px;text-align:center;font-size:11px;color:#ADB5BD}
@media print{body{padding:16px}}</style></head><body>
<h1>${title}</h1><table><thead><tr>${columns.map(c => `<th>${c.label}</th>`).join("")}</tr></thead>
<tbody>${rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table>
<div class="footer">دروستکراوە بە سیستەمی دەوا — ${new Date().toLocaleDateString("ckb")}</div></body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 400);
}
