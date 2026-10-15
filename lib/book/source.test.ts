import { beforeEach, describe, expect, it, vi } from "vitest";

const { isConfigured, booksResult, pagesResult, signed } = vi.hoisted(() => ({
  isConfigured: vi.fn(() => true),
  booksResult: { data: null as Record<string, unknown> | null, error: null as unknown },
  pagesResult: { data: [] as Record<string, unknown>[], error: null as unknown },
  signed: vi.fn(async (paths: string[]) =>
    Object.fromEntries(paths.map((p) => [p, `https://signed.test/${p}`])),
  ),
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseAdminConfigured: isConfigured,
  getSupabaseBookBucket: () => "book-assets",
}));

vi.mock("@/lib/supabase/storage", () => ({
  createSignedUrls: signed,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => ({
    from: (table: string) => {
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      builder.select = chain;
      builder.eq = chain;
      builder.order = chain;
      builder.limit = chain;
      builder.maybeSingle = () => Promise.resolve(booksResult);
      // Allow `await builder` (used for the book_pages query).
      builder.then = (resolve: (value: unknown) => unknown) =>
        resolve(table === "books" ? booksResult : pagesResult);
      return builder;
    },
  }),
}));

import { loadPublishedBook, mapBookRow } from "./source";
import { DEFAULT_PREVIEW_PAGE_COUNT } from "./config";

describe("mapBookRow", () => {
  it("maps a full Supabase row onto the BookConfig shape", () => {
    const config = mapBookRow(
      {
        id: "hscenglishlasthour",
        title: "HSC English Last Hour",
        author: "Author",
        description: "Desc",
        cover_image_path: "books/x/cover.webp",
        content_mode: "page-images",
        pdf_storage_path: "books/x/book.pdf",
        price: "500.00",
        offer_price: "400.00",
        delivery_charge: "80.00",
        currency: "BDT",
        default_mode: "pdf",
        page_aspect_ratio: "1.4000",
        flip_enabled: false,
        is_published: true,
        preview_page_count: 2,
      },
      [
        { page_number: 2, storage_path: "books/x/pages/002.webp" },
        { page_number: 1, storage_path: "books/x/pages/001.webp" },
      ],
      { resolveUrl: (path) => `https://signed.test/${path}` },
    );

    expect(config.id).toBe("hscenglishlasthour");
    expect(config.title).toBe("HSC English Last Hour");
    expect(config.pricing).toEqual({ price: 500, offerPrice: 400, deliveryCharge: 80, currency: "BDT" });
    expect(config.coverImageUrl).toBe("https://signed.test/books/x/cover.webp");
    expect(config.content.pdfUrl).toContain("/api/book/preview-pdf");
    expect(config.content.pages.map((p) => p.number)).toEqual([1, 2]);
    expect(config.content.pages[0].alt).toBe("Book page 1");
    expect(config.reader.defaultMode).toBe("pdf");
    expect(config.reader.flipEnabled).toBe(false);
    expect(config.previewPageCount).toBe(2);
  });

  it("falls back to neutral defaults for missing fields", () => {
    const config = mapBookRow({ id: "hscenglishlasthour", title: "Only a title" }, []);
    expect(config.title).toBe("Only a title");
    expect(config.pricing.price).toBeGreaterThan(0);
    expect(config.content.pages).toEqual([]);
    expect(config.isPublished).toBe(false); // DB default is unpublished
    expect(config.previewPageCount).toBe(DEFAULT_PREVIEW_PAGE_COUNT);
  });

  it("ignores malformed pages and non-BDT currency values", () => {
    const config = mapBookRow(
      {
        pricing: { price: 100 },
        price: "100.00",
        delivery_charge: "20.00",
        currency: "USD",
        preview_page_count: 5,
      },
      [{ page_number: 1 }, { storage_path: "ok.webp" }, { page_number: 3, storage_path: "bad.webp" }],
      { resolveUrl: (path) => (path === "ok.webp" ? "/ok.png" : null) },
    );
    expect(config.pricing.currency).toBe("BDT");
    expect(config.content.pages).toHaveLength(1);
    expect(config.content.pages[0].imageUrl).toBe("/ok.png");
  });
});

describe("loadPublishedBook", () => {
  beforeEach(() => {
    isConfigured.mockReturnValue(true);
    booksResult.data = null;
    booksResult.error = null;
    pagesResult.data = [];
    signed.mockClear();
  });

  it("loads and maps the book row when it exists", async () => {
    booksResult.data = {
      id: "hscenglishlasthour",
      title: "From Supabase",
      price: "250.00",
      delivery_charge: "50.00",
      currency: "BDT",
      is_published: true,
      preview_page_count: 4,
    };
    pagesResult.data = [
      { storage_path: "books/x/pages/001.webp", page_number: 1, is_available: true },
    ];

    const config = await loadPublishedBook("hscenglishlasthour");
    expect(config.title).toBe("From Supabase");
    expect(config.pricing.price).toBe(250);
    expect(signed).toHaveBeenCalled();
  });

  it("closes ordering when the backend is configured but the row is missing", async () => {
    const config = await loadPublishedBook("does-not-exist");
    expect(config.id).toBe("hscenglishlasthour");
    expect(config.isPublished).toBe(false);
  });

  it("falls back to the local config (orderable) when Supabase is not configured", async () => {
    isConfigured.mockReturnValue(false);
    const config = await loadPublishedBook();
    expect(config.id).toBe("hscenglishlasthour");
    expect(config.isPublished).toBe(true);
  });

  it("closes ordering when the read fails", async () => {
    booksResult.error = new Error("network down");
    const config = await loadPublishedBook("hscenglishlasthour");
    expect(config.isPublished).toBe(false);
  });

  it("strips content for an unpublished book", async () => {
    booksResult.data = {
      id: "hscenglishlasthour",
      title: "Draft",
      is_published: false,
      preview_page_count: 4,
    };
    pagesResult.data = [{ storage_path: "books/x/pages/001.webp", page_number: 1 }];

    const config = await loadPublishedBook("hscenglishlasthour");
    expect(config.isPublished).toBe(false);
    expect(config.content.pages).toEqual([]);
    expect(config.content.pdfUrl).toBeNull();
  });

  it("never throws when the read fails", async () => {
    booksResult.error = new Error("network down");
    await expect(loadPublishedBook("hscenglishlasthour")).resolves.toMatchObject({
      id: "hscenglishlasthour",
    });
  });
});
