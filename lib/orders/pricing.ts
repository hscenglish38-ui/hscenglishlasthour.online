import type { BookPricing } from "@/types/book";
import type { OrderPricing } from "@/types/order";

/**
 * Compute the authoritative order totals from server-side pricing.
 * Amounts are integer values in the store currency (BDT).
 */
export function computeTotals(pricing: BookPricing): OrderPricing {
  const bookPrice = toIntegerAmount(pricing.offerPrice ?? pricing.price);
  const deliveryCharge = toIntegerAmount(pricing.deliveryCharge);
  return {
    bookPrice,
    deliveryCharge,
    totalAmount: bookPrice + deliveryCharge,
  };
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
