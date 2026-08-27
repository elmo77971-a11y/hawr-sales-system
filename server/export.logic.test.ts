import { describe, expect, it } from "vitest";
import { mapProductsForExport, mapSalesForExport, mapPurchasesForExport } from "../client/src/lib/exports";

describe("export mappings", () => {
  it("maps inventory fields including location and minimum stock", () => {
    expect(mapProductsForExport([{ name: "خلاط", sku: "SKU-1", barcode: "123", unit: "قطعة", location: "المعرض", stockQty: 5, salePrice: "250", minStock: 2 }])).toEqual([{ "اسم المنتج": "خلاط", "الكود": "SKU-1", "الباركود": "123", "الوحدة": "قطعة", "العدد": 5, "السعر": 250, "المكان": "المعرض", "الحد الأدنى": 2 }]);
  });

  it("calculates the remaining amount in sales exports", () => {
    expect(mapSalesForExport([{ invoiceNo: "INV-1", customerName: "أحمد", sellerCode: "S1", subtotal: "1000", paidAmount: "400", status: "partial", createdAt: "2026-08-27T09:00:00.000Z" }])[0]["المتبقي"]).toBe(600);
  });

  it("labels return supply movements without changing source quantities", () => {
    const row = mapPurchasesForExport([{ productName: "طقم", sku: "SKU-2", unit: "طقم", quantity: 2, unitPrice: "500", total: "1000", movementType: "return", invoiceNo: "RET-1", createdAt: "2026-08-27T09:00:00.000Z" }])[0];
    expect(row["نوع الحركة"]).toBe("توريد مرتجع");
    expect(row["الكمية"]).toBe(2);
    expect(row["الإجمالي"]).toBe(1000);
  });
});
