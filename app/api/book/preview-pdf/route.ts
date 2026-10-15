import "server-only";

import { NextResponse } from "next/server";
import { loadPublishedBook } from "@/lib/book/source";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseBookBucket, isSupabaseAdminConfigured } from "@/lib/supabase/config";
import { buildPreviewPdfPath, buildPdfPath } from "@/lib/book/storage-paths";
import { downloadObject, objectExists } from "@/lib/supabase/storage";
import { buildPreviewPdf, readPreviewPdfInfo } from "@/lib/book/preview-pdf";
import { clampPreviewPageCount } from "@/lib/book/config";

const CACHE_MAX_AGE_SECONDS = 60 * 30; // 30 minutes

function pdfResponse(bytes: Uint8Array, source: "stored" | "trimmed") {
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": `public, max-age=${CACHE_MAX_AGE_SECONDS}`,
      "X-Preview-Source": source,
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bookId = url.searchParams.get("bookId") ?? "hscenglishlasthour";

  // Only `bookId` is accepted. There is deliberately no page-range parameter —
  // the preview is a bounded document, not a windowed view of the full PDF.
  const book = await loadPublishedBook(bookId);
  if (!book.isPublished) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // No backend configured: the full PDF lives in private storage, so there is
  // nothing to serve here. (Development preview uses a local fixture instead.)
  if (!isSupabaseAdminConfigured()) {
    return new NextResponse("Preview unavailable", { status: 404 });
  }

  const limit = clampPreviewPageCount(book.previewPageCount);
  if (limit <= 0) {
    return new NextResponse("Preview unavailable", { status: 404 });
  }

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBookBucket();

  // Serve the cached preview only when it was generated for the current limit
  // and is not longer than the limit (defends against a stale cache after the
  // Admin increases or decreases `preview_page_count`).
  const previewPath = buildPreviewPdfPath(bookId);
  if (await objectExists(previewPath)) {
    const bytes = await downloadObject(previewPath);
    if (bytes) {
      const info = await readPreviewPdfInfo(bytes);
      if (info && info.limit === limit && info.pageCount > 0 && info.pageCount <= limit) {
        return pdfResponse(bytes, "stored");
      }
    }
  }

  // Regenerate from the full PDF (first `limit` pages at most).
  const fullPath = book.content.pdfStoragePath || buildPdfPath(bookId);
  const fullBytes = await downloadObject(fullPath);
  if (!fullBytes) {
    return new NextResponse("Preview unavailable", { status: 404 });
  }

  const trimmed = await buildPreviewPdf(fullBytes, limit);
  if (!trimmed) {
    return new NextResponse("Preview unavailable", { status: 500 });
  }

  // Best-effort: upload cached preview for next time (non-blocking).
  try {
    await supabase.storage
      .from(bucket)
      .upload(previewPath, trimmed, { contentType: "application/pdf", upsert: true });
  } catch {
    // ignore cache write failures
  }

  return pdfResponse(trimmed, "trimmed");
}
