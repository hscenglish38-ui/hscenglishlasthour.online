export const ZOOM_STEP = 0.25;

export function clampZoom(zoom: number, min: number, max: number): number {
  if (!Number.isFinite(zoom)) return min;
  return Math.min(max, Math.max(min, zoom));
}

export function stepZoom(zoom: number, direction: 1 | -1, min: number, max: number): number {
  const next = Math.round((zoom + direction * ZOOM_STEP) * 100) / 100;
  return clampZoom(next, min, max);
}

export type FitMode = "page" | "width";

/** Desktops at or above this width show a two-page spread. */
export const SPREAD_BREAKPOINT = 1024;

export function isSpreadViewport(viewportWidth: number, breakpoint = SPREAD_BREAKPOINT): boolean {
  return viewportWidth >= breakpoint;
}

export interface PageSizeInput {
  stageWidth: number;
  stageHeight: number;
  aspectRatio: number;
  spread: boolean;
}

export interface PageSize {
  pageWidth: number;
  pageHeight: number;
  bookWidth: number;
  bookHeight: number;
}

/**
 * Compute the base (unzoomed) page dimensions that fit the reader stage.
 * Single-page mode fits one page; spread mode fits two pages side by side.
 */
export function computePageSize({ stageWidth, stageHeight, aspectRatio, spread }: PageSizeInput): PageSize {
  const safeWidth = Math.max(1, stageWidth);
  const safeHeight = Math.max(1, stageHeight);
  const ratio = aspectRatio > 0 ? aspectRatio : 1;

  const maxPageWidth = spread ? safeWidth / 2 : safeWidth;
  let pageWidth = Math.min(maxPageWidth, safeHeight / ratio);
  let pageHeight = pageWidth * ratio;

  if (pageHeight > safeHeight) {
    pageHeight = safeHeight;
    pageWidth = pageHeight / ratio;
  }

  return {
    pageWidth: Math.round(pageWidth),
    pageHeight: Math.round(pageHeight),
    bookWidth: Math.round(pageWidth * (spread ? 2 : 1)),
    bookHeight: Math.round(pageHeight),
  };
}

/** Compute the layout for a given fit mode and zoom multiplier. */
export function computeLayout(
  input: PageSizeInput,
  fitMode: FitMode,
  zoom: number,
): PageSize & { zoom: number; scaledWidth: number; scaledHeight: number } {
  const base =
    fitMode === "width"
      ? computePageSize({ ...input, stageHeight: Number.MAX_SAFE_INTEGER })
      : computePageSize(input);
  return {
    ...base,
    zoom,
    scaledWidth: Math.round(base.bookWidth * zoom),
    scaledHeight: Math.round(base.bookHeight * zoom),
  };
}

export function computePinchZoom(
  startZoom: number,
  startDistance: number,
  currentDistance: number,
  min: number,
  max: number,
): number {
  if (startDistance <= 0 || !Number.isFinite(currentDistance)) return clampZoom(startZoom, min, max);
  return clampZoom(startZoom * (currentDistance / startDistance), min, max);
}
