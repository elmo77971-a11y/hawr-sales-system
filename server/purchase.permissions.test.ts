import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function callerForRole(role: "admin" | "user") {
  const now = new Date();
  const ctx: TrpcContext = {
    user: { id: 7, openId: `${role}-purchase-test`, name: role, email: `${role}@test.local`, loginMethod: "test", role, createdAt: now, updatedAt: now, lastSignedIn: now },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe("purchase movement permissions", () => {
  it("blocks regular users before touching the database", async () => {
    await expect(callerForRole("user").purchases.deleteItem({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(callerForRole("user").purchases.updateItem({ id: 1, quantity: 2, unitPrice: "10" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows the admin procedure to pass authorization", async () => {
    await expect(callerForRole("admin").purchases.deleteItem({ id: 1 })).rejects.not.toMatchObject({ code: "FORBIDDEN" });
  });
});
