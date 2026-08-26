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
