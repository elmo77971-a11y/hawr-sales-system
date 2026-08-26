import { describe, expect, it } from "vitest";
import { buildReceiptHtml } from "../client/src/lib/receipt";

describe("receipt printer", () => {
  it("builds an Arabic 80mm receipt containing invoice lines and totals", () => {
    const html = buildReceiptHtml({ invoiceNo: "S-100", mode: "sale", lines: [{ name: "خلاط", quantity: 2, unitPrice: "100", discount: 10 }], total: 190, paid: 100 });
    expect(html).toContain("size:80mm");
    expect(html).toContain("S-100");
    expect(html).toContain("خلاط");
    expect(html).toContain("معرض حور للأدوات المنزلية");
  });
});
