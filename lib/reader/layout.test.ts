import { describe, expect, it } from "vitest";
import {
  clampZoom,
  computePageSize,
  computePinchZoom,
  isSpreadViewport,
  stepZoom,
} from "./layout";

describe("clampZoom", () => {
  it("clamps within bounds", () => {
    expect(clampZoom(0.1, 0.5, 2)).toBe(0.5);
    expect(clampZoom(3, 0.5, 2)).toBe(2);
    expect(clampZoom(1.25, 0.5, 2)).toBe(1.25);
  });

  it("falls back to min for non-finite values", () => {
    expect(clampZoom(Number.NaN, 0.5, 2)).toBe(0.5);
  });
});

describe("stepZoom", () => {
  it("steps by 0.25 and clamps", () => {
    expect(stepZoom(1, 1, 0.5, 2)).toBe(1.25);
    expect(stepZoom(1, -1, 0.5, 2)).toBe(0.75);
    expect(stepZoom(2, 1, 0.5, 2)).toBe(2);
  });
});

describe("isSpreadViewport", () => {
  it("uses the breakpoint", () => {
    expect(isSpreadViewport(1440)).toBe(true);
    expect(isSpreadViewport(1024)).toBe(true);
    expect(isSpreadViewport(390)).toBe(false);
  });
});

describe("computePageSize", () => {
  it("fits a single page inside the stage", () => {
    const size = computePageSize({ stageWidth: 360, stageHeight: 640, aspectRatio: 1.4, spread: false });
    expect(size.pageHeight).toBeLessThanOrEqual(640);
    expect(size.bookWidth).toBe(size.pageWidth);
    expect(size.pageHeight).toBeCloseTo(size.pageWidth * 1.4, 0);
  });

  it("fits two pages side by side in spread mode", () => {
    const size = computePageSize({ stageWidth: 1000, stageHeight: 900, aspectRatio: 1.4, spread: true });
    expect(size.bookWidth).toBe(size.pageWidth * 2);
    expect(size.pageWidth).toBeLessThanOrEqual(500);
  });

  it("never returns non-positive dimensions", () => {
    const size = computePageSize({ stageWidth: 0, stageHeight: 0, aspectRatio: 1.4, spread: false });
    expect(size.pageWidth).toBeGreaterThan(0);
    expect(size.pageHeight).toBeGreaterThan(0);
  });
});

describe("computePinchZoom", () => {
  it("scales proportionally to the distance ratio", () => {
    expect(computePinchZoom(1, 100, 200, 0.5, 3)).toBe(2);
  });

  it("clamps to bounds", () => {
    expect(computePinchZoom(1, 100, 1000, 0.5, 3)).toBe(3);
    expect(computePinchZoom(1, 0, 200, 0.5, 3)).toBe(1);
  });
});
