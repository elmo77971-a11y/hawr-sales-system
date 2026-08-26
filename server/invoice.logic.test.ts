import { describe, expect, it } from "vitest";
import { findProductByCode, netLineTotal } from "../shared/invoice";

describe("invoice line helpers", () => {
  const products = [{ id: 1, sku: "SKU-1", barcode: "622100001", name: "خلاط" }, { id: 2, sku: "SKU-2", barcode: null, name: "غلاية" }];
  it("finds by barcode or SKU case-insensitively", () => {
    expect(findProductByCode(products, "622100001")?.id).toBe(1);
    expect(findProductByCode(products, "sku-2")?.id).toBe(2);
    expect(findProductByCode(products, "missing")).toBeUndefined();
  });
  it("calculates a discounted multi-quantity line", () => expect(netLineTotal(100, 3, 25)).toBe(275));
});
