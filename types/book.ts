export type ReadingMode = "flip" | "pdf";

/**
 * How the book's preview content is primarily delivered.
 * `page-images` = a set of page images; `pdf` = a single PDF document.
 * The reader can still expose both modes when both sources exist.
 */
export type BookContentMode = "page-images" | "pdf";

export type Currency = "BDT";

export interface BookPricing {
  /** Integer amount in the store currency's minor unit. BDT is treated as integer taka. */
  price: number;
  /** Optional discounted/offer price (integer BDT). When set it is the amount charged. */
  offerPrice?: number | null;
  deliveryCharge: number;
  currency: Currency;
}

export interface BookPage {
  /** 1-based page number. */
  number: number;
  /** Public URL of the page image. */
  imageUrl: string;
  /** Storage path used by the future Admin Panel to manage the asset. */
  storagePath?: string;
  alt: string;
}

export interface BookReaderSettings {
  defaultMode: ReadingMode;
  /** Aspect ratio (height / width) used to lay out each page. */
  pageAspectRatio: number;
  flipEnabled: boolean;
  pdfEnabled: boolean;
  minZoom: number;
  maxZoom: number;
}

export interface BookMarketSettings {
  country: string;
  currency: Currency;
  /** ISO 3166-1 alpha-2 region used for phone-number validation. */
  phoneRegion: string;
}

/**
 * The complete description of the single book sold by this site.
 *
 * The shape mirrors a `books` row (with its `book_pages` children) so the Admin
 * Panel can manage every field without the reader/checkout being rewritten.
 */
export interface BookConfig {
  /** Database id and route key, e.g. `hscenglishlasthour`. */
  id: string;
  title: string;
  author: string;
  description: string;
  /** Public-facing cover image URL, or null when none is configured. */
  coverImageUrl: string | null;
  /** Storage path of the cover asset (Admin-managed). */
  coverImagePath: string | null;
  pricing: BookPricing;
  content: {
    /** Primary reading format used to choose the default reader mode. */
    contentMode: BookContentMode;
    /** Public URL of the full/preview PDF, or null when unavailable. */
    pdfUrl: string | null;
    /** Storage path of the PDF asset (Admin-managed, kept private in production). */
    pdfStoragePath: string | null;
    /** Preview pages made publicly readable (already limited by previewPageCount). */
    pages: BookPage[];
  };
  reader: BookReaderSettings;
  market: BookMarketSettings;
  /** When false, the book cannot be ordered (ordering is closed). */
  isPublished: boolean;
  /** Number of preview pages made publicly readable. Managed by Admin. */
  previewPageCount: number;
  /** ISO timestamp of the last Admin update, when known. */
  updatedAt?: string;
}
