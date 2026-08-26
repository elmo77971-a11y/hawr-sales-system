import { describe, expect, it } from "vitest";
import { isLowStock } from "../shared/inventoryAlerts";

describe("product tools", () => {
  it("flags a product when stock reaches its minimum", () => {
    expect(isLowStock(2, 3)).toBe(true);
    expect(isLowStock(4, 3)).toBe(false);
  });
  it("keeps zero minimum valid without flagging positive stock", () => {
    expect(isLowStock(0, 0)).toBe(true);
    expect(isLowStock(1, 0)).toBe(false);
  });
});
