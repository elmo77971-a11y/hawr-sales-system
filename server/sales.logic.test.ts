import { describe, expect, it } from "vitest";
import { getOutstanding, getPaymentStatus } from "../shared/sales";

describe("sales payment calculations", () => {
  it("classifies fully paid invoices", () => {
    expect(getPaymentStatus(1000, 1000)).toBe("paid");
    expect(getOutstanding(1000, 1000)).toBe(0);
  });

  it("classifies partial and unpaid invoices", () => {
    expect(getPaymentStatus(1000, 250)).toBe("partial");
    expect(getOutstanding(1000, 250)).toBe(750);
    expect(getPaymentStatus(1000, 0)).toBe("unpaid");
  });

  it("never returns a negative outstanding balance", () => {
    expect(getOutstanding(1000, 1250)).toBe(0);
  });
});
