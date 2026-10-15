/**
 * Stable object-path conventions inside the private `book-assets` bucket.
 *
 *   books/{bookId}/cover.{ext}          cover image
 *   books/{bookId}/book.pdf             full book PDF (never served publicly)
 *   books/{bookId}/preview.pdf          optional pre-trimmed preview PDF
 *   books/{bookId}/pages/{n}.{ext}      individual page images
 *
 * Keeping these deterministic lets the Admin Panel replace files in place and
 * lets the server derive paths from the database without storing duplicates.
 */

export function buildCoverPath(bookId: string, extension = "webp"): string {
  return `books/${bookId}/cover.${normalizeExt(extension)}`;
}

export function buildPdfPath(bookId: string): string {
  return `books/${bookId}/book.pdf`;
}

export function buildPreviewPdfPath(bookId: string): string {
  return `books/${bookId}/preview.pdf`;
}

export function buildPagePath(bookId: string, pageNumber: number, extension = "webp"): string {
  return `books/${bookId}/pages/${String(pageNumber).padStart(3, "0")}.${normalizeExt(extension)}`;
}

export function bookFolder(bookId: string): string {
  return `books/${bookId}`;
}

function normalizeExt(extension: string): string {
  return extension.replace(/^\./, "").toLowerCase();
}
