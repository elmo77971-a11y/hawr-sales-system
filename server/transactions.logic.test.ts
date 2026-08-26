import { describe, expect, it } from "vitest";
import { calculateInvoiceTotal, installmentSchedule, summarizePayment } from "../shared/transactions";
import { stockAfterPurchase } from "../shared/inventory";

describe("transaction calculations", () => {
  it("calculates invoice totals and outstanding amounts", () => {
    expect(calculateInvoiceTotal([{ quantity: 2, unitPrice: 1250 }, { quantity: 1, unitPrice: 500 }])).toBe(3000);
    expect(summarizePayment(3000, 1000)).toEqual({ status: "partial", outstanding: 2000 });
  });
  it("increases an existing product stock when purchased again", () => {
    expect(stockAfterPurchase(5, 2)).toBe(7);
  });
  it("creates a balanced installment schedule", () => {
    expect(installmentSchedule(1000, 100, 3)).toEqual([300, 300, 300]);
    expect(installmentSchedule(1000, 0, 3).reduce((a, b) => a + b, 0)).toBe(1000);
  });
});
