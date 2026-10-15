import { loadPublishedBook } from "@/lib/book/source";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";
import type { CreateOrderResponse } from "@/types/order";
import { computeTotals } from "./pricing";
import { validateOrderInput } from "./validation";

export class OrderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "OrderError";
  }
}

export const ORDERS_TABLE = "orders";

export async function createOrder(input: unknown): Promise<CreateOrderResponse> {
  const validation = validateOrderInput(input);
  if (!validation.success || !validation.data) {
    throw new OrderError("Please check the form and try again.", 400, validation.fieldErrors);
  }

  const payload = input as { bookId?: unknown };
  const requestedBookId = typeof payload.bookId === "string" ? payload.bookId : undefined;
  const book = await loadPublishedBook(requestedBookId);

  if (payload.bookId !== undefined) {
    const providedId = String(payload.bookId).trim();
    if (providedId && providedId !== book.id) {
      throw new OrderError("Invalid book selection.", 400);
    }
  }

  if (!book.isPublished) {
    throw new OrderError("Ordering is not open yet.", 409);
  }

  if (!isSupabaseAdminConfigured()) {
    throw new OrderError(
      "Ordering is temporarily unavailable. Supabase is not configured on the server.",
      503,
    );
  }

  const pricing = computeTotals(book.pricing, validation.data.quantity);
  const now = new Date().toISOString();

  const record = {
    book_id: book.id,
    book_title: book.title,
    customer_name: validation.data.customerName,
    customer_phone: validation.data.customerPhone,
    customer_address: validation.data.customerAddress,
    quantity: pricing.quantity,
    book_price: pricing.unitPrice,
    delivery_charge: pricing.deliveryCharge,
    total_amount: pricing.totalAmount,
    currency: book.pricing.currency,
    payment_method: "cod" as const,
    status: "pending" as const,
    created_at: now,
    updated_at: now,
  };

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(ORDERS_TABLE)
    .insert(record)
    .select("id")
    .single();

  if (error || !data?.id) {
    // 23503 = foreign_key_violation. The book row disappeared between the
    // publish check and the insert; treat it as "not available" rather than a
    // server error.
    if ((error as { code?: string } | null)?.code === "23503") {
      throw new OrderError("This book is not available for ordering.", 409);
    }
    console.error("Failed to persist order", error);
    throw new OrderError("Could not place your order. Please try again.", 500);
  }

  return {
    orderId: String(data.id),
    book: { id: book.id, title: book.title },
    pricing,
    message: "Your order has been received. We will call you to confirm delivery.",
  };
}
