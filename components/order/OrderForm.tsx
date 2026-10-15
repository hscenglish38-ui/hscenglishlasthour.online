"use client";

import { useRef, useState } from "react";
import {
  MIN_ORDER_QUANTITY,
  computeTotals,
  formatCurrency,
} from "@/lib/orders/pricing";
import { validateOrderInput } from "@/lib/orders/validation";
import { MAX_ADDRESS_LINES, limitAddressLines } from "@/lib/orders/address";
import type { ApiErrorResponse, CreateOrderResponse, OrderInput } from "@/types/order";
import { Button } from "@/components/ui/Button";
import { Bilingual } from "@/components/ui/Bilingual";
import { GlassCard } from "@/components/ui/GlassCard";
import { BookIcon, CheckCircleIcon } from "@/components/ui/icons";
import { OrderSummary } from "./OrderSummary";
import { QuantityStepper } from "./QuantityStepper";
import { useBook } from "@/components/book/BookProvider";

type Status = "idle" | "submitting" | "success" | "error";

const EMPTY_FORM: OrderInput = {
  customerName: "",
  customerPhone: "",
  customerAddress: "",
  quantity: MIN_ORDER_QUANTITY,
};

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
        setServerError(
          errorBody?.error ??
            "আপনার অর্ডার নেওয়া যায়নি। আবার চেষ্টা করুন। / Could not place your order. Please try again.",
        );
        setStatus("error");
        return;
      }

      const data = (await response.json()) as CreateOrderResponse;
      setConfirmation(data);
      setStatus("success");
      setForm(EMPTY_FORM);
    } catch {
      setServerError(
        "নেটওয়ার্ক সমস্যা। আপনার ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন। / Network error. Please check your connection and try again.",
      );
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }

  if (status === "success" && confirmation) {
    return (
      <GlassCard className="order-card animate-rise space-y-4 p-5">
        <div
          role="status"
          className="rounded-[var(--r-md)] border border-emerald-200/80 bg-emerald-50/90 p-4 text-sm text-emerald-900 shadow-[var(--box-shadow)]"
        >
          <p className="flex items-center gap-2 text-base font-bold">
            <CheckCircleIcon className="text-emerald-600" />
            <Bilingual bn="অর্ডার নিশ্চিত হয়েছে" en="Order Confirmed" />
          </p>
          <p className="mt-1.5">{confirmation.message}</p>
          <p className="mt-2 text-emerald-800">
            <Bilingual bn="অর্ডার আইডি" en="Order ID" />:{" "}
            <span className="font-mono">{confirmation.orderId}</span>
          </p>
          <p className="mt-1 text-emerald-800">
            {confirmation.pricing.quantity} × {formatCurrency(confirmation.pricing.unitPrice)} —{" "}
            <Bilingual bn="মোট প্রদেয়" en="Total payable" />:{" "}
            {formatCurrency(confirmation.pricing.totalAmount)} (
            <Bilingual bn="ক্যাশ অন ডেলিভারি" en="Cash on Delivery" />).
          </p>
        </div>
        <Button variant="glass" className="w-full" onClick={() => setStatus("idle")}>
          <Bilingual bn="আরেকটি অর্ডার করুন" en="Place another order" />
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
          <p className="eyebrow">
            <Bilingual bn="অর্ডার" en="Order" />
          </p>
          <h2 className="truncate text-lg font-bold text-[var(--ink)]">
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
        <section className="info-box space-y-3.5" aria-label="Customer information">
          <p className="info-box-title">
            <Bilingual bn="গ্রাহকের তথ্য" en="Customer Information" />
          </p>
          <Field
            id="customerName"
            labelBn="নাম"
            labelEn="Name"
            error={fieldErrors.customerName}
            value={form.customerName}
            onChange={(v) => update("customerName", v)}
            disabled={submitting}
            autoComplete="name"
          />
          <Field
            id="customerPhone"
            labelBn="মোবাইল নম্বর"
            labelEn="Mobile Number"
            error={fieldErrors.customerPhone}
            value={form.customerPhone}
            onChange={(v) => update("customerPhone", v)}
            disabled={submitting}
            inputMode="tel"
            autoComplete="tel"
          />
          <Field
            id="customerAddress"
            labelBn="ঠিকানা"
            labelEn="Address"
            error={fieldErrors.customerAddress}
            value={form.customerAddress}
            onChange={(v) => update("customerAddress", v)}
            disabled={submitting}
            multiline
            maxLines={MAX_ADDRESS_LINES}
            autoComplete="street-address"
          />
        </section>

        <section className="info-box" aria-label="Book quantity">
          <span id="quantity-label" className="field-label">
            <Bilingual bn="বইয়ের সংখ্যা" en="Book Quantity" />
          </span>
          <QuantityStepper
            value={form.quantity}
            onChange={(value) => update("quantity", value)}
            labelledBy="quantity-label"
            describedBy={fieldErrors.quantity ? "quantity-error" : "quantity-hint"}
            disabled={submitting}
          />
          {fieldErrors.quantity ? (
            <p id="quantity-error" className="mt-2 text-xs font-medium text-red-600">
              {fieldErrors.quantity}
            </p>
          ) : (
            <p id="quantity-hint" className="mt-2 text-xs text-[var(--ink-muted)]">
              <Bilingual bn="সর্বনিম্ন ১, সর্বোচ্চ ২০ কপি।" en="Minimum 1, maximum 20 copies." />
            </p>
          )}
        </section>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="btn-block"
          disabled={submitting}
        >
          {submitting ? (
            <Bilingual bn="অর্ডার পাঠানো হচ্ছে…" en="Placing order…" />
          ) : (
            <Bilingual bn="অর্ডার করুন" en="Place Order" />
          )}
        </Button>
      </form>
    </GlassCard>
  );
}

interface FieldProps {
  id: keyof OrderInput;
  labelBn: string;
  labelEn: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hintBn?: string;
  hintEn?: string;
  disabled?: boolean;
  multiline?: boolean;
  maxLines?: number;
  inputMode?: "tel" | "text";
  autoComplete?: string;
}

function Field({
  id,
  labelBn,
  labelEn,
  value,
  onChange,
  error,
  hintBn,
  hintEn,
  disabled,
  multiline,
  maxLines,
  inputMode,
  autoComplete,
}: FieldProps) {
  const hasHint = Boolean(hintBn && hintEn);
  const describedBy = [hasHint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div>
      <label htmlFor={id} className="field-label">
        <Bilingual bn={labelBn} en={labelEn} />
      </label>
      {multiline ? (
        <textarea
          id={id}
          name={id}
          rows={maxLines ?? 3}
          value={value}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          onChange={(e) =>
            onChange(maxLines ? limitAddressLines(e.target.value, maxLines) : e.target.value)
          }
          className="field-input address-input"
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
      {hasHint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-[var(--ink-muted)]">
          <Bilingual bn={hintBn!} en={hintEn!} />
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
