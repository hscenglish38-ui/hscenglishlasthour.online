import { describe, expect, it } from "vitest";
import { normalizeBdPhone, validateOrderInput } from "./validation";

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

  it("rejects non-object input", () => {
    expect(validateOrderInput(null).success).toBe(false);
    expect(validateOrderInput("nope").success).toBe(false);
  });
});
