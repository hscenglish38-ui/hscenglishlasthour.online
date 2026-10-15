import { z } from "zod";
import type { OrderInput } from "@/types/order";
import { MAX_ORDER_QUANTITY, MIN_ORDER_QUANTITY } from "./pricing";

export interface ValidationResult {
  success: boolean;
  data?: OrderInput;
  fieldErrors: Record<string, string>;
}

const schema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, "আপনার পূর্ণ নাম লিখুন। / Please enter your full name.")
    .max(100, "নাম অনেক বড়। / Name is too long."),
  customerPhone: z
    .string()
    .trim()
    .min(1, "আপনার মোবাইল নম্বর লিখুন। / Please enter your mobile number."),
  customerAddress: z
    .string()
    .trim()
    .min(5, "আপনার ডেলিভারি ঠিকানা লিখুন। / Please enter your delivery address.")
    .max(500, "ঠিকানা অনেক বড়। / Address is too long."),
});

/**
 * Normalize a Bangladeshi mobile number to E.164 (`+8801XXXXXXXXX`).
 * Accepts `01XXXXXXXXX`, `1XXXXXXXXX`, `8801XXXXXXXXX`, and `+8801XXXXXXXXX`.
 * Returns null when the number is not a valid BD mobile number.
 */
export function normalizeBdPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  let local: string | null = null;

  if (/^8801\d{9}$/.test(digits)) local = `0${digits.slice(3)}`;
  else if (/^01\d{9}$/.test(digits)) local = digits;
  else if (/^1\d{9}$/.test(digits)) local = `0${digits}`;

  if (!local || !/^01[3-9]\d{8}$/.test(local)) return null;
  return `+880${local.slice(1)}`;
}

/**
 * Parse and validate an order quantity. Accepts an integer from 1 to 20
 * (a number, or a string that represents a whole number). Missing/empty values
 * default to 1. Rejects zero, negatives, decimals, non-numeric strings and any
 * value above 20.
 */
export function parseQuantity(
  value: unknown,
): { ok: true; value: number } | { ok: false; message: string } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: MIN_ORDER_QUANTITY };
  }

  const num =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    return {
      ok: false,
      message: `পূর্ণসংখ্যায় বইয়ের সংখ্যা ${MIN_ORDER_QUANTITY} থেকে ${MAX_ORDER_QUANTITY} এর মধ্যে দিন। / Enter a whole-number quantity between ${MIN_ORDER_QUANTITY} and ${MAX_ORDER_QUANTITY}.`,
    };
  }
  if (num < MIN_ORDER_QUANTITY || num > MAX_ORDER_QUANTITY) {
    return {
      ok: false,
      message: `বইয়ের সংখ্যা ${MIN_ORDER_QUANTITY} থেকে ${MAX_ORDER_QUANTITY} এর মধ্যে হতে হবে। / Quantity must be between ${MIN_ORDER_QUANTITY} and ${MAX_ORDER_QUANTITY}.`,
    };
  }
  return { ok: true, value: num };
}

export function validateOrderInput(input: unknown): ValidationResult {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      if (!fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { success: false, fieldErrors };
  }

  const phone = normalizeBdPhone(parsed.data.customerPhone);
  if (!phone) {
    return {
      success: false,
      fieldErrors: {
        customerPhone: "বৈধ বাংলাদেশি মোবাইল নম্বর দিন। / Enter a valid Bangladeshi mobile number.",
      },
    };
  }

  const quantity = parseQuantity((input as { quantity?: unknown } | null)?.quantity);
  if (!quantity.ok) {
    return { success: false, fieldErrors: { quantity: quantity.message } };
  }

  return {
    success: true,
    fieldErrors: {},
    data: {
      customerName: parsed.data.customerName,
      customerPhone: phone,
      customerAddress: parsed.data.customerAddress,
      quantity: quantity.value,
    },
  };
}
