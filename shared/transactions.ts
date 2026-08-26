import { getPaymentStatus, getOutstanding, type PaymentStatus } from "./sales";

export type LineItem = { quantity: number; unitPrice: number };
export function calculateInvoiceTotal(items: LineItem[]) { return Number(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2)); }
export function summarizePayment(total: number, paid: number): { status: PaymentStatus; outstanding: number } { return { status: getPaymentStatus(total, paid), outstanding: getOutstanding(total, paid) }; }
export function installmentSchedule(total: number, paid: number, count: number) { if (!Number.isInteger(count) || count <= 0) throw new Error("Invalid installment count"); const remaining = getOutstanding(total, paid); const base = Number((remaining / count).toFixed(2)); return Array.from({ length: count }, (_, index) => Number((index === count - 1 ? remaining - base * (count - 1) : base).toFixed(2))); }
