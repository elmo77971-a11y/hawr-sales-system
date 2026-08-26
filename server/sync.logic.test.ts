import { describe, expect, it } from "vitest";
import { reconcileQueue, shouldRetrySync } from "../shared/sync";

describe("sync reconciliation", () => {
  it("keeps only operations not acknowledged by the server", () => {
    const queue = [{ id: "a", type: "sale", payload: {}, createdAt: 1 }, { id: "b", type: "expense", payload: {}, createdAt: 2 }];
    expect(reconcileQueue(queue, ["a"])).toEqual([queue[1]]);
  });
  it("allows failed sync operations to be retried", () => expect(shouldRetrySync(new Error("offline"))).toBe(true));
});
