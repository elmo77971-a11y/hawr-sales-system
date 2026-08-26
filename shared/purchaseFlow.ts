export type PurchaseMovementType = "purchase" | "return";

export function purchaseStockDelta(previousQuantity: number, nextQuantity: number) {
  if (!Number.isInteger(previousQuantity) || !Number.isInteger(nextQuantity) || previousQuantity < 0 || nextQuantity < 0) {
    throw new Error("كميات التوريد يجب أن تكون أعدادًا صحيحة غير سالبة");
  }
  return nextQuantity - previousQuantity;
}

export function purchaseRemovalDelta(quantity: number) {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("كمية التوريد غير صالحة");
  return -quantity;
}

export function purchaseUnitPrice(movementType: PurchaseMovementType | undefined, salePrice: string | null | undefined, enteredPrice: string) {
  return movementType === "return" ? String(salePrice ?? enteredPrice) : enteredPrice;
}

export function purchaseMovementLabel(movementType: PurchaseMovementType | undefined) {
  return movementType === "return" ? "توريد مرتجع" : "توريد عادي";
}

export function purchaseLocation(location?: string | null) {
  return location?.trim() || "المخزن";
}
