import type { BookPricing } from "@/types/book";
import type { OrderPricing } from "@/types/order";

/** Allowed order quantity, inclusive. */
export const MIN_ORDER_QUANTITY = 1;
export const MAX_ORDER_QUANTITY = 20;

/**
 * Compute the authoritative order totals from server-side pricing.
 * Amounts are integer values in the store currency (BDT). The delivery charge is
 * applied once per order; the book price is multiplied by the quantity.
 */
export function computeTotals(pricing: BookPricing, quantity: number = MIN_ORDER_QUANTITY): OrderPricing {
  const unitPrice = toIntegerAmount(pricing.offerPrice ?? pricing.price);
  const qty = normalizeQuantity(quantity);
  const deliveryCharge = toIntegerAmount(pricing.deliveryCharge);
  const subtotal = unitPrice * qty;
  return {
    unitPrice,
    quantity: qty,
    subtotal,
    deliveryCharge,
    totalAmount: subtotal + deliveryCharge,
  };
}

/**
 * Validate a quantity for server-side use. Accepts only integers in
 * `[MIN_ORDER_QUANTITY, MAX_ORDER_QUANTITY]`; throws otherwise so an invalid
 * quantity can never reach the database or pricing math.
 */
export function normalizeQuantity(value: number): number {
  if (!Number.isInteger(value) || value < MIN_ORDER_QUANTITY || value > MAX_ORDER_QUANTITY) {
    throw new Error("Invalid quantity");
  }
  return value;
}

function toIntegerAmount(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Invalid pricing amount");
  }
  return Math.round(value);
}

export function formatCurrency(amount: number, currency = "BDT"): string {
  const value = new Intl.NumberFormat("en-BD", {
    maximumFractionDigits: 0,
  }).format(amount);
  return currency === "BDT" ? `৳${value}` : `${value} ${currency}`;
}
