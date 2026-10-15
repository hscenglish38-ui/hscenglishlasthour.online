import { describe, expect, it } from "vitest";
import { computeTotals, formatCurrency, normalizeQuantity } from "./pricing";

describe("computeTotals", () => {
  it("charges a single copy by default", () => {
    expect(computeTotals({ price: 350, deliveryCharge: 60, currency: "BDT" })).toEqual({
      unitPrice: 350,
      quantity: 1,
      subtotal: 350,
      deliveryCharge: 60,
      totalAmount: 410,
    });
  });

  it("multiplies the unit price by the quantity and adds delivery once", () => {
    expect(computeTotals({ price: 350, deliveryCharge: 60, currency: "BDT" }, 2)).toEqual({
      unitPrice: 350,
      quantity: 2,
      subtotal: 700,
      deliveryCharge: 60,
      totalAmount: 760,
    });
  });

  it("charges the offer price when one is set", () => {
    expect(
      computeTotals({ price: 350, offerPrice: 300, deliveryCharge: 60, currency: "BDT" }, 4),
    ).toEqual({
      unitPrice: 300,
      quantity: 4,
      subtotal: 1200,
      deliveryCharge: 60,
      totalAmount: 1260,
    });
  });

  it("supports the maximum quantity of 20", () => {
    const totals = computeTotals({ price: 350, deliveryCharge: 60, currency: "BDT" }, 20);
    expect(totals.subtotal).toBe(7000);
    expect(totals.totalAmount).toBe(7060);
  });

  it("rounds to integer amounts", () => {
    const totals = computeTotals({ price: 349.6, deliveryCharge: 60.4, currency: "BDT" });
    expect(totals).toEqual({
      unitPrice: 350,
      quantity: 1,
      subtotal: 350,
      deliveryCharge: 60,
      totalAmount: 410,
    });
    expect(Number.isInteger(totals.totalAmount)).toBe(true);
  });

  it("rejects negative pricing", () => {
    expect(() => computeTotals({ price: -1, deliveryCharge: 60, currency: "BDT" })).toThrow();
  });

  it("rejects an invalid quantity", () => {
    expect(() => computeTotals({ price: 350, deliveryCharge: 60, currency: "BDT" }, 0)).toThrow();
    expect(() => computeTotals({ price: 350, deliveryCharge: 60, currency: "BDT" }, 21)).toThrow();
    expect(() => computeTotals({ price: 350, deliveryCharge: 60, currency: "BDT" }, 2.5)).toThrow();
  });
});

describe("normalizeQuantity", () => {
  it("accepts integers from 1 to 20", () => {
    for (const value of [1, 2, 4, 5, 6, 20]) {
      expect(normalizeQuantity(value)).toBe(value);
    }
  });

  it("rejects zero, negatives, decimals and out-of-range values", () => {
    for (const value of [0, -1, 2.5, 21, 100]) {
      expect(() => normalizeQuantity(value)).toThrow();
    }
  });
});

describe("formatCurrency", () => {
  it("formats BDT with the taka sign", () => {
    expect(formatCurrency(410)).toBe("৳410");
    expect(formatCurrency(1234)).toBe("৳1,234");
  });
});
