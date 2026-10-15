/**
 * Central reading + validation of Supabase environment configuration.
 *
 * Server-only privileged values must never be imported into browser code. The
 * `NEXT_PUBLIC_*` values are safe to expose by design.
 */

export interface SupabasePublicConfig {
  url: string;
  /** Browser-safe key: publishable key, or the legacy anon key. */
  key: string;
}

/**
 * IMPORTANT: public values are read via STATIC property access
 * (`process.env.NEXT_PUBLIC_X`) so Next.js can inline them into the browser
 * bundle at build time. Dynamic access (`process.env[name]`) is NOT replaced by
 * Next and evaluates to `undefined` in client code — which previously made the
 * browser Supabase client initialise as null and silently disabled the Realtime
 * subscription that keeps the site in sync with admin edits.
 */
const PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLIC_SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Trim a raw env value; return null when unset/blank. */
function clean(value: string | undefined | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Server-only reads. These variables must never be exposed to the browser, so
 * they are read at runtime on the server (never inlined into client bundles).
 */
function readServerEnv(...names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

/** Public project URL (safe for the browser). */
export function getSupabaseUrl(): string | null {
  return clean(PUBLIC_SUPABASE_URL);
}

/** Browser-safe key (publishable preferred, anon fallback). */
export function getSupabasePublicKey(): string | null {
  return clean(PUBLIC_SUPABASE_PUBLISHABLE_KEY) ?? clean(PUBLIC_SUPABASE_ANON_KEY);
}

/** Server-only privileged key (secret preferred, service_role fallback). */
export function getSupabaseSecretKey(): string | null {
  return readServerEnv("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY");
}

/** Storage bucket for book assets. */
export function getSupabaseBookBucket(): string {
  return readServerEnv("SUPABASE_BOOK_BUCKET") ?? "book-assets";
}

/** True when public (browser) Supabase access is configured. */
export function isSupabasePublicConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublicKey());
}

/** True when the privileged server key is configured. */
export function isSupabaseAdminConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey());
}

/**
 * Public config or null. Callers must handle null (render a graceful fallback)
 * rather than throwing at import time.
 */
export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = getSupabaseUrl();
  const key = getSupabasePublicKey();
  if (!url || !key) return null;
  return { url, key };
}

export const MISSING_SUPABASE_MESSAGE =
  "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY), plus SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) for server writes. See .env.example.";
