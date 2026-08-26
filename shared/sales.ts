export type PaymentStatus = "paid" | "partial" | "unpaid";

export function getPaymentStatus(total: number, paid: number): PaymentStatus {
  if (paid <= 0) return "unpaid";
  if (paid >= total) return "paid";
  return "partial";
}

export function getOutstanding(total: number, paid: number): number {
  return Math.max(0, Number((total - paid).toFixed(2)));
}
