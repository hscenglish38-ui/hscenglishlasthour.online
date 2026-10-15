import "server-only";

import { PDFDocument } from "pdf-lib";

/**
 * Produce a preview-only PDF containing at most `pageCount` pages from the
 * source PDF. This is the core of the preview-protection strategy: the public
 * reader is never handed the full document, only a trimmed copy.
 *
 * Returns null when the input is not a readable PDF or pageCount <= 0.
 */
export async function buildPreviewPdf(
  sourceBytes: Uint8Array,
  pageCount: number,
): Promise<Uint8Array | null> {
  if (!sourceBytes || sourceBytes.byteLength === 0 || pageCount <= 0) return null;

  try {
    const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
    const total = source.getPageCount();
    const take = Math.min(pageCount, total);
    if (take <= 0) return null;

    const preview = await PDFDocument.create();
    const indices = Array.from({ length: take }, (_, index) => index);
    const copied = await preview.copyPages(source, indices);
    for (const page of copied) preview.addPage(page);

    preview.setProducer("HSC English Last Hour");
    preview.setCreator("HSC English Last Hour");

    return await preview.save();
  } catch {
    return null;
  }
}
