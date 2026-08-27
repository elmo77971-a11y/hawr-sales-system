import { describe, expect, it } from "vitest";
import { employeeSalesToReportRows, normalizeReportFilters } from "../shared/report";
import { netLineTotal } from "../shared/invoice";

describe("report and receipt filters", () => {
  it("normalizes date and seller filters", () => expect(normalizeReportFilters({ from: "2026-08-01", to: "2026-08-31", sellerId: "7" })).toEqual({ from: "2026-08-01", to: "2026-08-31", sellerId: 7 }));
  it("keeps invalid seller filters empty", () => expect(normalizeReportFilters({ sellerId: "0" })).toEqual({ from: undefined, to: undefined, sellerId: undefined }));
  it("calculates the receipt line total after discount", () => expect(netLineTotal(120, 2, 20)).toBe(220));
  it("formats employee sales rows for export", () => expect(employeeSalesToReportRows([{ sellerName: "أحمد", sellerCode: "A1", invoiceCount: 2, totalSales: 1500, totalPaid: 1000, totalDue: 500 }])).toEqual([{ البيان: "أحمد — A1", القيمة: "١٬٥٠٠ ج.م", الملاحظات: "2 فاتورة · مدفوع ١٬٠٠٠ · متبقي ٥٠٠" }]));
});
