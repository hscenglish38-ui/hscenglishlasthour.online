import "server-only";

import { NextResponse } from "next/server";
import { loadPublishedBook } from "@/lib/book/source";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseBookBucket, isSupabaseAdminConfigured } from "@/lib/supabase/config";
import { buildPreviewPdfPath, buildPdfPath } from "@/lib/book/storage-paths";
import { downloadObject, objectExists } from "@/lib/supabase/storage";
import { buildPreviewPdf } from "@/lib/book/preview-pdf";

const CACHE_MAX_AGE_SECONDS = 60 * 30; // 30 minutes

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bookId = url.searchParams.get("bookId") ?? "hscenglishlasthour";

  const book = await loadPublishedBook(bookId);
  if (!book.isPublished) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // No backend configured: the full PDF lives in private storage, so there is
  // nothing to serve here. (Development preview uses a local fixture instead.)
  if (!isSupabaseAdminConfigured()) {
    return new NextResponse("Preview unavailable", { status: 404 });
  }

  const supabase = getSupabaseAdminClient();
  const bucket = getSupabaseBookBucket();

  // Try pre-generated preview first
  const previewPath = buildPreviewPdfPath(bookId);
  if (await objectExists(previewPath)) {
    const bytes = await downloadObject(previewPath);
    if (bytes) {
      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Cache-Control": `public, max-age=${CACHE_MAX_AGE_SECONDS}`,
          "X-Preview-Source": "stored",
        },
      });
    }
  }

  // Trim from full PDF
  const fullPath = book.content.pdfStoragePath || buildPdfPath(bookId);
  const fullBytes = await downloadObject(fullPath);
  if (!fullBytes) {
    return new NextResponse("Preview unavailable", { status: 404 });
  }

  const trimmed = await buildPreviewPdf(fullBytes, book.previewPageCount);
  if (!trimmed) {
    return new NextResponse("Preview unavailable", { status: 500 });
  }

  // Best-effort: upload cached preview for next time (non-blocking)
  try {
    await supabase.storage
      .from(bucket)
      .upload(previewPath, trimmed, { contentType: "application/pdf", upsert: true });
  } catch {
    // ignore cache write failures
  }

  return new NextResponse(new Uint8Array(trimmed), {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": `public, max-age=${CACHE_MAX_AGE_SECONDS}`,
      "X-Preview-Source": "trimmed",
    },
  });
}
