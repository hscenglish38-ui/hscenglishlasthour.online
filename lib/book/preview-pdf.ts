import "server-only";

import { PDFDocument } from "pdf-lib";
import { MAX_PREVIEW_PAGE_COUNT } from "./config";

/**
 * Marker stored in the generated preview PDF's `Subject` metadata. It records
 * the preview limit the file was generated for, so the server can detect a
 * stale cache after the Admin changes `preview_page_count` (and regenerate it
 * rather than serving a preview of the wrong length).
 */
export const PREVIEW_LIMIT_SUBJECT_PREFIX = "hsc-preview-limit:";

/**
 * Produce a preview-only PDF containing at most `pageCount` pages from the
 * source PDF. This is the core of the preview-protection strategy: the public
 * reader is never handed the full document, only a trimmed copy.
 *
 * The requested page count is clamped to {@link MAX_PREVIEW_PAGE_COUNT}, so the
 * generated preview can never expose more than the hard public ceiling. When the
 * source has fewer pages, only the available pages are copied.
 *
 * Returns null when the input is not a readable PDF or the effective page count
 * is not positive.
 */
export async function buildPreviewPdf(
  sourceBytes: Uint8Array,
  pageCount: number,
): Promise<Uint8Array | null> {
  if (!sourceBytes || sourceBytes.byteLength === 0) return null;

  const requested = Math.min(Math.floor(pageCount), MAX_PREVIEW_PAGE_COUNT);
  if (!Number.isFinite(requested) || requested <= 0) return null;

  try {
    const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
    const total = source.getPageCount();
    const take = Math.min(requested, total);
    if (take <= 0) return null;

    const preview = await PDFDocument.create();
    const indices = Array.from({ length: take }, (_, index) => index);
    const copied = await preview.copyPages(source, indices);
    for (const page of copied) preview.addPage(page);

    preview.setProducer("HSC English Last Hour");
    preview.setCreator("HSC English Last Hour");
    preview.setSubject(`${PREVIEW_LIMIT_SUBJECT_PREFIX}${requested}`);

    return await preview.save();
  } catch {
    return null;
  }
}

export interface PreviewPdfInfo {
  /** Preview limit the file was generated for, or null when unmarked/legacy. */
  limit: number | null;
  /** Actual number of pages in the preview file. */
  pageCount: number;
}

/**
 * Read the preview limit marker and the real page count from a cached preview
 * PDF without modifying it. Returns null when the bytes are not a readable PDF.
 */
export async function readPreviewPdfInfo(bytes: Uint8Array): Promise<PreviewPdfInfo | null> {
  if (!bytes || bytes.byteLength === 0) return null;

  try {
    const doc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    const subject = (doc.getSubject() ?? "").trim();
    const match = /^hsc-preview-limit:(\d+)$/.exec(subject);
    return {
      limit: match ? Number(match[1]) : null,
      pageCount: doc.getPageCount(),
    };
  } catch {
    return null;
  }
}
