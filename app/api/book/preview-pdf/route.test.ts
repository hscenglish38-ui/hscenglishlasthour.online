// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import type { BookConfig } from "@/types/book";

const { isConfigured, loadBook, store, uploadMock } = vi.hoisted(() => ({
  isConfigured: vi.fn(() => true),
  loadBook: vi.fn(),
  store: new Map<string, Uint8Array>(),
  uploadMock: vi.fn(async () => ({ data: { path: "ok" }, error: null })),
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseAdminConfigured: isConfigured,
  getSupabaseBookBucket: () => "book-assets",
}));

vi.mock("@/lib/book/source", () => ({ loadPublishedBook: loadBook }));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => ({ storage: { from: () => ({ upload: uploadMock }) } }),
}));

vi.mock("@/lib/supabase/storage", () => ({
  objectExists: vi.fn(async (path: string) => store.has(path)),
  downloadObject: vi.fn(async (path: string) => store.get(path) ?? null),
}));

import { GET } from "./route";
import { buildPreviewPdf } from "@/lib/book/preview-pdf";
import { realBookConfig } from "@/lib/book/config";

const PREVIEW_PATH = "books/hscenglishlasthour/preview.pdf";
const FULL_PATH = "books/hscenglishlasthour/book.pdf";

async function makePdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let index = 0; index < pages; index += 1) doc.addPage([300, 400]);
  return doc.save();
}

function bookWith(previewPageCount: number): BookConfig {
  return {
    ...realBookConfig,
    isPublished: true,
    previewPageCount,
    content: {
      ...realBookConfig.content,
      contentMode: "pdf",
      pdfStoragePath: FULL_PATH,
      pdfUrl: "/api/book/preview-pdf?bookId=hscenglishlasthour",
    },
  };
}

function request(query = "") {
  return new Request(`http://localhost/api/book/preview-pdf?bookId=hscenglishlasthour${query}`);
}

async function pageCount(response: Response): Promise<number> {
  const bytes = new Uint8Array(await response.arrayBuffer());
  const doc = await PDFDocument.load(bytes);
  return doc.getPageCount();
}

beforeEach(() => {
  isConfigured.mockReturnValue(true);
  store.clear();
  uploadMock.mockClear();
  loadBook.mockReset();
  loadBook.mockResolvedValue(bookWith(10));
});

describe("GET /api/book/preview-pdf", () => {
  it("serves a cached preview that matches the current limit", async () => {
    store.set(PREVIEW_PATH, (await buildPreviewPdf(await makePdf(15), 10))!);

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Preview-Source")).toBe("stored");
    expect(await pageCount(response)).toBe(10);
  });

  it("regenerates a stale 4-page cache up to the 10-page limit", async () => {
    // Legacy 4-page cache with no limit marker while the book allows 10.
    store.set(PREVIEW_PATH, (await buildPreviewPdf(await makePdf(14), 4))!);
    store.set(FULL_PATH, await makePdf(14));

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Preview-Source")).toBe("trimmed");
    expect(await pageCount(response)).toBe(10);
    expect(uploadMock).toHaveBeenCalledTimes(1);
  });

  it("never serves more pages than the limit, even from an oversized cache", async () => {
    store.set(PREVIEW_PATH, (await buildPreviewPdf(await makePdf(40), 10))!);
    // Tamper: re-generate a longer file (as if the limit had been higher before).
    const oversized = await buildPreviewPdf(await makePdf(40), 10);
    expect((await PDFDocument.load(oversized!)).getPageCount()).toBe(10);
    store.set(PREVIEW_PATH, oversized!);
    // Simulate the limit dropping to 4: the cached file (marker 10) is stale.
    loadBook.mockResolvedValue(bookWith(4));
    store.set(FULL_PATH, await makePdf(40));

    const response = await GET(request());

    expect(response.headers.get("X-Preview-Source")).toBe("trimmed");
    expect(await pageCount(response)).toBe(4);
  });

  it("serves only the available pages when the source is shorter than the limit", async () => {
    store.set(FULL_PATH, await makePdf(6));

    const response = await GET(request());

    expect(response.headers.get("X-Preview-Source")).toBe("trimmed");
    expect(await pageCount(response)).toBe(6);
  });

  it("ignores page-range parameters (no way to read beyond the preview)", async () => {
    store.set(FULL_PATH, await makePdf(40));

    const response = await GET(request("&page=39"));

    expect(await pageCount(response)).toBe(10);
  });

  it("caps the preview at 10 even when the book is misconfigured higher", async () => {
    loadBook.mockResolvedValue(bookWith(50));
    store.set(FULL_PATH, await makePdf(60));

    const response = await GET(request());

    expect(await pageCount(response)).toBe(10);
  });

  it("returns 404 when the book is not published", async () => {
    loadBook.mockResolvedValue({ ...bookWith(10), isPublished: false });
    expect((await GET(request())).status).toBe(404);
  });

  it("returns 404 when the preview limit is zero", async () => {
    loadBook.mockResolvedValue(bookWith(0));
    expect((await GET(request())).status).toBe(404);
  });

  it("returns 404 when Supabase is not configured", async () => {
    isConfigured.mockReturnValue(false);
    expect((await GET(request())).status).toBe(404);
  });
});
