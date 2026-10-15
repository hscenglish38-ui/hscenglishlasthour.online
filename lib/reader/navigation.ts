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
