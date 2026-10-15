import { NextResponse } from "next/server";
import { createOrder, OrderError } from "@/lib/orders/create-order";
import type { ApiErrorResponse } from "@/types/order";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const MAX_BODY_BYTES = 10 * 1024; // 10KB

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

function errorResponse(body: ApiErrorResponse, status: number) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  if (isRateLimited(clientKey(request))) {
    return errorResponse(
      { error: "Too many order attempts. Please wait a minute and try again." },
      429,
    );
  }

  let body: unknown;
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
      return errorResponse({ error: "Request body too large." }, 413);
    }
    body = await request.json();
  } catch {
    return errorResponse({ error: "Invalid request body." }, 400);
  }

  try {
    const result = await createOrder(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof OrderError) {
      return errorResponse({ error: error.message, fieldErrors: error.fieldErrors }, error.status);
    }
    console.error("Failed to create order", error);
    return errorResponse({ error: "Could not place your order. Please try again." }, 500);
  }
}
