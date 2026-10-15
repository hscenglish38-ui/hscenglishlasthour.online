import type { BookConfig, BookPage } from "@/types/book";

/**
 * Hard ceiling on free-preview pages. No configuration (Admin value or local
 * default) may expose more than this many pages publicly, and the secure
 * preview PDF is only ever generated with up to this many pages.
 */
export const MAX_PREVIEW_PAGE_COUNT = 10;

/**
 * Default number of free-preview pages when the Admin has not configured one.
 * The reader never shows more than this, and the "free preview ended" prompt
 * appears once the reader reaches the limit.
 */
export const DEFAULT_PREVIEW_PAGE_COUNT = MAX_PREVIEW_PAGE_COUNT;

/** Clamp any configured preview count to the safe range `[0, MAX]`. */
export function clampPreviewPageCount(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PREVIEW_PAGE_COUNT;
  return Math.max(0, Math.min(Math.floor(value), MAX_PREVIEW_PAGE_COUNT));
}

/**
 * Real book configuration for hscenglishlasthour.
 *
 * Since no specific title/price/content have been supplied for the HSC English
 * book in this repository, the values below are neutral defaults that can be
 * overridden by an Admin (future phase) or loaded from Supabase. No fabricated
 * marketing text has been added.
 */
export const realBookConfig: BookConfig = {
  id: "hscenglishlasthour",
  title: "HSC English Last Hour",
  author: "HSC English Last Hour", // display name; stable ID kept as slug below
  description: "",
  coverImageUrl: null,
  coverImagePath: null,
  pricing: {
    price: 350,
    offerPrice: null,
    deliveryCharge: 60,
    currency: "BDT",
  },
  content: {
    contentMode: "page-images",
    pdfUrl: null,
    pdfStoragePath: null,
    pages: [],
  },
  reader: {
    defaultMode: "flip",
    pageAspectRatio: 1064 / 760,
    flipEnabled: true,
    pdfEnabled: true,
    minZoom: 0.75,
    maxZoom: 2.5,
  },
  market: {
    country: "Bangladesh",
    currency: "BDT",
    phoneRegion: "BD",
  },
  isPublished: true,
  previewPageCount: DEFAULT_PREVIEW_PAGE_COUNT,
};

/**
 * Dev preview fixture config. This exposes neutral preview pages + a neutral
 * PDF to demonstrate the reader (spread on desktop, single page on mobile,
 * zoom, fit, modes). It is only used when content is unavailable and the
 * environment is development. No "sample/development/fixture" labels appear in
 * the public UI.
 */
const DEV_PREVIEW_PAGE_COUNT = 8;

const devPreviewPages: BookPage[] = Array.from({ length: DEV_PREVIEW_PAGE_COUNT }, (_, index) => {
  const number = index + 1;
  const padded = String(number).padStart(2, "0");
  return {
    number,
    imageUrl: `/preview/pages/page-${padded}.png`,
    alt: `Book page ${number}`,
  };
});

export const devPreviewConfig: BookConfig = {
  ...realBookConfig,
  content: {
    contentMode: "page-images",
    pdfUrl: "/preview/book.pdf",
    pdfStoragePath: null,
    pages: devPreviewPages,
  },
  previewPageCount: DEFAULT_PREVIEW_PAGE_COUNT,
  reader: {
    ...realBookConfig.reader,
    defaultMode: "flip",
  },
};

export const bookConfig = realBookConfig;

/** Backwards-compatible helper: returns the active book config used by the app. */
export function getActiveBookConfig(config: BookConfig = realBookConfig): BookConfig {
  const hasContent = (config.content.pages.length > 0 || Boolean(config.content.pdfUrl));
  if (hasContent) {
    return {
      ...config,
      content: {
        ...config.content,
        pages: getPreviewPages(config),
      },
    };
  }
  if (process.env.NODE_ENV === "development") {
    return {
      ...devPreviewConfig,
      content: {
        ...devPreviewConfig.content,
        pages: getPreviewPages(devPreviewConfig),
      },
    };
  }
  return {
    ...config,
    content: {
      ...config.content,
      pages: [],
    },
  };
}

/** Pages that are publicly readable, never more than the hard preview ceiling. */
export function getPreviewPages(config: BookConfig = getActiveBookConfig()): BookPage[] {
  const limit = Math.min(
    clampPreviewPageCount(config.previewPageCount),
    config.content.pages.length,
  );
  return config.content.pages.slice(0, limit);
}

export function getPreviewPageCount(config: BookConfig = getActiveBookConfig()): number {
  return getPreviewPages(config).length;
}

export function getBookPricing(config: BookConfig = getActiveBookConfig()) {
  return config.pricing;
}
