import "server-only";

import type { BookContentMode, BookConfig, BookPage, ReadingMode } from "@/types/book";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";
import { createSignedUrls } from "@/lib/supabase/storage";
import { getActiveBookConfig, getPreviewPages, realBookConfig } from "./config";

export const BOOKS_TABLE = "books";
export const BOOK_PAGES_TABLE = "book_pages";

type Row = Record<string, unknown>;

function asTrimmedString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** Postgres `numeric` arrives as a string in JS; accept both. */
function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseContentMode(value: unknown): BookContentMode | null {
  return value === "page-images" || value === "pdf" ? value : null;
}

function parseReadingMode(value: unknown): ReadingMode | null {
  return value === "flip" || value === "pdf" ? value : null;
}

export interface MapBookOptions {
  /** Resolve a storage path to a usable URL (signed URL). Defaults to identity. */
  resolveUrl?: (path: string) => string | null;
}

/**
 * Map a Supabase `books` row (+ its `book_pages` rows) onto the `BookConfig`
 * shape, filling missing fields from the neutral local defaults. Admin-authored
 * data always wins; nothing is fabricated when a field is absent.
 *
 * Pure and synchronous so it can be unit-tested without a live backend.
 */
export function mapBookRow(book: Row, pageRows: Row[], options: MapBookOptions = {}): BookConfig {
  const base = realBookConfig;
  const resolveUrl = options.resolveUrl ?? ((path: string) => path);

  const previewPageCount = asNumber(book.preview_page_count);

  const pages: BookPage[] = pageRows
    .map((row, index) => {
      const storagePath = asTrimmedString(row.storage_path);
      const number = asNumber(row.page_number) ?? index + 1;
      const url = storagePath ? resolveUrl(storagePath) : null;
      if (!url) return null;
      return {
        number,
        imageUrl: url,
        ...(storagePath ? { storagePath } : {}),
        alt: asTrimmedString(row.alt) ?? `Book page ${number}`,
      } satisfies BookPage;
    })
    .filter((page): page is BookPage => page !== null)
    .sort((a, b) => a.number - b.number);

  const contentMode =
    parseContentMode(book.content_mode) ?? (pages.length > 0 ? "page-images" : base.content.contentMode);

  const pdfStoragePath = asTrimmedString(book.pdf_storage_path);
  const coverImagePath = asTrimmedString(book.cover_image_path);
  const bookId = asTrimmedString(book.id) ?? base.id;
  const updatedAt = asTrimmedString(book.updated_at);

  const config: BookConfig = {
    id: bookId,
    title: asTrimmedString(book.title) ?? base.title,
    author: asTrimmedString(book.author) ?? base.author,
    description: asTrimmedString(book.description) ?? base.description,
    coverImageUrl: coverImagePath ? resolveUrl(coverImagePath) : null,
    coverImagePath: coverImagePath ?? null,
    pricing: {
      price: asNumber(book.price) ?? base.pricing.price,
      offerPrice: asNumber(book.offer_price),
      deliveryCharge: asNumber(book.delivery_charge) ?? base.pricing.deliveryCharge,
      currency: book.currency === "BDT" ? "BDT" : base.pricing.currency,
    },
    content: {
      contentMode,
      // The full PDF is never exposed. PDF mode streams a server-trimmed preview.
      pdfUrl: pdfStoragePath
        ? `/api/book/preview-pdf?bookId=${encodeURIComponent(bookId)}${updatedAt ? `&v=${encodeURIComponent(updatedAt)}` : ""}`
        : null,
      pdfStoragePath: pdfStoragePath ?? null,
      pages,
    },
    reader: {
      defaultMode: parseReadingMode(book.default_mode) ?? base.reader.defaultMode,
      pageAspectRatio: asNumber(book.page_aspect_ratio) ?? base.reader.pageAspectRatio,
      flipEnabled: asBoolean(book.flip_enabled, base.reader.flipEnabled),
      pdfEnabled: asBoolean(book.pdf_enabled, base.reader.pdfEnabled),
      minZoom: asNumber(book.min_zoom) ?? base.reader.minZoom,
      maxZoom: asNumber(book.max_zoom) ?? base.reader.maxZoom,
    },
    market: {
      country: asTrimmedString(book.market_country) ?? base.market.country,
      currency: "BDT",
      phoneRegion: asTrimmedString(book.phone_region) ?? base.market.phoneRegion,
    },
    // Fail closed: a DB row without an explicit flag is treated as unpublished.
    isPublished: asBoolean(book.is_published, false),
    previewPageCount: previewPageCount ?? (pages.length > 0 ? pages.length : base.previewPageCount),
    updatedAt: updatedAt ?? undefined,
  };

  return config;
}

/**
 * The backend is configured but no published book row is available (the row is
 * missing, or the read failed). Return the neutral display config for the page,
 * but close ordering: `orders.book_id` references `books(id)`, so an order for a
 * book that does not exist in the database would violate that foreign key.
 */
function closeOrdering(config: BookConfig): BookConfig {
  return { ...config, isPublished: false };
}

/** Strip all readable content from an unpublished book before it reaches the public. */
function withoutContent(config: BookConfig): BookConfig {
  return {
    ...config,
    content: {
      contentMode: config.content.contentMode,
      pdfUrl: null,
      pdfStoragePath: null,
      pages: [],
    },
  };
}

/**
 * Load the authoritative published book configuration on the server.
 *
 * Reads `books` + `book_pages` with the privileged key and mints short-lived
 * signed URLs for the cover and the first `preview_page_count` page images.
 * Falls back to the local configuration (and the development preview) when
 * Supabase is unconfigured, the row is missing, or the read fails. Never
 * throws, so checkout always has a configuration to price against.
 *
 * Unpublished books are returned with `isPublished: false` and no content.
 *
 * Server-only: uses the secret key. Do not import into client code.
 */
export async function loadPublishedBook(bookId?: string): Promise<BookConfig> {
  const id = asTrimmedString(bookId) ?? realBookConfig.id;

  if (!isSupabaseAdminConfigured()) {
    return getActiveBookConfig(realBookConfig);
  }

  try {
    const supabase = getSupabaseAdminClient();

    const { data: book, error } = await supabase
      .from(BOOKS_TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !book) {
      return closeOrdering(getActiveBookConfig(realBookConfig));
    }

    const mapped = mapBookRow(book as Row, []); // first pass: no pages, to read limit + cover path
    const limit = Math.max(0, mapped.previewPageCount);

    const { data: pageRowsRaw } = await supabase
      .from(BOOK_PAGES_TABLE)
      .select("storage_path, page_number, alt, is_available")
      .eq("book_id", id)
      .eq("is_available", true)
      .order("page_number", { ascending: true })
      .limit(limit);

    const pageRows = (pageRowsRaw ?? []) as Row[];

    const paths: string[] = [];
    if (mapped.coverImagePath) paths.push(mapped.coverImagePath);
    for (const row of pageRows) {
      const path = asTrimmedString(row.storage_path);
      if (path) paths.push(path);
    }

    const signed = await createSignedUrls(paths);
    const resolveUrl = (path: string) => signed[path] ?? null;

    const config = mapBookRow(book as Row, pageRows, { resolveUrl });

    if (!config.isPublished) {
      return withoutContent(config);
    }

    return {
      ...config,
      content: { ...config.content, pages: getPreviewPages(config) },
    };
  } catch {
    return closeOrdering(getActiveBookConfig(realBookConfig));
  }
}
