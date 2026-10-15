import { beforeEach, describe, expect, it, vi } from "vitest";

const { isConfigured, loadBook, inserts, insertSingle } = vi.hoisted(() => ({
  isConfigured: vi.fn(() => true),
  loadBook: vi.fn(),
  inserts: [] as Record<string, unknown>[],
  insertSingle: vi.fn<() => Promise<{ data: { id: string } | null; error: Error | null }>>(
    async () => ({ data: { id: "order-123" }, error: null }),
  ),
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseAdminConfigured: isConfigured,
  getSupabaseBookBucket: () => "book-assets",
}));

vi.mock("@/lib/book/source", () => ({
  loadPublishedBook: loadBook,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => ({
    from: () => ({
      insert: (record: Record<string, unknown>) => {
        inserts.push(record);
        return { select: () => ({ single: insertSingle }) };
      },
    }),
  }),
}));

import { createOrder, OrderError } from "./create-order";
import { realBookConfig } from "@/lib/book/config";

const validInput = {
  customerName: "Ayesha Rahman",
  customerPhone: "01712345678",
  customerAddress: "House 12, Road 5, Dhanmondi, Dhaka",
};

const publishedBook = { ...realBookConfig, isPublished: true };

describe("createOrder", () => {
  beforeEach(() => {
    isConfigured.mockReturnValue(true);
    inserts.length = 0;
    insertSingle.mockReset();
    insertSingle.mockResolvedValue({ data: { id: "order-123" }, error: null });
    loadBook.mockReset();
    loadBook.mockResolvedValue(publishedBook);
  });

  it("persists a valid order and returns the server-computed totals", async () => {
    const result = await createOrder(validInput);
    expect(result.orderId).toBe("order-123");
    expect(result.pricing.totalAmount).toBe(
      result.pricing.subtotal + result.pricing.deliveryCharge,
    );
    expect(result.pricing.quantity).toBe(1);
    expect(inserts).toHaveLength(1);
    const record = inserts[0];
    expect(record.quantity).toBe(1);
    expect(record.payment_method).toBe("cod");
    expect(record.status).toBe("pending");
    expect(record.customer_phone).toBe("+8801712345678");
  });

  it("persists the selected quantity and computes the total from it", async () => {
    const result = await createOrder({ ...validInput, quantity: 4 });
    expect(result.pricing).toEqual({
      unitPrice: 350,
      quantity: 4,
      subtotal: 1400,
      deliveryCharge: 60,
      totalAmount: 1460,
    });
    const record = inserts[0];
    expect(record.quantity).toBe(4);
    expect(record.book_price).toBe(350);
    expect(record.total_amount).toBe(1460);
  });

  it("accepts the maximum quantity of 20", async () => {
    const result = await createOrder({ ...validInput, quantity: 20 });
    expect(result.pricing.quantity).toBe(20);
    expect(result.pricing.subtotal).toBe(7000);
    expect(result.pricing.totalAmount).toBe(7060);
  });

  it("rejects an invalid quantity with a 400", async () => {
    for (const quantity of [0, -1, 21, 2.5, "abc"]) {
      await expect(createOrder({ ...validInput, quantity })).rejects.toMatchObject({
        name: "OrderError",
        status: 400,
      });
    }
    expect(inserts).toHaveLength(0);
  });

  it("ignores any client-supplied pricing fields", async () => {
    await createOrder({
      ...validInput,
      quantity: 2,
      bookPrice: 1,
      unitPrice: 1,
      subtotal: 1,
      totalAmount: 1,
      paymentMethod: "card",
      status: "paid",
    });
    const record = inserts[0];
    expect(record.book_price).toBe(350);
    expect(record.quantity).toBe(2);
    expect(record.total_amount).toBe(760);
    expect(record.payment_method).toBe("cod");
    expect(record.status).toBe("pending");
  });

  it("prices the order from the loaded book document", async () => {
    loadBook.mockResolvedValue({
      ...publishedBook,
      pricing: { price: 500, offerPrice: 400, deliveryCharge: 80, currency: "BDT" },
    });

    const result = await createOrder(validInput);

    expect(result.pricing).toEqual({
      unitPrice: 400,
      quantity: 1,
      subtotal: 400,
      deliveryCharge: 80,
      totalAmount: 480,
    });
    const record = inserts[0];
    expect(record.book_price).toBe(400);
    expect(record.total_amount).toBe(480);
  });

  it("throws a 409 OrderError when the book is unpublished", async () => {
    loadBook.mockResolvedValue({ ...publishedBook, isPublished: false });
    await expect(createOrder(validInput)).rejects.toMatchObject({ status: 409 });
    expect(inserts).toHaveLength(0);
  });

  it("throws a 400 OrderError for invalid input", async () => {
    await expect(createOrder({ ...validInput, customerPhone: "12" })).rejects.toMatchObject({
      name: "OrderError",
      status: 400,
    });
    expect(inserts).toHaveLength(0);
  });

  it("throws a 503 OrderError when Supabase is not configured", async () => {
    isConfigured.mockReturnValue(false);
    await expect(createOrder(validInput)).rejects.toBeInstanceOf(OrderError);
    await expect(createOrder(validInput)).rejects.toMatchObject({ status: 503 });
    expect(inserts).toHaveLength(0);
  });

  it("throws a 500 OrderError when the insert fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    insertSingle.mockResolvedValue({ data: null, error: new Error("db down") });
    await expect(createOrder(validInput)).rejects.toMatchObject({ status: 500 });
    spy.mockRestore();
  });

  it("maps a foreign-key violation (23503) to a 409", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    insertSingle.mockResolvedValue({
      data: null,
      error: Object.assign(new Error("fk"), { code: "23503" }),
    });
    await expect(createOrder(validInput)).rejects.toMatchObject({ status: 409 });
    spy.mockRestore();
  });
});
