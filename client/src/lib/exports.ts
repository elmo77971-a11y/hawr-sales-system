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

export function exportProductsToExcel(products: Array<{ name: string; sku: string; barcode?: string | null; unit?: string; location?: string | null; stockQty: number; salePrice: string; minStock?: number }>, filename = "منتجات-معرض-حور.xlsx") { const rows = products.map(product => ({ "اسم المنتج": product.name, "الكود": product.sku, "الباركود": product.barcode || "", "الوحدة": product.unit || "قطعة", "العدد": product.stockQty, "السعر": product.salePrice, "المكان": product.location || "المخزن", "الحد الأدنى": product.minStock || 0 })); const sheet = XLSX.utils.json_to_sheet(rows); sheet["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 14 }]; const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, "المنتجات"); XLSX.writeFile(workbook, filename); }

export function mapSalesForExport(sales: Array<{ invoiceNo: string; customerName?: string | null; sellerCode?: string | null; subtotal: string; paidAmount: string; status: string; createdAt: Date | string | number }>) { return sales.map(sale => ({ "رقم الفاتورة": sale.invoiceNo, "اسم المشتري": sale.customerName || "", "كود البائع": sale.sellerCode || "", "التاريخ والوقت": new Date(sale.createdAt).toLocaleString("ar-EG"), "الإجمالي": Number(sale.subtotal), "المدفوع": Number(sale.paidAmount), "المتبقي": Math.max(0, Number(sale.subtotal) - Number(sale.paidAmount)), "الحالة": sale.status === "paid" ? "مدفوعة" : sale.status === "partial" ? "جزئي" : "غير مدفوعة" })); }

export function exportSalesToExcel(sales: Array<{ invoiceNo: string; customerName?: string | null; sellerCode?: string | null; subtotal: string; paidAmount: string; status: string; createdAt: Date | string | number }>, filename = "مبيعات-معرض-حور.xlsx") { const rows = mapSalesForExport(sales); const sheet = XLSX.utils.json_to_sheet(rows); sheet["!cols"] = [{ wch: 18 }, { wch: 24 }, { wch: 16 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]; const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, "المبيعات"); XLSX.writeFile(workbook, filename); }

export function mapPurchasesForExport(items: Array<{ productName: string; sku: string; unit: string; quantity: number; unitPrice: string; total: string; movementType?: string | null; invoiceNo?: string | null; createdAt: Date | string | number }>) { return items.map(item => ({ "نوع الحركة": item.movementType === "return" ? "توريد مرتجع" : "توريد عادي", "المرجع": item.invoiceNo || "", "اسم المنتج": item.productName, "الكود": item.sku, "الوحدة": item.unit, "الكمية": item.quantity, "السعر": Number(item.unitPrice), "الإجمالي": Number(item.total), "التاريخ والوقت": new Date(item.createdAt).toLocaleString("ar-EG") })); }

export function exportPurchasesToExcel(items: Array<{ productName: string; sku: string; unit: string; quantity: number; unitPrice: string; total: string; movementType?: string | null; invoiceNo?: string | null; createdAt: Date | string | number }>, filename = "مشتريات-معرض-حور.xlsx") { const rows = mapPurchasesForExport(items); const sheet = XLSX.utils.json_to_sheet(rows); sheet["!cols"] = [{ wch: 16 }, { wch: 18 }, { wch: 26 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 24 }]; const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, "المشتريات"); XLSX.writeFile(workbook, filename); }

export async function importProductsFromExcel(file: File) { const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" }); const firstSheet = workbook.Sheets[workbook.SheetNames[0] || ""]; const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" }); return rows.map((row, index) => ({ rowNumber: index + 2, name: String(row["اسم المنتج"] || row.name || "").trim(), sku: String(row["الكود"] || row.sku || "").trim(), barcode: String(row["الباركود"] || row.barcode || "").trim() || undefined, unit: String(row["الوحدة"] || row.unit || "قطعة").trim(), location: String(row["المكان"] || row.location || "المخزن").trim(), stockQty: Number(row["العدد"] || row.stockQty || 0), salePrice: String(row["السعر"] || row.salePrice || "0").trim(), minStock: Number(row["الحد الأدنى"] || row.minStock || 0) })).filter(row => row.name || row.sku); }

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
