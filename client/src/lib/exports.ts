import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export type ReportRow = { البيان: string; القيمة: string; الملاحظات: string };

export function exportReportToExcel(rows: ReportRow[], filename = "تقرير-معرض-حور.xlsx") {
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = [{ wch: 28 }, { wch: 22 }, { wch: 28 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "التقرير");
  XLSX.writeFile(workbook, filename);
}

export async function exportReportToPdf(rows: ReportRow[], filename = "تقرير-معرض-حور.pdf") {
  const container = document.createElement("section");
  container.dir = "rtl";
  container.style.cssText = "position:fixed;left:-10000px;top:0;width:900px;padding:48px;background:#fff;color:#0f172a;font-family:Arial,sans-serif";
  container.innerHTML = `<h1 style="font-size:28px;margin:0 0 8px">معرض حور للأدوات المنزلية</h1><p style="color:#64748b;margin:0 0 28px">تقرير مالي ومبيعات</p><table style="width:100%;border-collapse:collapse;font-size:18px"><thead><tr style="background:#f1f5f9"><th style="text-align:right;padding:14px;border:1px solid #cbd5e1">البيان</th><th style="text-align:right;padding:14px;border:1px solid #cbd5e1">القيمة</th><th style="text-align:right;padding:14px;border:1px solid #cbd5e1">الملاحظات</th></tr></thead><tbody>${rows.map(row => `<tr><td style="padding:14px;border:1px solid #cbd5e1">${row.البيان}</td><td style="padding:14px;border:1px solid #cbd5e1">${row.القيمة}</td><td style="padding:14px;border:1px solid #cbd5e1">${row.الملاحظات}</td></tr>`).join("")}</tbody></table>`;
  document.body.appendChild(container);
  try {
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: "#ffffff" });
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const width = pdf.internal.pageSize.getWidth() - 56;
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 28, 28, width, Math.min(height, pdf.internal.pageSize.getHeight() - 56));
    pdf.save(filename);
  } finally { container.remove(); }
}
