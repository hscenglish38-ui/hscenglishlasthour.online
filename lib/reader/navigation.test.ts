import { describe, expect, it } from "vitest";
import { clampPage, isFirstPage, isLastPage, nextPage, prevPage } from "./navigation";

describe("navigation", () => {
  it("clamps page into range", () => {
    expect(clampPage(0, 8)).toBe(1);
    expect(clampPage(9, 8)).toBe(8);
    expect(clampPage(3.4, 8)).toBe(3);
    expect(clampPage(Number.NaN, 8)).toBe(1);
    expect(clampPage(1, 0)).toBe(1);
  });

  it("computes next and previous with bounds", () => {
    expect(nextPage(1, 8)).toBe(2);
    expect(nextPage(8, 8)).toBe(8);
    expect(prevPage(2, 8)).toBe(1);
    expect(prevPage(1, 8)).toBe(1);
  });

  it("detects first and last page", () => {
    expect(isFirstPage(1)).toBe(true);
    expect(isFirstPage(2)).toBe(false);
    expect(isLastPage(8, 8)).toBe(true);
    expect(isLastPage(7, 8)).toBe(false);
  });
});
