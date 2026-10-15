"use client";

import { MAX_ORDER_QUANTITY, MIN_ORDER_QUANTITY } from "@/lib/orders/pricing";
import { MinusIcon, PlusIcon } from "@/components/ui/icons";

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  /** id of the element that labels this control (rendered by the parent). */
  labelledBy?: string;
  /** ids of hint/error text describing this control. */
  describedBy?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
}

/**
 * Accessible glass quantity stepper: `[ − ] value [ + ]`. Values are clamped to
 * `[min, max]` (1–20 by default) and the buttons disable at the limits. The
 * authoritative 1–20 check still happens on the server.
 */
export function QuantityStepper({
  value,
  onChange,
  labelledBy,
  describedBy,
  disabled = false,
  min = MIN_ORDER_QUANTITY,
  max = MAX_ORDER_QUANTITY,
}: QuantityStepperProps) {
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className="stepper"
    >
      <button
        type="button"
        className="stepper-btn"
        aria-label="পরিমাণ কমান / Decrease quantity"
        disabled={disabled || atMin}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <MinusIcon width={18} height={18} />
      </button>
      <output className="stepper-value" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className="stepper-btn"
        aria-label="পরিমাণ বাড়ান / Increase quantity"
        disabled={disabled || atMax}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <PlusIcon width={18} height={18} />
      </button>
    </div>
  );
}
