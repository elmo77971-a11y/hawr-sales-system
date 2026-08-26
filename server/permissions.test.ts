import { describe, expect, it } from "vitest";
import { can } from "../shared/permissions";

describe("basic permissions", () => {
  it("gives admins access to every permission", () => {
    expect(can("admin", "reports")).toBe(true);
    expect(can("admin", "settings")).toBe(true);
  });
  it("limits standard users from reports and settings", () => {
    expect(can("user", "sales")).toBe(true);
    expect(can("user", "reports")).toBe(false);
    expect(can("user", "settings")).toBe(false);
  });
});
