import { describe, expect, it } from "vitest";
import { stockAfterSale } from "../shared/inventory";
import { searchProducts } from "../shared/inventorySearch";

describe("inventory screen behavior", () => {
  it("shows 3 after selling 2 from stock of 5", () => expect(stockAfterSale(5, 2)).toBe(3));
  it("searches inventory by name, SKU, and barcode", () => {
    const products = [{ name: "خلاط", sku: "MIX-1", barcode: "622001" }, { name: "غلاية", sku: "KET-2", barcode: null }];
    expect(searchProducts(products, "خلاط")).toHaveLength(1);
    expect(searchProducts(products, "ket-2")).toHaveLength(1);
    expect(searchProducts(products, "622001")).toHaveLength(1);
  });
});
