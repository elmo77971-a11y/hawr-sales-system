import type { PendingOperation } from "./offline";

export function reconcileQueue(queue: PendingOperation[], acceptedIds: string[]) {
  const accepted = new Set(acceptedIds);
  return queue.filter(operation => !accepted.has(operation.id));
}

export function shouldRetrySync(error: unknown) { return Boolean(error); }
