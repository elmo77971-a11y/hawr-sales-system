import { describe, expect, it } from "vitest";
import { normalizeReportFilters } from "../shared/report";
import { netLineTotal } from "../shared/invoice";

describe("report and receipt filters", () => {
  it("normalizes date and seller filters", () => expect(normalizeReportFilters({ from: "2026-08-01", to: "2026-08-31", sellerId: "7" })).toEqual({ from: "2026-08-01", to: "2026-08-31", sellerId: 7 }));
  it("keeps invalid seller filters empty", () => expect(normalizeReportFilters({ sellerId: "0" })).toEqual({ from: undefined, to: undefined, sellerId: undefined }));
  it("calculates the receipt line total after discount", () => expect(netLineTotal(120, 2, 20)).toBe(220));
});
