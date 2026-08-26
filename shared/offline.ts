export type PendingOperation = { id: string; type: string; payload: unknown; createdAt: number };

const QUEUE_KEY = "arousain-pending-operations";

export function readPendingOperations(): PendingOperation[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]") as PendingOperation[]; } catch { return []; }
}

export function enqueueOperation(type: string, payload: unknown): PendingOperation {
  const operation = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type, payload, createdAt: Date.now() };
  if (typeof localStorage !== "undefined") localStorage.setItem(QUEUE_KEY, JSON.stringify([...readPendingOperations(), operation]));
  return operation;
}

export function clearPendingOperations() { if (typeof localStorage !== "undefined") localStorage.removeItem(QUEUE_KEY); }
