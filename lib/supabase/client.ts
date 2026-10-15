"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "./config";

/**
 * Browser Supabase client. Used for realtime subscriptions to published-book
 * changes and, in the future, the Admin Panel (auth). Returns null when the
 * public environment variables are missing so the UI can degrade gracefully.
 *
 * Only the publishable/anon key is ever used here; the secret key must never be
 * imported into client code.
 */
let cached: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (cached) return cached;
  const config = getSupabasePublicConfig();
  if (!config) return null;
  cached = createBrowserClient(config.url, config.key);
  return cached;
}
