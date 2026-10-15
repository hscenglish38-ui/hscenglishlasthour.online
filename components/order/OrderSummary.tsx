import { formatCurrency } from "@/lib/orders/pricing";
import { TruckIcon } from "@/components/ui/icons";
import type { OrderPricing } from "@/types/order";

export function OrderSummary({ pricing }: { pricing: OrderPricing }) {
  return (
    <div>
      <dl className="divide-y divide-white/50 text-sm">
        <div className="flex items-center justify-between py-1.5">
          <dt className="text-[var(--ink-soft)]">Book price</dt>
          <dd className="font-medium text-[var(--ink)]">{formatCurrency(pricing.bookPrice)}</dd>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <dt className="text-[var(--ink-soft)]">Delivery charge</dt>
          <dd className="font-medium text-[var(--ink)]">{formatCurrency(pricing.deliveryCharge)}</dd>
        </div>
        <div className="flex items-baseline justify-between py-2">
          <dt className="font-semibold text-[var(--ink)]">Total payable</dt>
          <dd className="price-text text-xl font-extrabold">{formatCurrency(pricing.totalAmount)}</dd>
        </div>
      </dl>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
        <TruckIcon width={14} height={14} />
        Cash on Delivery — pay when you receive the book.
      </p>
    </div>
  );
}
