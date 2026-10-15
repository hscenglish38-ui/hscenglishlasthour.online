"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useBook } from "@/components/book/BookProvider";
import { clampPage, isFirstPage, isPreviewEnd, nextPage, prevPage } from "@/lib/reader/navigation";
import {
  clampZoom,
  computePageSize,
  computePinchZoom,
  isSpreadViewport,
  stepZoom,
  type FitMode,
} from "@/lib/reader/layout";
import type { ReaderHandle, ReadingState } from "@/lib/reader/reader-handle";
import { coerceMode, getModeAvailability, resolveInitialMode } from "@/lib/reader/mode";
import type { ReadingMode } from "@/types/book";
import { useElementSize, useViewportWidth } from "@/hooks/use-element-size";
import { BookIcon, FileIcon, LockIcon } from "@/components/ui/icons";
import { ReaderControls } from "./ReaderControls";
import { PageFlipReader } from "./PageFlipReader";
import { ReaderUnavailable } from "./ReaderUnavailable";

const PdfReader = dynamic(() => import("./PdfReader").then((mod) => mod.PdfReader), {
  ssr: false,
  loading: () => <ReaderMessage>Loading reader…</ReaderMessage>,
});

const PdfFlipReader = dynamic(() => import("./PdfFlipReader").then((mod) => mod.PdfFlipReader), {
  ssr: false,
  loading: () => <ReaderMessage>Loading reader…</ReaderMessage>,
});

const STORAGE_KEY = "book-reader-state";

function ReaderMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center">
      <span className="reader-loader" aria-hidden="true" />
      <span className="sr-only">{children}</span>
    </div>
  );
}

function distanceBetween(touches: TouchList): number {
  const [a, b] = [touches[0], touches[1]];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export function BookReader({ orderSectionId = "order" }: { orderSectionId?: string }) {
  const { book } = useBook();
  const pages = useMemo(() => book.content.pages, [book.content.pages]);
  const hasContent = pages.length > 0 || Boolean(book.content.pdfUrl);
  const { minZoom, maxZoom } = book.reader;
  const { flip: flipAvailable, pdf: pdfAvailable } = getModeAvailability(book);

  const [mode, setMode] = useState<ReadingMode>(() => resolveInitialMode(book));
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState<FitMode>("page");
  const [pdfTotal, setPdfTotal] = useState(() =>
    book.previewPageCount > 0 ? book.previewPageCount : pages.length,
  );
  // Intrinsic aspect ratio measured from the loaded preview PDF, keyed by URL so
  // a replaced PDF invalidates it. Falls back to the configured reader ratio.
  const [pdfAspect, setPdfAspect] = useState<{ url: string; ratio: number } | null>(null);
  const measuredAspect =
    pdfAspect && pdfAspect.url === book.content.pdfUrl ? pdfAspect.ratio : null;
  const aspectRatio = measuredAspect ?? book.reader.pageAspectRatio;

  // The mode actually rendered. If the selected mode has no content to show
  // (e.g. a PDF-only book whose saved/restored preference is still "flip"), fall
  // back to the mode that does. `mode` stays as the visitor's preference so it
  // is restored once the content returns.
  const activeMode = coerceMode(mode, book);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const readerRef = useRef<ReaderHandle | null>(null);
  const size = useElementSize(stageRef);
  const viewportWidth = useViewportWidth();

  const spread = activeMode === "flip" && isSpreadViewport(viewportWidth);
  // Both the flip and plain PDF modes stream the server-trimmed preview PDF, so
  // their page count is bounded by the configured preview page count.
  const pdfPageLimit =
    book.previewPageCount > 0 ? book.previewPageCount : Number.POSITIVE_INFINITY;
  // The flip reader renders page images when present, otherwise the PDF pages.
  const flipFromImages = pages.length > 0;
  const flipTotal = flipFromImages
    ? pages.length
    : Math.max(1, Math.min(pdfTotal, pdfPageLimit));
  const totalPages =
    activeMode === "flip" ? flipTotal : Math.max(1, Math.min(pdfTotal, pdfPageLimit));
  const page = clampPage(currentPage, totalPages);

  const handleNumPages = useCallback((numPages: number) => {
    if (numPages > 0) setPdfTotal(numPages);
  }, []);

  const handlePdfAspect = useCallback(
    (ratio: number) => {
      if (ratio > 0 && book.content.pdfUrl) setPdfAspect({ url: book.content.pdfUrl, ratio });
    },
    [book.content.pdfUrl],
  );

  const base = useMemo(() => {
    const stageHeight = fitMode === "width" ? Number.MAX_SAFE_INTEGER : size.height;
    return computePageSize({
      stageWidth: size.width,
      stageHeight,
      aspectRatio,
      spread,
    });
  }, [size.width, size.height, aspectRatio, spread, fitMode]);

  useEffect(() => {
    const restore = () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<ReadingState>;
        if (saved.mode === "flip" || saved.mode === "pdf") setMode(saved.mode);
        if (typeof saved.page === "number") setCurrentPage(clampPage(saved.page, pages.length));
        if (typeof saved.zoom === "number") setZoom(clampZoom(saved.zoom, minZoom, maxZoom));
        if (saved.fitMode === "page" || saved.fitMode === "width") setFitMode(saved.fitMode);
      } catch {
        // ignore
      }
    };
    const id = queueMicrotask(restore);
    return () => {
      void id;
    };
  }, [pages.length, minZoom, maxZoom]);

  useEffect(() => {
    const state: ReadingState = { mode: activeMode, page, zoom, fitMode };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [activeMode, page, zoom, fitMode]);

  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    let startDistance = 0;
    let startZoom = 1;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        startDistance = distanceBetween(event.touches);
        startZoom = zoom;
      }
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2 && startDistance > 0) {
        event.preventDefault();
        setZoom(computePinchZoom(startZoom, startDistance, distanceBetween(event.touches), minZoom, maxZoom));
      }
    };
    const onTouchEnd = () => {
      startDistance = 0;
    };

    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
    };
  }, [zoom, minZoom, maxZoom]);

  const scrollToOrder = useCallback(() => {
    const target = document.getElementById(orderSectionId);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.focus({ preventScroll: true });
  }, [orderSectionId]);

  const handlePrev = useCallback(() => {
    if (!hasContent) return;
    if (activeMode === "pdf") setCurrentPage((p) => prevPage(p, totalPages));
    else readerRef.current?.goToPrev();
  }, [activeMode, totalPages, hasContent]);

  const handleNext = useCallback(() => {
    if (!hasContent) return;
    if (activeMode === "pdf") setCurrentPage((p) => nextPage(p, totalPages));
    else readerRef.current?.goToNext();
  }, [activeMode, totalPages, hasContent]);

  const handleGoToPage = useCallback(
    (p: number) => {
      if (!hasContent) return;
      if (activeMode === "pdf") setCurrentPage(clampPage(p, totalPages));
      else readerRef.current?.goToPage(clampPage(p, totalPages));
    },
    [activeMode, totalPages, hasContent],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlePrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        handleNext();
      }
    },
    [handlePrev, handleNext],
  );

  // In a two-page spread the flip reader reports the left page, so the spread
  // reaches the end when its right page does. Otherwise the end is the last page.
  const atEnd = isPreviewEnd(page, totalPages, { spread });
  const ready = size.width > 0;
  const showModes = flipAvailable && pdfAvailable;

  return (
    <div className="glass glass-panel p-2.5 sm:p-3.5">
      <div className="reader-stage rounded-[1.35rem] p-1.5 sm:p-2">
        <div
          ref={stageRef}
          tabIndex={0}
          role="region"
          aria-label="Book pages"
          onKeyDown={handleKeyDown}
          style={{ touchAction: "pan-y" }}
          className="relative h-[56vh] min-h-[300px] overflow-hidden rounded-[1rem] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] sm:h-[60vh] lg:h-[70vh]"
        >
          {!hasContent ? (
            <ReaderUnavailable onBackToOrder={scrollToOrder} />
          ) : !ready ? (
            <ReaderMessage>Preparing reader…</ReaderMessage>
          ) : activeMode === "flip" ? (
            flipFromImages ? (
              <PageFlipReader
                ref={readerRef}
                pages={pages}
                pageWidth={base.pageWidth}
                pageHeight={base.pageHeight}
                spread={spread}
                zoom={zoom}
                startPage={page}
                onPageChange={setCurrentPage}
              />
            ) : book.content.pdfUrl ? (
              <PdfFlipReader
                ref={readerRef}
                fileUrl={book.content.pdfUrl}
                previewPageCount={book.previewPageCount}
                pageWidth={base.pageWidth}
                pageHeight={base.pageHeight}
                spread={spread}
                zoom={zoom}
                startPage={page}
                onPageChange={setCurrentPage}
                onNumPages={handleNumPages}
                onPageSize={handlePdfAspect}
              />
            ) : (
              <ReaderMessage>Preview is not available.</ReaderMessage>
            )
          ) : book.content.pdfUrl ? (
            <PdfReader
              fileUrl={book.content.pdfUrl}
              pageNumber={page}
              pageWidth={base.pageWidth}
              zoom={zoom}
              onLoadPages={handleNumPages}
            />
          ) : (
            <ReaderMessage>Preview is not available.</ReaderMessage>
          )}

          {hasContent && page >= 1 && atEnd ? (
            <span className="sr-only" aria-live="polite">
              End of free preview
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        <ReaderControls
          currentPage={page}
          totalPages={totalPages}
          onPrev={handlePrev}
          onNext={handleNext}
          onGoToPage={handleGoToPage}
          canPrev={!isFirstPage(page) && hasContent}
          canNext={!atEnd && hasContent}
          zoom={zoom}
          minZoom={minZoom}
          maxZoom={maxZoom}
          onZoomIn={() => hasContent && setZoom((v) => stepZoom(v, 1, minZoom, maxZoom))}
          onZoomOut={() => hasContent && setZoom((v) => stepZoom(v, -1, minZoom, maxZoom))}
          onResetZoom={() => {
            setZoom(1);
            setFitMode("page");
          }}
          onFitMode={(m) => {
            setFitMode(m);
            setZoom(1);
          }}
          fitMode={fitMode}
          trailing={
            showModes ? (
              <div className="segmented" role="group" aria-label="Reading mode">
                <button
                  type="button"
                  aria-pressed={activeMode === "flip"}
                  onClick={() => setMode("flip")}
                  className="segmented-btn"
                >
                  <BookIcon width={15} height={15} />
                  Book
                </button>
                <button
                  type="button"
                  aria-pressed={activeMode === "pdf"}
                  onClick={() => setMode("pdf")}
                  className="segmented-btn"
                >
                  <FileIcon width={15} height={15} />
                  PDF
                </button>
              </div>
            ) : null
          }
        />
      </div>

      {hasContent && atEnd ? (
        <div
          role="note"
          className="glass-soft mt-3 flex flex-col items-start gap-3 rounded-[var(--r-lg)] p-3.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 text-[var(--violet-600)]">
              <LockIcon width={16} height={16} />
            </span>
            <div>
              <p className="bn text-sm font-semibold text-[var(--ink)]">
                ফ্রি প্রিভিউ শেষ। সম্পূর্ণ বইটি পেতে এখনই অর্ডার করুন।
              </p>
              <p className="text-xs text-[var(--ink-muted)]">
                Free preview ended — order now to get the full book.
              </p>
            </div>
          </div>
          <button type="button" onClick={scrollToOrder} className="btn btn-primary btn-md w-full sm:w-auto">
            Order Now
          </button>
        </div>
      ) : null}
    </div>
  );
}
