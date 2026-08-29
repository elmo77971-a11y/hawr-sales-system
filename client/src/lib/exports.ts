import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export type ReportRow = { البيان: string; القيمة: string; الملاحظات: string };
type ExportValue = string | number;
type ExportRow = Record<string, ExportValue>;

const makeWorkbook = (rows: ExportRow[], sheetName: string, filename: string, widths: number[]) => {
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = widths.map(wch => ({ wch }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, filename);
};

export function exportReportToExcel(rows: ReportRow[], filename = "تقرير-معرض-حور.xlsx") { makeWorkbook(rows, "التقرير", filename, [28, 22, 28]); }
export function exportProductsToExcel(products: Array<{ name: string; sku: string; barcode?: string | null; unit?: string; location?: string | null; stockQty: number; salePrice: string; minStock?: number }>, filename = "منتجات-معرض-حور.xlsx") { makeWorkbook(mapProductsForExport(products), "المنتجات", filename, [28, 18, 18, 12, 12, 16, 14, 14]); }

export function mapProductsForExport(products: Array<{ name: string; sku: string; barcode?: string | null; unit?: string; location?: string | null; stockQty: number; salePrice: string; minStock?: number }>) { return products.map(product => ({ "اسم المنتج": product.name, "الكود": product.sku, "الباركود": product.barcode || "", "الوحدة": product.unit || "قطعة", "العدد": product.stockQty, "السعر": Number(product.salePrice), "المكان": product.location || "المخزن", "الحد الأدنى": product.minStock || 0 })); }

export function mapSalesForExport(sales: Array<{ invoiceNo: string; customerName?: string | null; sellerCode?: string | null; subtotal: string; paidAmount: string; status: string; createdAt: Date | string | number }>) { return sales.map(sale => ({ "رقم الفاتورة": sale.invoiceNo, "اسم المشتري": sale.customerName || "", "كود البائع": sale.sellerCode || "", "التاريخ والوقت": new Date(sale.createdAt).toLocaleString("ar-EG"), "الإجمالي": Number(sale.subtotal), "المدفوع": Number(sale.paidAmount), "المتبقي": Math.max(0, Number(sale.subtotal) - Number(sale.paidAmount)), "الحالة": sale.status === "paid" ? "مدفوعة" : sale.status === "partial" ? "جزئي" : "غير مدفوعة" })); }
export function exportSalesToExcel(sales: Array<{ invoiceNo: string; customerName?: string | null; sellerCode?: string | null; subtotal: string; paidAmount: string; status: string; createdAt: Date | string | number }>, filename = "مبيعات-معرض-حور.xlsx") { makeWorkbook(mapSalesForExport(sales), "المبيعات", filename, [18, 24, 16, 24, 14, 14, 14, 14]); }

export function mapPurchasesForExport(items: Array<{ productName: string; sku: string; unit: string; quantity: number; unitPrice: string; total: string; movementType?: string | null; invoiceNo?: string | null; createdAt: Date | string | number }>) { return items.map(item => ({ "نوع الحركة": item.movementType === "return" ? "توريد مرتجع" : "توريد عادي", "المرجع": item.invoiceNo || "", "اسم المنتج": item.productName, "الكود": item.sku, "الوحدة": item.unit, "الكمية": item.quantity, "السعر": Number(item.unitPrice), "الإجمالي": Number(item.total), "التاريخ والوقت": new Date(item.createdAt).toLocaleString("ar-EG") })); }
export function exportPurchasesToExcel(items: Array<{ productName: string; sku: string; unit: string; quantity: number; unitPrice: string; total: string; movementType?: string | null; invoiceNo?: string | null; createdAt: Date | string | number }>, filename = "مشتريات-معرض-حور.xlsx") { makeWorkbook(mapPurchasesForExport(items), "المشتريات", filename, [16, 18, 26, 18, 12, 12, 14, 16, 24]); }

const excelValue = (row: Record<string, unknown>, names: string[], fallback = "") => {
  for (const name of names) { const value = row[name]; if (value !== undefined && value !== null && String(value).trim() !== "") return value; }
  return fallback;
};
const excelNumber = (value: unknown, fallback = 0) => { const normalized = String(value ?? "").replace(/[،,]/g, "").trim(); const number = Number(normalized); return Number.isFinite(number) ? number : fallback; };
export async function importProductsFromExcel(file: File) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false, raw: false });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0] || ""];
  if (!firstSheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "", raw: false, blankrows: false });
  return rows.map((row, index) => ({
    rowNumber: index + 2,
    name: String(excelValue(row, ["اسم المنتج", "اسم الصنف", "المنتج", "name"])).trim(),
    sku: String(excelValue(row, ["الكود", "كود المنتج", "SKU", "sku"])).trim(),
    barcode: String(excelValue(row, ["الباركود", "Barcode", "barcode"])).trim() || undefined,
    unit: String(excelValue(row, ["الوحدة", "unit"], "قطعة")).trim() || "قطعة",
    location: String(excelValue(row, ["المكان", "الموقع", "location"], "المخزن")).trim() || "المخزن",
    stockQty: Math.max(0, Math.trunc(excelNumber(excelValue(row, ["العدد", "الكمية", "stockQty"])))),
    salePrice: String(excelValue(row, ["السعر", "سعر البيع", "salePrice"], "0")).trim() || "0",
    minStock: Math.max(0, Math.trunc(excelNumber(excelValue(row, ["الحد الأدنى", "حد التنبيه", "minStock"]))))
  })).filter(row => row.name || row.sku);
}

function escapeHtml(value: unknown) { return String(value).replace(/[&<>\"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[character] || character)); }

async function exportTableToPdf(title: string, rows: ExportRow[], filename: string) {
  const container = document.createElement("section");
  container.dir = "rtl";
  container.style.cssText = "position:fixed;left:-10000px;top:0;width:1100px;padding:48px;background:#fff;color:#0f172a;font-family:Arial,sans-serif";
  const columns = rows.length ? Object.keys(rows[0]) : ["البيان"];
  container.innerHTML = `<h1 style="font-size:28px;margin:0 0 8px">معرض حور للأدوات المنزلية</h1><p style="font-size:20px;font-weight:bold;margin:0 0 24px">${escapeHtml(title)}</p><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="background:#f1f5f9">${columns.map(column => `<th style="text-align:right;padding:10px;border:1px solid #cbd5e1">${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${columns.map(column => `<td style="padding:10px;border:1px solid #cbd5e1">${escapeHtml(row[column] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  document.body.appendChild(container);
  try {
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: "#ffffff" });
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const margin = 28;
    const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;
    const imageHeight = (canvas.height * pageWidth) / canvas.width;
    let offset = 0;
    while (offset < imageHeight) {
      if (offset > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin - offset, pageWidth, imageHeight);
      offset += pageHeight;
    }
    pdf.save(filename);
  } finally { container.remove(); }
}

export function exportReportToPdf(rows: ReportRow[], filename = "تقرير-معرض-حور.pdf") { return exportTableToPdf("تقرير مالي ومبيعات", rows, filename); }
export function exportProductsToPdf(products: Array<{ name: string; sku: string; barcode?: string | null; unit?: string; location?: string | null; stockQty: number; salePrice: string; minStock?: number }>, filename = "منتجات-معرض-حور.pdf") { return exportTableToPdf("تقرير المخزون والمنتجات", mapProductsForExport(products), filename); }
export function exportSalesToPdf(sales: Array<{ invoiceNo: string; customerName?: string | null; sellerCode?: string | null; subtotal: string; paidAmount: string; status: string; createdAt: Date | string | number }>, filename = "مبيعات-معرض-حور.pdf") { return exportTableToPdf("تقرير فواتير المبيعات", mapSalesForExport(sales), filename); }
export function exportPurchasesToPdf(items: Array<{ productName: string; sku: string; unit: string; quantity: number; unitPrice: string; total: string; movementType?: string | null; invoiceNo?: string | null; createdAt: Date | string | number }>, filename = "مشتريات-معرض-حور.pdf") { return exportTableToPdf("تقرير أصناف التوريد", mapPurchasesForExport(items), filename); }
