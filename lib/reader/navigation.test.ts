import { describe, expect, it } from "vitest";
import {
  clampPage,
  isFirstPage,
  isLastPage,
  isPreviewEnd,
  lastVisiblePage,
  nextPage,
  prevPage,
} from "./navigation";

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

describe("preview end detection", () => {
  it("single-page mode ends on the last page", () => {
    expect(lastVisiblePage(9, 10, { spread: false })).toBe(9);
    expect(isPreviewEnd(10, 10, { spread: false })).toBe(true);
    expect(isPreviewEnd(9, 10, { spread: false })).toBe(false);
  });

  it("two-page spread ends one page early (right page included)", () => {
    expect(lastVisiblePage(9, 10, { spread: true })).toBe(10);
    expect(isPreviewEnd(9, 10, { spread: true })).toBe(true);
    expect(isPreviewEnd(8, 10, { spread: true })).toBe(false);
  });

  it("handles an odd final page in spread mode", () => {
    expect(lastVisiblePage(7, 7, { spread: true })).toBe(7);
    expect(isPreviewEnd(7, 7, { spread: true })).toBe(true);
    expect(isPreviewEnd(6, 7, { spread: true })).toBe(true);
  });
});
