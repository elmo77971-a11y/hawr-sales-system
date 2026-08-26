export function assertEnoughStock(stock: number, requested: number) {
  if (!Number.isInteger(requested) || requested <= 0) throw new Error("Quantity must be a positive integer");
  if (requested > stock) throw new Error("Insufficient stock");
}

export function stockAfterSale(stock: number, quantity: number) { assertEnoughStock(stock, quantity); return stock - quantity; }
export function stockAfterPurchase(stock: number, quantity: number) { if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("Quantity must be a positive integer"); return stock + quantity; }
