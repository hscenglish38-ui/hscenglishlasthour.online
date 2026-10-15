export function clampPage(page: number, totalPages: number): number {
  if (totalPages <= 0) return 1;
  if (!Number.isFinite(page)) return 1;
  return Math.min(totalPages, Math.max(1, Math.round(page)));
}

export function nextPage(page: number, totalPages: number): number {
  return clampPage(page + 1, totalPages);
}

export function prevPage(page: number, totalPages: number): number {
  return clampPage(page - 1, totalPages);
}

export function isFirstPage(page: number): boolean {
  return page <= 1;
}

export function isLastPage(page: number, totalPages: number): boolean {
  return page >= totalPages;
}

/**
 * The last page number actually visible for a given reading position. In a
 * two-page spread the reader reports the left page, so the right-hand page of
 * the spread is also visible; in single-page mode only the current page is.
 */
export function lastVisiblePage(
  page: number,
  totalPages: number,
  options: { spread: boolean },
): number {
  const current = clampPage(page, totalPages);
  return options.spread ? Math.min(current + 1, totalPages) : current;
}

/** True when the reader is showing the final page(s) of the preview. */
export function isPreviewEnd(
  page: number,
  totalPages: number,
  options: { spread: boolean },
): boolean {
  return lastVisiblePage(page, totalPages, options) >= totalPages;
}
