/**
 * Address line limits shared by the client form and the server validator.
 *
 * The address box is a fixed-height textarea that shows at most three lines, so
 * both the UI (which stops a fourth line from being entered) and the server
 * (which independently rejects an over-long address) agree on the same ceiling.
 */
export const MAX_ADDRESS_LINES = 3;

/** Longest address the backend accepts, in characters (unchanged from before). */
export const MAX_ADDRESS_LENGTH = 500;

/** Minimum address length, in characters (unchanged from before). */
export const MIN_ADDRESS_LENGTH = 5;

/**
 * Normalize an address for storage and display:
 * - unify `\r\n` / `\r` to `\n`;
 * - trim trailing spaces/tabs on each line;
 * - collapse consecutive newlines (drop blank lines).
 *
 * This closes the "paste lots of newlines to fake more lines" loophole without
 * changing the meaning of ordinary address input. It never truncates content.
 */
export function normalizeAddress(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .filter((line) => line.trim() !== "")
    .join("\n");
}

/** Number of logical (non-empty) lines in an address. */
export function countAddressLines(value: string): number {
  const normalized = normalizeAddress(value);
  if (normalized === "") return 0;
  return normalized.split("\n").length;
}

/**
 * Normalize and clamp an address to at most `maxLines` content lines for use in
 * the controlled textarea. Unlike {@link normalizeAddress} this keeps a single
 * trailing newline so pressing Enter can still open a new (empty) line, which
 * is what makes ordinary 2–3 line entry work. A fourth line — typed or pasted —
 * is dropped, and runs of newlines are collapsed so blank lines cannot be used
 * to sneak past the limit.
 */
export function limitAddressLines(value: string, maxLines = MAX_ADDRESS_LINES): string {
  const collapsed = value.replace(/\r\n?/g, "\n").replace(/\n{2,}/g, "\n");
  const lines = collapsed.split("\n");
  if (lines.length <= maxLines) return collapsed;
  const kept = lines.slice(0, maxLines);
  while (kept.length > 0 && kept[kept.length - 1].trim() === "") kept.pop();
  return kept.join("\n").replace(/[ \t]+$/, "");
}
