import { describe, expect, it } from "vitest";
import { mapPurchasesForExport, mapSalesForExport } from "./exports";

describe("Excel export mappings", () => {
  it("maps sales with invoice, buyer, seller, totals, and remaining amount", () => {
    const [row] = mapSalesForExport([{ invoiceNo: "S-1", customerName: "أحمد", sellerCode: "EMP-7", subtotal: "120", paidAmount: "80", status: "partial", createdAt: "2026-08-26T10:00:00Z" }]);
    expect(row).toMatchObject({ "رقم الفاتورة": "S-1", "اسم المشتري": "أحمد", "كود البائع": "EMP-7", "الإجمالي": 120, "المدفوع": 80, "المتبقي": 40, "الحالة": "جزئي" });
  });

  it("labels returned supply movements separately in purchase exports", () => {
    const [row] = mapPurchasesForExport([{ productName: "خلاط", sku: "SKU-1", unit: "قطعة", quantity: 2, unitPrice: "350", total: "700", movementType: "return", invoiceNo: "P-1", createdAt: "2026-08-26T10:00:00Z" }]);
    expect(row).toMatchObject({ "نوع الحركة": "توريد مرتجع", "المرجع": "P-1", "اسم المنتج": "خلاط", "الكمية": 2, "السعر": 350, "الإجمالي": 700 });
  });
});
