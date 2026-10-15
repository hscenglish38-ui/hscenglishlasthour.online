import "server-only";

import { getSupabaseAdminClient } from "./admin";
import { getSupabaseBookBucket } from "./config";

export const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24 hours

export interface SignedUrlMap {
  [path: string]: string;
}

/**
 * Create a short-lived signed URL for a single private object. Signed URLs are
 * validated by the Storage service, so they work for anonymous visitors without
 * making the bucket public.
 */
export async function createSignedUrl(
  path: string,
  ttlSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS,
): Promise<string | null> {
  if (!path) return null;
  try {
    const { data, error } = await getSupabaseAdminClient()
      .storage.from(getSupabaseBookBucket())
      .createSignedUrl(path, ttlSeconds);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

/**
 * Batch-sign several private objects. Returns a path -> signed URL map; missing
 * or failed paths are simply omitted so callers can fall back per-asset.
 */
export async function createSignedUrls(
  paths: string[],
  ttlSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS,
): Promise<SignedUrlMap> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return {};

  try {
    const { data, error } = await getSupabaseAdminClient()
      .storage.from(getSupabaseBookBucket())
      .createSignedUrls(unique, ttlSeconds);
    if (error || !data) return {};

    const map: SignedUrlMap = {};
    for (const entry of data) {
      if (entry.signedUrl && entry.path) map[entry.path] = entry.signedUrl;
    }
    return map;
  } catch {
    return {};
  }
}

/** Download a private object into memory (server only). */
export async function downloadObject(path: string): Promise<Uint8Array | null> {
  if (!path) return null;
  try {
    const { data, error } = await getSupabaseAdminClient()
      .storage.from(getSupabaseBookBucket())
      .download(path);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  } catch {
    return null;
  }
}

/** True when an object exists in the bucket. */
export async function objectExists(path: string): Promise<boolean> {
  if (!path) return false;
  const folder = path.slice(0, path.lastIndexOf("/"));
  const name = path.slice(path.lastIndexOf("/") + 1);
  try {
    const { data, error } = await getSupabaseAdminClient()
      .storage.from(getSupabaseBookBucket())
      .list(folder, { search: name, limit: 1 });
    if (error || !data) return false;
    return data.some((item) => item.name === name);
  } catch {
    return false;
  }
}
