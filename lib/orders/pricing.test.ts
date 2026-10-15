import { describe, expect, it } from "vitest";
import { computeTotals, formatCurrency } from "./pricing";

describe("computeTotals", () => {
  it("sums book price and delivery charge", () => {
    expect(computeTotals({ price: 350, deliveryCharge: 60, currency: "BDT" })).toEqual({
      bookPrice: 350,
      deliveryCharge: 60,
      totalAmount: 410,
    });
  });

  it("charges the offer price when one is set", () => {
    expect(computeTotals({ price: 350, offerPrice: 300, deliveryCharge: 60, currency: "BDT" })).toEqual({
      bookPrice: 300,
      deliveryCharge: 60,
      totalAmount: 360,
    });
  });

  it("rounds to integer amounts", () => {
    const totals = computeTotals({ price: 349.6, deliveryCharge: 60.4, currency: "BDT" });
    expect(totals).toEqual({ bookPrice: 350, deliveryCharge: 60, totalAmount: 410 });
    expect(Number.isInteger(totals.totalAmount)).toBe(true);
  });

  it("rejects negative pricing", () => {
    expect(() => computeTotals({ price: -1, deliveryCharge: 60, currency: "BDT" })).toThrow();
  });
});

describe("formatCurrency", () => {
  it("formats BDT with the taka sign", () => {
    expect(formatCurrency(410)).toBe("৳410");
    expect(formatCurrency(1234)).toBe("৳1,234");
  });
});
