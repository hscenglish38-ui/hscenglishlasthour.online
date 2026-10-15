import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREVIEW_PAGE_COUNT,
  MAX_PREVIEW_PAGE_COUNT,
  clampPreviewPageCount,
  getPreviewPageCount,
  getPreviewPages,
  realBookConfig,
} from "./config";
import type { BookConfig, BookPage } from "@/types/book";

function pages(count: number): BookPage[] {
  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    imageUrl: `/p/${index + 1}.png`,
    alt: `Page ${index + 1}`,
  }));
}

describe("preview page limits", () => {
  it("defaults to the maximum of 10 pages", () => {
    expect(DEFAULT_PREVIEW_PAGE_COUNT).toBe(10);
    expect(MAX_PREVIEW_PAGE_COUNT).toBe(10);
    expect(realBookConfig.previewPageCount).toBe(10);
  });

  it("clamps configured counts to [0, 10]", () => {
    expect(clampPreviewPageCount(0)).toBe(0);
    expect(clampPreviewPageCount(4)).toBe(4);
    expect(clampPreviewPageCount(10)).toBe(10);
    expect(clampPreviewPageCount(50)).toBe(10);
    expect(clampPreviewPageCount(-3)).toBe(0);
    expect(clampPreviewPageCount(2.9)).toBe(2);
    expect(clampPreviewPageCount(Number.NaN)).toBe(DEFAULT_PREVIEW_PAGE_COUNT);
  });

  it("never exposes more than 10 pages, even if configured higher", () => {
    const config: BookConfig = {
      ...realBookConfig,
      previewPageCount: 50,
      content: { ...realBookConfig.content, pages: pages(15) },
    };
    expect(getPreviewPages(config)).toHaveLength(10);
    expect(getPreviewPageCount(config)).toBe(10);
  });

  it("exposes fewer pages when the book has fewer", () => {
    const config: BookConfig = {
      ...realBookConfig,
      previewPageCount: 10,
      content: { ...realBookConfig.content, pages: pages(6) },
    };
    expect(getPreviewPages(config)).toHaveLength(6);
  });
});
