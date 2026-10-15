import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabasePublicConfig,
  MISSING_SUPABASE_MESSAGE,
} from "./config";

/**
 * Cookie-bound server Supabase client that respects the signed-in user's
 * session and Row Level Security. Reserved for authenticated server operations
 * (future Admin Panel). The public landing page does not need it.
 *
 * Returns null when the public environment variables are missing.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const config = getSupabasePublicConfig();
  if (!config) return null;

  const cookieStore = await cookies();

  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render: cookies are read-only.
          // Session refresh is handled in middleware/proxy when implemented.
        }
      },
    },
  });
}

/** Throwing variant for code paths that cannot continue without Supabase. */
export async function requireSupabaseServerClient(): Promise<SupabaseClient> {
  const client = await createSupabaseServerClient();
  if (!client) throw new Error(MISSING_SUPABASE_MESSAGE);
  return client;
}
