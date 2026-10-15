import { formatCurrency } from "@/lib/orders/pricing";
import { Bilingual } from "@/components/ui/Bilingual";
import type { OrderPricing } from "@/types/order";

export function OrderSummary({ pricing }: { pricing: OrderPricing }) {
  return (
    <div className="order-summary">
      <p className="info-box-title mb-1.5">
        <Bilingual bn="অর্ডার সারসংক্ষেপ" en="Order Summary" />
      </p>
      <dl className="divide-y divide-[rgba(99,102,241,0.15)] text-sm">
        <div className="flex items-center justify-between py-1.5">
          <dt className="text-[var(--ink-soft)]">
            <Bilingual bn="প্রতি বইয়ের দাম" en="Price per Book" />
          </dt>
          <dd className="font-medium text-[var(--ink)]">{formatCurrency(pricing.unitPrice)}</dd>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <dt className="text-[var(--ink-soft)]">
            <Bilingual bn="বইয়ের সংখ্যা" en="Quantity" />
          </dt>
          <dd className="font-medium text-[var(--ink)]">× {pricing.quantity}</dd>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <dt className="text-[var(--ink-soft)]">
            <Bilingual bn="উপমোট" en="Subtotal" />
          </dt>
          <dd className="font-medium text-[var(--ink)]">{formatCurrency(pricing.subtotal)}</dd>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <dt className="text-[var(--ink-soft)]">
            <Bilingual bn="ডেলিভারি খরচ" en="Delivery Charge" />
          </dt>
          <dd className="font-medium text-[var(--ink)]">{formatCurrency(pricing.deliveryCharge)}</dd>
        </div>
        <div className="flex items-baseline justify-between py-2">
          <dt className="font-semibold text-[var(--ink)]">
            <Bilingual bn="মোট মূল্য" en="Total Price" />
          </dt>
          <dd className="price-text text-xl font-extrabold">{formatCurrency(pricing.totalAmount)}</dd>
        </div>
      </dl>
    </div>
  );
}
