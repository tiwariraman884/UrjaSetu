/**
 * In-memory payment store (for demo/test).
 * In production, use PostgreSQL via the FastAPI backend.
 */
import type { PaymentRecord } from "../types";

const store = new Map<string, PaymentRecord>();

export function createPayment(record: PaymentRecord): void {
  store.set(record.paymentId, record);
}

export function getPayment(id: string): PaymentRecord | undefined {
  return store.get(id);
}

export function updatePayment(id: string, updates: Partial<PaymentRecord>): PaymentRecord | undefined {
  const existing = store.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...updates };
  store.set(id, updated);
  return updated;
}

export function listPayments(): PaymentRecord[] {
  return Array.from(store.values());
}
