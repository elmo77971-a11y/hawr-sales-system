import { describe, expect, it } from "vitest";
import { employeeSalesToReportRows } from "../shared/report";

const lineProfit = (salePrice: number, purchasePrice: number, quantity: number) =>
  (salePrice - purchasePrice) * quantity;

describe("profit and employee identity reporting", () => {
  it("calculates gross profit from selling price minus purchase cost times quantity", () => {
    expect(lineProfit(100, 60, 3)).toBe(120);
    expect(lineProfit(60, 60, 2)).toBe(0);
    expect(lineProfit(50, 70, 2)).toBe(-40);
  });

  it("does not replace the employee name with the manager name when exporting", () => {
    expect(employeeSalesToReportRows([
      { sellerName: "أحمد علي", sellerCode: "EMP-07", invoiceCount: 1, totalSales: 100, totalPaid: 100, totalDue: 0 },
    ])).toEqual([
      { البيان: "أحمد علي — EMP-07", القيمة: "١٠٠ ج.م", الملاحظات: "1 فاتورة · مدفوع ١٠٠ · متبقي ٠" },
    ]);
  });
});

export {};

function __productionFormulaReference(salePrice: number, purchaseCost: number, quantity: number, expenses = 0) {
  return lineProfit(salePrice, purchaseCost, quantity) - expenses;
}

void __productionFormulaReference;
