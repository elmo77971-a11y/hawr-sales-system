import { describe, expect, it } from "vitest";
import { can } from "../shared/permissions";

describe("basic permissions", () => {
  it("gives admins access to every permission", () => {
    expect(can("admin", "reports")).toBe(true);
    expect(can("admin", "settings")).toBe(true);
  });
  it("limits standard users from reports, settings, inventory, and purchases", () => {
    expect(can("user", "sales")).toBe(true);
    expect(can("user", "customers")).toBe(true);
    expect(can("user", "reports")).toBe(false);
    expect(can("user", "settings")).toBe(false);
    expect(can("user", "inventory")).toBe(false);
    expect(can("user", "purchases")).toBe(false);
    expect(can("admin", "inventory")).toBe(true);
    expect(can("admin", "purchases")).toBe(true);
  });
});
