import { describe, expect, it } from "vitest";
import { assertEnoughStock, stockAfterPurchase, stockAfterSale, validateTransferLocations } from "../shared/inventory";

describe("inventory operations", () => {
  it("reduces stock for a valid sale", () => expect(stockAfterSale(10, 3)).toBe(7));
  it("adds stock for a valid purchase", () => expect(stockAfterPurchase(10, 5)).toBe(15));
  it("rejects sales above available stock", () => expect(() => assertEnoughStock(2, 3)).toThrow("Insufficient stock"));
  it("rejects zero or negative quantities", () => expect(() => stockAfterPurchase(4, 0)).toThrow("positive integer"));
  it("validates transfer source and destination locations", () => {
    expect(validateTransferLocations("المخزن", "المعرض")).toBe(true);
    expect(() => validateTransferLocations("المخزن", "المخزن")).toThrow("different");
  });
});
