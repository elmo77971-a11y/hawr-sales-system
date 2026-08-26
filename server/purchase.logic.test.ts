import { describe, expect, it } from "vitest";
import { purchaseRemovalDelta, purchaseStockDelta, purchaseUnitPrice } from "../shared/purchaseFlow";

describe("purchase stock flow", () => {
  it("increases stock when an existing item receives more quantity", () => {
    expect(purchaseStockDelta(5, 8)).toBe(3);
  });

  it("reverses only the difference when a purchase quantity is edited", () => {
    expect(purchaseStockDelta(8, 5)).toBe(-3);
  });

  it("removes the full received quantity when an admin deletes a movement", () => {
    expect(purchaseRemovalDelta(4)).toBe(-4);
  });

  it("rejects invalid purchase quantities", () => {
    expect(() => purchaseStockDelta(5, -1)).toThrow();
    expect(() => purchaseRemovalDelta(0)).toThrow();
  });

  it("uses the product selling price for a return supply movement and increases stock", () => {
    const quantity = 2;
    const unitPrice = purchaseUnitPrice("return", "275.00", "120.00");
    expect(unitPrice).toBe("275.00");
    expect(Number(unitPrice) * quantity).toBe(550);
    expect(purchaseStockDelta(5, 5 + quantity)).toBe(quantity);
  });
});
