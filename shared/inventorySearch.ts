export type SearchableProduct = { name: string; sku: string; barcode?: string | null };
export function searchProducts<T extends SearchableProduct>(products: T[], query: string) { const normalized = query.trim().toLowerCase(); return products.filter(product => !normalized || [product.name, product.sku, product.barcode || ""].some(value => value.toLowerCase().includes(normalized))); }
