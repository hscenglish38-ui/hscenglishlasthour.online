// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { createOrder, OrderError } = vi.hoisted(() => {
  class HoistedOrderError extends Error {
    status: number;
    fieldErrors?: Record<string, string>;
    constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
      super(message);
      this.name = "OrderError";
      this.status = status;
      this.fieldErrors = fieldErrors;
    }
  }
  return { createOrder: vi.fn(), OrderError: HoistedOrderError };
});

vi.mock("@/lib/orders/create-order", () => ({ createOrder, OrderError }));

const VALID_BODY = {
  customerName: "Ayesha Rahman",
  customerPhone: "+8801712345678",
  customerAddress: "House 12, Road 5, Dhanmondi",
  quantity: 1,
};

const PRICING = {
  unitPrice: 350,
  quantity: 1,
  subtotal: 350,
  deliveryCharge: 60,
  totalAmount: 410,
};

function postRequest(body: unknown, ip: string) {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  createOrder.mockReset();
});

describe("POST /api/orders", () => {
  it("returns 201 with the created order on success", async () => {
    createOrder.mockResolvedValue({
      orderId: "abc123",
      book: { id: "sample-book-001", title: "Sample Book" },
      pricing: PRICING,
      message: "Your order has been received.",
    });

    const response = await POST(postRequest(VALID_BODY, "10.0.0.1"));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ orderId: "abc123" });
  });

  it("forwards the raw body to createOrder without trusting client pricing", async () => {
    createOrder.mockResolvedValue({
      orderId: "abc123",
      book: { id: "sample-book-001", title: "Sample Book" },
      pricing: PRICING,
      message: "ok",
    });

    const tampered = { ...VALID_BODY, totalAmount: 1, bookPrice: 1, status: "paid" };
    await POST(postRequest(tampered, "10.0.0.2"));

    expect(createOrder).toHaveBeenCalledTimes(1);
    expect(createOrder).toHaveBeenCalledWith(tampered);
  });

  it("returns 400 for a non-JSON body", async () => {
    const response = await POST(postRequest("not-json", "10.0.0.3"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("Invalid request body."),
    });
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("maps an OrderError to its status and field errors", async () => {
    createOrder.mockRejectedValue(
      new OrderError("Please check the form and try again.", 422, {
        customerPhone: "Enter a valid Bangladeshi mobile number.",
      }),
    );

    const response = await POST(postRequest(VALID_BODY, "10.0.0.4"));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: "Please check the form and try again.",
      fieldErrors: { customerPhone: "Enter a valid Bangladeshi mobile number." },
    });
  });

  it("returns a generic 500 for unexpected errors", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    createOrder.mockRejectedValue(new Error("boom"));

    const response = await POST(postRequest(VALID_BODY, "10.0.0.5"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("Could not place your order. Please try again."),
    });
    spy.mockRestore();
  });

  it("rate limits repeated attempts from the same client (429)", async () => {
    createOrder.mockResolvedValue({
      orderId: "abc123",
      book: { id: "sample-book-001", title: "Sample Book" },
      pricing: PRICING,
      message: "ok",
    });

    const ip = "10.9.9.9";
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const response = await POST(postRequest(VALID_BODY, ip));
      statuses.push(response.status);
    }

    expect(statuses.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
    expect(statuses[5]).toBe(429);
  });
});
