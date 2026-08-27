import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const routers = fs.readFileSync(path.join(process.cwd(), "server/routers.ts"), "utf8");

describe("employee administration access", () => {
  it("requires the manager role for listing, creating, and updating employees", () => {
    expect(routers).toContain("list: adminProcedure.query(() => listEmployees())");
    expect(routers).toContain("create: adminProcedure.input");
    expect(routers).toContain("update: adminProcedure.input");
  });
});
