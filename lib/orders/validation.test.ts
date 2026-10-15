import { describe, expect, it } from "vitest";
import { normalizeBdPhone, parseQuantity, validateOrderInput } from "./validation";

describe("normalizeBdPhone", () => {
  it("accepts local, with country code and spaced formats", () => {
    expect(normalizeBdPhone("01712345678")).toBe("+8801712345678");
    expect(normalizeBdPhone("+8801712345678")).toBe("+8801712345678");
    expect(normalizeBdPhone("8801712345678")).toBe("+8801712345678");
    expect(normalizeBdPhone("01712-345 678")).toBe("+8801712345678");
    expect(normalizeBdPhone("1712345678")).toBe("+8801712345678");
  });

  it("rejects invalid numbers", () => {
    expect(normalizeBdPhone("0123456789")).toBeNull();
    expect(normalizeBdPhone("0171234567")).toBeNull();
    expect(normalizeBdPhone("abc")).toBeNull();
    expect(normalizeBdPhone("")).toBeNull();
  });
});

describe("validateOrderInput", () => {
  const valid = {
    customerName: "Ayesha Rahman",
    customerPhone: "01712345678",
    customerAddress: "House 12, Road 5, Dhanmondi, Dhaka",
  };

  it("accepts valid input and normalizes the phone", () => {
    const result = validateOrderInput(valid);
    expect(result.success).toBe(true);
    expect(result.data?.customerPhone).toBe("+8801712345678");
    expect(result.data?.customerName).toBe("Ayesha Rahman");
    expect(result.data?.quantity).toBe(1);
  });

  it("accepts quantities 2 and 4", () => {
    expect(validateOrderInput({ ...valid, quantity: 2 }).data?.quantity).toBe(2);
    expect(validateOrderInput({ ...valid, quantity: 4 }).data?.quantity).toBe(4);
  });

  it("accepts the maximum quantity of 20", () => {
    const result = validateOrderInput({ ...valid, quantity: 20 });
    expect(result.success).toBe(true);
    expect(result.data?.quantity).toBe(20);
  });

  it("rejects invalid quantities", () => {
    for (const quantity of [0, -1, 21, 2.5, "abc", "3.5"]) {
      const result = validateOrderInput({ ...valid, quantity });
      expect(result.success).toBe(false);
      expect(result.fieldErrors.quantity).toBeTruthy();
    }
  });

  it("trims whitespace", () => {
    const result = validateOrderInput({ ...valid, customerName: "  Ayesha  " });
    expect(result.data?.customerName).toBe("Ayesha");
  });

  it("reports field errors for short name and address", () => {
    const result = validateOrderInput({ ...valid, customerName: "A", customerAddress: "x" });
    expect(result.success).toBe(false);
    expect(result.fieldErrors.customerName).toBeTruthy();
    expect(result.fieldErrors.customerAddress).toBeTruthy();
  });

  it("reports an error for an invalid phone", () => {
    const result = validateOrderInput({ ...valid, customerPhone: "12345" });
    expect(result.success).toBe(false);
    expect(result.fieldErrors.customerPhone).toContain("Bangladeshi");
  });

  it("accepts an address of up to three lines and collapses extra blank lines", () => {
    const result = validateOrderInput({
      ...valid,
      customerAddress: "House 12\n\n\nRoad 5, Dhanmondi, Dhaka",
    });
    expect(result.success).toBe(true);
    expect(result.data?.customerAddress).toBe("House 12\nRoad 5, Dhanmondi, Dhaka");
  });

  it("rejects an address with more than three lines", () => {
    const result = validateOrderInput({
      ...valid,
      customerAddress: "Line one\nLine two\nLine three\nLine four",
    });
    expect(result.success).toBe(false);
    expect(result.fieldErrors.customerAddress).toContain("3 lines");
  });

  it("rejects an address that normalizes below the minimum length", () => {
    const result = validateOrderInput({ ...valid, customerAddress: "a\n\n\n\n\nb" });
    expect(result.success).toBe(false);
    expect(result.fieldErrors.customerAddress).toBeTruthy();
  });

  it("rejects non-object input", () => {
    expect(validateOrderInput(null).success).toBe(false);
    expect(validateOrderInput("nope").success).toBe(false);
  });
});

describe("parseQuantity", () => {
  it("defaults missing/empty values to 1", () => {
    expect(parseQuantity(undefined)).toEqual({ ok: true, value: 1 });
    expect(parseQuantity(null)).toEqual({ ok: true, value: 1 });
    expect(parseQuantity("")).toEqual({ ok: true, value: 1 });
  });

  it("accepts integers and numeric strings from 1 to 20", () => {
    expect(parseQuantity(1)).toEqual({ ok: true, value: 1 });
    expect(parseQuantity("2")).toEqual({ ok: true, value: 2 });
    expect(parseQuantity(20)).toEqual({ ok: true, value: 20 });
  });

  it("rejects zero, negatives, decimals, non-numeric strings and >20", () => {
    for (const value of [0, -1, 2.5, 21, "abc", "3.5", NaN, Infinity, {}]) {
      expect(parseQuantity(value).ok).toBe(false);
    }
  });
});
