export type ReportFilterInput = { from?: string; to?: string; sellerId?: string };
export function normalizeReportFilters(input: ReportFilterInput) { return { from: input.from || undefined, to: input.to || undefined, sellerId: input.sellerId && Number(input.sellerId) > 0 ? Number(input.sellerId) : undefined }; }

export type EmployeeSalesRow = { sellerName: string; sellerCode: string; invoiceCount: number; totalSales: number; totalPaid: number; totalDue: number };
export function employeeSalesToReportRows(rows: EmployeeSalesRow[]) { return rows.map(row => ({ البيان: `${row.sellerName} — ${row.sellerCode}`, القيمة: `${Number(row.totalSales).toLocaleString("ar-EG")} ج.م`, الملاحظات: `${row.invoiceCount} فاتورة · مدفوع ${Number(row.totalPaid).toLocaleString("ar-EG")} · متبقي ${Number(row.totalDue).toLocaleString("ar-EG")}` })); }
