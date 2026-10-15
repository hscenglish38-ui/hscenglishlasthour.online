"use client";

import type { ReactNode } from "react";
import type { FitMode } from "@/lib/reader/layout";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FitPageIcon,
  FitWidthIcon,
  ResetIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "@/components/ui/icons";

export interface ReaderControlsProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onGoToPage: (page: number) => void;
  canPrev: boolean;
  canNext: boolean;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitMode: (mode: FitMode) => void;
  fitMode: FitMode;
  trailing?: ReactNode;
}

export function ReaderControls({
  currentPage,
  totalPages,
  onPrev,
  onNext,
  onGoToPage,
  canPrev,
  canNext,
  zoom,
  minZoom,
  maxZoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitMode,
  fitMode,
  trailing,
}: ReaderControlsProps) {
  const percent = Math.round(zoom * 100);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="glass-control flex items-center gap-1 rounded-full p-1">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Previous page"
          className="btn btn-ghost btn-sm btn-icon"
        >
          <ChevronLeftIcon />
        </button>
        <div className="flex items-center gap-1 px-1 text-sm text-[var(--ink-soft)]">
          <label htmlFor="reader-page-input" className="sr-only">
            Page number
          </label>
          <input
            id="reader-page-input"
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isFinite(value)) onGoToPage(value);
            }}
            className="h-7 w-11 rounded-full border border-white/60 bg-white/70 text-center text-sm tabular-nums outline-none focus:ring-2 focus:ring-[var(--ring-primary)]"
          />
          <span aria-hidden="true" className="tabular-nums text-[var(--ink-muted)]">
            / {totalPages}
          </span>
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          aria-label="Next page"
          className="btn btn-ghost btn-sm btn-icon"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="glass-control flex items-center gap-1 rounded-full p-1">
        <button
          type="button"
          onClick={onZoomOut}
          disabled={zoom <= minZoom}
          aria-label="Zoom out"
          className="btn btn-ghost btn-sm btn-icon"
        >
          <ZoomOutIcon />
        </button>
        <span className="min-w-11 text-center text-xs font-medium tabular-nums text-[var(--ink-soft)]" aria-live="polite">
          {percent}%
        </span>
        <button
          type="button"
          onClick={onZoomIn}
          disabled={zoom >= maxZoom}
          aria-label="Zoom in"
          className="btn btn-ghost btn-sm btn-icon"
        >
          <ZoomInIcon />
        </button>
        <button
          type="button"
          onClick={onResetZoom}
          aria-label="Reset zoom"
          title="Reset zoom"
          className="btn btn-ghost btn-sm btn-icon"
        >
          <ResetIcon />
        </button>
        <button
          type="button"
          onClick={() => onFitMode("width")}
          aria-label="Fit width"
          aria-pressed={fitMode === "width"}
          title="Fit width"
          className={`btn btn-sm btn-icon ${fitMode === "width" ? "btn-primary" : "btn-ghost"}`}
        >
          <FitWidthIcon />
        </button>
        <button
          type="button"
          onClick={() => onFitMode("page")}
          aria-label="Fit page"
          aria-pressed={fitMode === "page"}
          title="Fit page"
          className={`btn btn-sm btn-icon ${fitMode === "page" ? "btn-primary" : "btn-ghost"}`}
        >
          <FitPageIcon />
        </button>
      </div>

      {trailing ? <div className="ml-auto">{trailing}</div> : null}
    </div>
  );
}
