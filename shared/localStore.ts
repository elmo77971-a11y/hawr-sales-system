export type LocalEntity = { id: string; name: string; detail?: string; amount?: number; updatedAt: number };
export type LocalStoreKey = "products" | "customers" | "suppliers" | "expenses" | "sales" | "purchases" | "installments";
export type LocalState = Record<LocalStoreKey, LocalEntity[]>;

const KEY = "arousain-local-state-v1";
const emptyState = (): LocalState => ({ products: [], customers: [], suppliers: [], expenses: [], sales: [], purchases: [], installments: [] });

export function loadLocalState(): LocalState {
  if (typeof localStorage === "undefined") return emptyState();
  try { return { ...emptyState(), ...(JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<LocalState>) }; } catch { return emptyState(); }
}

export function loadLocalCollection(key: LocalStoreKey) { return loadLocalState()[key]; }
export function saveLocalCollection(key: LocalStoreKey, values: LocalEntity[]) { if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify({ ...loadLocalState(), [key]: values })); }
