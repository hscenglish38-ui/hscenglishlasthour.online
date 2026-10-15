import { describe, expect, it } from "vitest";
import type { BookConfig } from "@/types/book";
import { coerceMode, getModeAvailability, resolveInitialMode } from "./mode";

function makeBook(
  overrides: {
    contentMode?: BookConfig["content"]["contentMode"];
    defaultMode?: BookConfig["reader"]["defaultMode"];
    pages?: number;
    pdf?: boolean;
    flipEnabled?: boolean;
    pdfEnabled?: boolean;
  } = {},
): BookConfig {
  const {
    contentMode = "page-images",
    defaultMode = "flip",
    pages = 0,
    pdf = false,
    flipEnabled = true,
    pdfEnabled = true,
  } = overrides;
  return {
    id: "hscenglishlasthour",
    title: "Title",
    author: "Author",
    description: "",
    coverImageUrl: null,
    coverImagePath: null,
    pricing: { price: 350, offerPrice: null, deliveryCharge: 60, currency: "BDT" },
    content: {
      contentMode,
      pdfUrl: pdf ? "/api/book/preview-pdf?bookId=hscenglishlasthour" : null,
      pdfStoragePath: pdf ? "books/hscenglishlasthour/book.pdf" : null,
      pages: Array.from({ length: pages }, (_, index) => ({
        number: index + 1,
        imageUrl: `/img/${index + 1}.png`,
        alt: `Page ${index + 1}`,
      })),
    },
    reader: {
      defaultMode,
      pageAspectRatio: 1.4,
      flipEnabled,
      pdfEnabled,
      minZoom: 0.75,
      maxZoom: 2.5,
    },
    market: { country: "Bangladesh", currency: "BDT", phoneRegion: "BD" },
    isPublished: true,
    previewPageCount: 4,
  };
}

describe("getModeAvailability", () => {
  it("reports both modes when both sources exist and are enabled", () => {
    expect(getModeAvailability(makeBook({ pages: 2, pdf: true }))).toEqual({
      flip: true,
      pdf: true,
    });
  });

  it("reports flip AND pdf for a PDF-only book (flip renders the PDF pages)", () => {
    expect(getModeAvailability(makeBook({ pages: 0, pdf: true }))).toEqual({
      flip: true,
      pdf: true,
    });
  });

  it("reports neither mode when there is no content", () => {
    expect(getModeAvailability(makeBook({ pages: 0, pdf: false }))).toEqual({
      flip: false,
      pdf: false,
    });
  });

  it("respects the enabled flags", () => {
    expect(getModeAvailability(makeBook({ pages: 2, pdf: true, pdfEnabled: false }))).toEqual({
      flip: true,
      pdf: false,
    });
    expect(getModeAvailability(makeBook({ pages: 2, pdf: true, flipEnabled: false }))).toEqual({
      flip: false,
      pdf: true,
    });
  });

  it("disables flip for a PDF-only book when flipEnabled is false", () => {
    expect(getModeAvailability(makeBook({ pages: 0, pdf: true, flipEnabled: false }))).toEqual({
      flip: false,
      pdf: true,
    });
  });
});

describe("resolveInitialMode", () => {
  it("opens a PDF-only book in the book-style flip reader (book reading is primary)", () => {
    expect(resolveInitialMode(makeBook({ contentMode: "pdf", pages: 0, pdf: true }))).toBe("flip");
    expect(resolveInitialMode(makeBook({ contentMode: "page-images", pages: 0, pdf: true }))).toBe(
      "flip",
    );
  });

  it("opens page-image books in flip mode", () => {
    expect(resolveInitialMode(makeBook({ contentMode: "page-images", pages: 3, pdf: false }))).toBe(
      "flip",
    );
  });

  it("honours an explicit defaultMode of 'pdf' (plain viewer) when a PDF exists", () => {
    expect(
      resolveInitialMode(makeBook({ contentMode: "pdf", pages: 0, pdf: true, defaultMode: "pdf" })),
    ).toBe("pdf");
    expect(
      resolveInitialMode(
        makeBook({ contentMode: "page-images", pages: 3, pdf: true, defaultMode: "pdf" }),
      ),
    ).toBe("pdf");
  });

  it("falls back to PDF when flip is disabled but a PDF exists", () => {
    expect(resolveInitialMode(makeBook({ pages: 3, pdf: true, flipEnabled: false }))).toBe("pdf");
    expect(resolveInitialMode(makeBook({ pages: 0, pdf: true, flipEnabled: false }))).toBe("pdf");
  });

  it("falls back to flip when PDF is disabled but page images exist", () => {
    expect(
      resolveInitialMode(makeBook({ contentMode: "pdf", pages: 3, pdf: true, pdfEnabled: false })),
    ).toBe("flip");
  });

  it("uses defaultMode when there is no content", () => {
    expect(resolveInitialMode(makeBook({ pages: 0, pdf: false, defaultMode: "flip" }))).toBe("flip");
    expect(resolveInitialMode(makeBook({ pages: 0, pdf: false, defaultMode: "pdf" }))).toBe("pdf");
  });
});

describe("coerceMode", () => {
  it("keeps flip when page images disappear but a PDF remains", () => {
    expect(coerceMode("flip", makeBook({ pages: 0, pdf: true }))).toBe("flip");
  });

  it("switches pdf -> flip when the PDF disappears", () => {
    expect(coerceMode("pdf", makeBook({ pages: 3, pdf: false }))).toBe("flip");
  });

  it("switches flip -> pdf when flip is disabled", () => {
    expect(coerceMode("flip", makeBook({ pages: 3, pdf: true, flipEnabled: false }))).toBe("pdf");
  });

  it("keeps an available mode unchanged", () => {
    expect(coerceMode("flip", makeBook({ pages: 3, pdf: true }))).toBe("flip");
    expect(coerceMode("pdf", makeBook({ pages: 3, pdf: true }))).toBe("pdf");
  });

  it("keeps the mode when no alternative exists", () => {
    expect(coerceMode("flip", makeBook({ pages: 0, pdf: false }))).toBe("flip");
    expect(coerceMode("pdf", makeBook({ pages: 0, pdf: false }))).toBe("pdf");
  });
});
