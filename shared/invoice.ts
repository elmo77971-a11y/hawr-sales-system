export type LookupProduct = { sku: string; barcode?: string | null; id: number };
export function findProductByCode<T extends LookupProduct>(products: T[], code: string) { const normalized = code.trim().toLowerCase(); return normalized ? products.find(product => product.sku.toLowerCase() === normalized || product.barcode?.toLowerCase() === normalized) : undefined; }
export function netLineTotal(unitPrice: number, quantity: number, discount: number) { return Math.max(0, Number((unitPrice * quantity - discount).toFixed(2))); }
