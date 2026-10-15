"use client";

import { useRef, useState } from "react";
import { MAX_ORDER_QUANTITY, MIN_ORDER_QUANTITY, computeTotals, formatCurrency } from "@/lib/orders/pricing";
import { validateOrderInput } from "@/lib/orders/validation";
import type { ApiErrorResponse, CreateOrderResponse, OrderInput } from "@/types/order";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { BookIcon, CheckCircleIcon } from "@/components/ui/icons";
import { OrderSummary } from "./OrderSummary";
import { useBook } from "@/components/book/BookProvider";

type Status = "idle" | "submitting" | "success" | "error";

const EMPTY_FORM: OrderInput = {
  customerName: "",
  customerPhone: "",
  customerAddress: "",
  quantity: MIN_ORDER_QUANTITY,
};

const QUANTITY_OPTIONS = Array.from(
  { length: MAX_ORDER_QUANTITY - MIN_ORDER_QUANTITY + 1 },
  (_, index) => MIN_ORDER_QUANTITY + index,
);

export function OrderForm() {
  const { book } = useBook();
  const [form, setForm] = useState<OrderInput>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [confirmation, setConfirmation] = useState<CreateOrderResponse | null>(null);
  const inFlight = useRef(false);

  const pricing = computeTotals(book.pricing, form.quantity);
  const submitting = status === "submitting";

  function update<K extends keyof OrderInput>(key: K, value: OrderInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;

    setServerError(null);
    const validation = validateOrderInput(form);
    if (!validation.success || !validation.data) {
      setFieldErrors(validation.fieldErrors);
      setStatus("error");
      return;
    }

    setFieldErrors({});
    inFlight.current = true;
    setStatus("submitting");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as ApiErrorResponse | null;
        setFieldErrors(errorBody?.fieldErrors ?? {});
        setServerError(errorBody?.error ?? "Could not place your order. Please try again.");
        setStatus("error");
        return;
      }

      const data = (await response.json()) as CreateOrderResponse;
      setConfirmation(data);
      setStatus("success");
      setForm(EMPTY_FORM);
    } catch {
      setServerError("Network error. Please check your connection and try again.");
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }

  if (status === "success" && confirmation) {
    return (
      <GlassCard className="order-card animate-rise space-y-4 p-5">
        <div role="status" className="rounded-[var(--r-md)] border border-emerald-200/80 bg-emerald-50/90 p-4 text-sm text-emerald-900">
          <p className="flex items-center gap-2 text-base font-bold">
            <CheckCircleIcon className="text-emerald-600" />
            Order confirmed
          </p>
          <p className="mt-1.5">{confirmation.message}</p>
          <p className="mt-2 text-emerald-800">
            Order ID: <span className="font-mono">{confirmation.orderId}</span>
          </p>
          <p className="mt-1 text-emerald-800">
            {confirmation.pricing.quantity} × {formatCurrency(confirmation.pricing.unitPrice)} —
            total payable on delivery: {formatCurrency(confirmation.pricing.totalAmount)} (Cash on
            Delivery).
          </p>
        </div>
        <Button variant="glass" className="w-full" onClick={() => setStatus("idle")}>
          Place another order
        </Button>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="order-card p-4 sm:p-5">
      <div className="flex items-center gap-3">
        {book.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverImageUrl}
            alt={`${book.title} cover`}
            className="h-14 w-11 shrink-0 rounded-[var(--r-sm)] object-cover shadow-[var(--shadow-contact)]"
          />
        ) : (
          <span
            className="flex h-14 w-11 shrink-0 items-center justify-center rounded-[var(--r-sm)] text-white"
            style={{ backgroundImage: "var(--grad-primary)", boxShadow: "var(--shadow-primary)" }}
            aria-hidden="true"
          >
            <BookIcon width={20} height={20} />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            Order
          </p>
          <h2 className="truncate text-base font-bold text-[var(--ink)]">
            {book.title || "HSC English Last Hour"}
          </h2>
          {book.author ? (
            <p className="truncate text-xs text-[var(--ink-muted)]">{book.author}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-3.5">
        <OrderSummary pricing={pricing} />
      </div>

      {serverError ? (
        <p
          role="alert"
          className="mt-3 rounded-[var(--r-md)] border border-red-200/80 bg-red-50/90 px-3 py-2 text-sm text-red-800"
        >
          {serverError}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3.5">
        <Field
          id="customerName"
          label="Full name"
          error={fieldErrors.customerName}
          value={form.customerName}
          onChange={(v) => update("customerName", v)}
          disabled={submitting}
          autoComplete="name"
        />
        <Field
          id="customerPhone"
          label="Mobile number"
          hint="Bangladeshi mobile number, e.g. 01712345678"
          error={fieldErrors.customerPhone}
          value={form.customerPhone}
          onChange={(v) => update("customerPhone", v)}
          disabled={submitting}
          inputMode="tel"
          autoComplete="tel"
        />
        <Field
          id="customerAddress"
          label="Delivery address"
          error={fieldErrors.customerAddress}
          value={form.customerAddress}
          onChange={(v) => update("customerAddress", v)}
          disabled={submitting}
          multiline
          autoComplete="street-address"
        />

        <div>
          <label htmlFor="quantity" className="field-label">
            Quantity
          </label>
          <div className="flex items-center gap-3">
            <select
              id="quantity"
              name="quantity"
              value={form.quantity}
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.quantity)}
              aria-describedby={fieldErrors.quantity ? "quantity-error" : "quantity-hint"}
              onChange={(e) => update("quantity", Number(e.target.value))}
              className="field-input w-24"
            >
              {QUANTITY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <span className="text-sm text-[var(--ink-soft)]" aria-hidden="true">
              {form.quantity} {form.quantity === 1 ? "copy" : "copies"}
            </span>
          </div>
          {fieldErrors.quantity ? (
            <p id="quantity-error" className="mt-1 text-xs font-medium text-red-600">
              {fieldErrors.quantity}
            </p>
          ) : (
            <p id="quantity-hint" className="mt-1 text-xs text-[var(--ink-muted)]">
              Choose 1–20 copies.
            </p>
          )}
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Placing order…" : "Order Now (Cash on Delivery)"}
        </Button>
      </form>
    </GlassCard>
  );
}

interface FieldProps {
  id: keyof OrderInput;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  multiline?: boolean;
  inputMode?: "tel" | "text";
  autoComplete?: string;
}

function Field({ id, label, value, onChange, error, hint, disabled, multiline, inputMode, autoComplete }: FieldProps) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          name={id}
          rows={3}
          value={value}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          onChange={(e) => onChange(e.target.value)}
          className="field-input resize-y"
        />
      ) : (
        <input
          id={id}
          name={id}
          type="text"
          inputMode={inputMode}
          value={value}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          onChange={(e) => onChange(e.target.value)}
          className="field-input"
        />
      )}
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-[var(--ink-muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
