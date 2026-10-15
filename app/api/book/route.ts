import "server-only";

import { NextResponse } from "next/server";
import { loadPublishedBook } from "@/lib/book/source";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bookId = url.searchParams.get("bookId");
  const book = await loadPublishedBook(bookId ?? undefined);
  return NextResponse.json({ book });
}
