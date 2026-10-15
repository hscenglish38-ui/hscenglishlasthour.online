import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseSecretKey,
  getSupabaseUrl,
  MISSING_SUPABASE_MESSAGE,
} from "./config";

/**
 * Privileged server-only Supabase client (secret / service_role key). Bypasses
 * Row Level Security, so it must only be used for trusted server operations:
 * reading private book assets, signing URLs, and creating orders.
 *
 * Never import this module into Client Components.
 */
let cached: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (cached) return cached;

  const url = getSupabaseUrl();
  const key = getSupabaseSecretKey();
  if (!url || !key) {
    throw new Error(MISSING_SUPABASE_MESSAGE);
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "hscenglishlasthour-server" } }, // app identity
  });
  return cached;
}
