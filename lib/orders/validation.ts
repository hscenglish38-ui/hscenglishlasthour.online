import { z } from "zod";
import type { OrderInput } from "@/types/order";

export interface ValidationResult {
  success: boolean;
  data?: OrderInput;
  fieldErrors: Record<string, string>;
}

const schema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, "Please enter your full name.")
    .max(100, "Name is too long."),
  customerPhone: z.string().trim().min(1, "Please enter your mobile number."),
  customerAddress: z
    .string()
    .trim()
    .min(5, "Please enter your delivery address.")
    .max(500, "Address is too long."),
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
        customerPhone: "Enter a valid Bangladeshi mobile number (e.g. 01712345678).",
      },
    };
  }

  return {
    success: true,
    fieldErrors: {},
    data: {
      customerName: parsed.data.customerName,
      customerPhone: phone,
      customerAddress: parsed.data.customerAddress,
    },
  };
}
