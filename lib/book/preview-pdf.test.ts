import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { MAX_PREVIEW_PAGE_COUNT } from "./config";
import { buildPreviewPdf, readPreviewPdfInfo } from "./preview-pdf";

async function makePdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let index = 0; index < pages; index += 1) doc.addPage([300, 400]);
  return doc.save();
}

describe("buildPreviewPdf", () => {
  it("caps the preview at the maximum when the source is longer", async () => {
    const out = await buildPreviewPdf(await makePdf(15), 10);
    expect(out).not.toBeNull();
    const info = await readPreviewPdfInfo(out!);
    expect(info?.pageCount).toBe(10);
    expect(info?.limit).toBe(10);
  });

  it("clamps a request above the ceiling", async () => {
    const out = await buildPreviewPdf(await makePdf(30), 50);
    expect((await readPreviewPdfInfo(out!))?.pageCount).toBe(MAX_PREVIEW_PAGE_COUNT);
  });

  it("serves only the available pages when the source is shorter", async () => {
    const out = await buildPreviewPdf(await makePdf(6), 10);
    const info = await readPreviewPdfInfo(out!);
    expect(info?.pageCount).toBe(6);
    expect(info?.limit).toBe(10);
  });

  it("preserves page order, copying from the first page", async () => {
    const source = await PDFDocument.create();
    for (let index = 1; index <= 12; index += 1) source.addPage([100 * index, 200]);
    const out = await buildPreviewPdf(await source.save(), 3);
    const preview = await PDFDocument.load(out!);
    expect(preview.getPages().map((page) => Math.round(page.getWidth()))).toEqual([100, 200, 300]);
  });

  it("returns null for empty bytes or a non-positive count", async () => {
    expect(await buildPreviewPdf(new Uint8Array(), 10)).toBeNull();
    expect(await buildPreviewPdf(await makePdf(3), 0)).toBeNull();
  });
});

describe("readPreviewPdfInfo", () => {
  it("reports a null limit for an unmarked PDF", async () => {
    const info = await readPreviewPdfInfo(await makePdf(4));
    expect(info?.limit).toBeNull();
    expect(info?.pageCount).toBe(4);
  });

  it("returns null for invalid bytes", async () => {
    expect(await readPreviewPdfInfo(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
