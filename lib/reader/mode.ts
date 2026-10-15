import type { BookConfig, ReadingMode } from "@/types/book";

export interface ReaderModeAvailability {
  /** Page-image (flip) mode can render. */
  flip: boolean;
  /** PDF mode can render. */
  pdf: boolean;
}

/**
 * Which reader modes the current content and reader settings actually support.
 *
 * The flip (book-style) reader renders page images when they exist, and falls
 * back to rendering the secure preview PDF's pages when there are no page
 * images. So a PDF-only book still has a book-style reading experience.
 */
export function getModeAvailability(book: BookConfig): ReaderModeAvailability {
  const hasPages = book.content.pages.length > 0;
  const hasPdf = Boolean(book.content.pdfUrl);
  return {
    flip: (hasPages || hasPdf) && book.reader.flipEnabled,
    pdf: hasPdf && book.reader.pdfEnabled,
  };
}

/**
 * The mode the reader should open in.
 *
 * The book-style flip reader is the primary reading experience, so the Admin's
 * configured `defaultMode` wins whenever that mode can actually render. If it
 * cannot (e.g. "pdf" with no PDF), we fall back to whichever mode is available
 * so the reader never opens empty.
 */
export function resolveInitialMode(book: BookConfig): ReadingMode {
  const { flip, pdf } = getModeAvailability(book);
  const preferred = book.reader.defaultMode;
  if (preferred === "flip" && flip) return "flip";
  if (preferred === "pdf" && pdf) return "pdf";
  if (flip) return "flip";
  if (pdf) return "pdf";
  return preferred;
}

/**
 * Keep `mode` when it is still available; otherwise switch to the other
 * available mode. Used when live content changes (e.g. every page image is
 * removed after the PDF is uploaded — the flip reader keeps working by
 * rendering the PDF pages instead).
 */
export function coerceMode(mode: ReadingMode, book: BookConfig): ReadingMode {
  const { flip, pdf } = getModeAvailability(book);
  if (mode === "flip" && !flip && pdf) return "pdf";
  if (mode === "pdf" && !pdf && flip) return "flip";
  return mode;
}
