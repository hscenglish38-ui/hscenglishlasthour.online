"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { pdfjs } from "react-pdf";
import type { ReaderHandle } from "@/lib/reader/reader-handle";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

type PdfLoadingTask = ReturnType<typeof pdfjs.getDocument>;
type PdfDocument = Awaited<PdfLoadingTask["promise"]>;
type PdfPage = Awaited<ReturnType<PdfDocument["getPage"]>>;
type PdfRenderTask = ReturnType<PdfPage["render"]>;

interface PageFlipInstance {
  turnToNextPage(): void;
  turnToPrevPage(): void;
  turnToPage(page: number): void;
  getPageCount(): number;
}

interface FlipBookRef {
  pageFlip: () => PageFlipInstance | undefined;
}

export interface PdfFlipReaderProps {
  /** Same-origin URL of the server-trimmed preview PDF. Never the full PDF. */
  fileUrl: string;
  /** Free-preview limit. Pages beyond this are never rendered. */
  previewPageCount: number;
  /** Base (unzoomed) width of a single page, in CSS px. */
  pageWidth: number;
  /** Base (unzoomed) height of a single page, in CSS px. */
  pageHeight: number;
  /** Render two pages side by side (open book) when true. */
  spread: boolean;
  zoom: number;
  startPage: number;
  onPageChange: (page: number) => void;
  /** Reports the real page count of the loaded preview PDF. */
  onNumPages: (numPages: number) => void;
  /** Reports the intrinsic page aspect ratio (height / width) of the PDF. */
  onPageSize: (aspectRatio: number) => void;
}

/**
 * Renders the secure preview PDF as the pages of an animated, book-style
 * reader (react-pageflip). Each PDF page becomes one book page; on wide screens
 * two pages sit side by side with a center spine. The plain PDF viewer remains
 * available as the separate "pdf" reading mode.
 */
export const PdfFlipReader = forwardRef<ReaderHandle, PdfFlipReaderProps>(function PdfFlipReader(
  {
    fileUrl,
    previewPageCount,
    pageWidth,
    pageHeight,
    spread,
    zoom,
    startPage,
    onPageChange,
    onNumPages,
    onPageSize,
  },
  ref,
) {
  const flipRef = useRef<FlipBookRef | null>(null);
  const [doc, setDoc] = useState<PdfDocument | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const handleNumPages = useCallback((numPages: number) => onNumPages(numPages), [onNumPages]);
  const handlePageSize = useCallback((ratio: number) => onPageSize(ratio), [onPageSize]);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PdfLoadingTask | null = null;

    void (async () => {
      setStatus("loading");
      setDoc(null);
      setNumPages(0);
      try {
        loadingTask = pdfjs.getDocument({
          url: fileUrl,
          standardFontDataUrl: "/standard_fonts/",
        });
        const document = await loadingTask.promise;
        if (cancelled) {
          void loadingTask.destroy();
          return;
        }

        const first = await document.getPage(1);
        const viewport = first.getViewport({ scale: 1 });
        if (viewport.width > 0) handlePageSize(viewport.height / viewport.width);

        setDoc(document);
        setNumPages(document.numPages);
        handleNumPages(document.numPages);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [fileUrl, handleNumPages, handlePageSize]);

  useImperativeHandle(
    ref,
    () => ({
      goToNext() {
        flipRef.current?.pageFlip()?.turnToNextPage();
      },
      goToPrev() {
        flipRef.current?.pageFlip()?.turnToPrevPage();
      },
      goToPage(page: number) {
        flipRef.current?.pageFlip()?.turnToPage(page - 1);
      },
    }),
    [],
  );

  const pageNumbers = useMemo(() => {
    if (numPages <= 0) return [];
    const limit = previewPageCount > 0 ? Math.min(previewPageCount, numPages) : numPages;
    return Array.from({ length: limit }, (_, index) => index + 1);
  }, [numPages, previewPageCount]);

  const bookWidth = pageWidth * (spread ? 2 : 1);
  const scaledWidth = Math.round(bookWidth * zoom);
  const scaledHeight = Math.round(pageHeight * zoom);

  if (status === "error") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p
          role="alert"
          className="rounded-[var(--r-md)] border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-800"
        >
          Could not load the preview.
        </p>
      </div>
    );
  }

  if (status !== "ready" || !doc) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="reader-loader" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto">
      <div
        style={{ width: scaledWidth, height: scaledHeight, margin: "0 auto", position: "relative" }}
      >
        <div
          style={{
            width: bookWidth,
            height: pageHeight,
            position: "relative",
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
          }}
        >
          <HTMLFlipBook
            key={`${pageWidth}x${pageHeight}-${spread ? "spread" : "single"}`}
            ref={(instance) => {
              flipRef.current = instance;
            }}
            style={{ width: bookWidth, height: pageHeight }}
            className="mx-auto"
            size="fixed"
            width={pageWidth}
            height={pageHeight}
            minWidth={pageWidth}
            maxWidth={pageWidth}
            minHeight={pageHeight}
            maxHeight={pageHeight}
            startPage={startPage - 1}
            usePortrait
            autoSize={false}
            showCover={false}
            drawShadow
            flippingTime={650}
            maxShadowOpacity={0.22}
            mobileScrollSupport
            useMouseEvents
            swipeDistance={25}
            clickEventForward
            showPageCorners
            disableFlipByClick={false}
            startZIndex={0}
            onFlip={(event) => onPageChange((event.data as number) + 1)}
          >
            {pageNumbers.map((number) => (
              <div
                key={number}
                className="relative overflow-hidden bg-white"
                style={{ boxShadow: "inset 0 0 0 1px rgba(15,23,42,0.05)" }}
              >
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[7%] bg-gradient-to-r from-neutral-900/8 to-transparent"
                  aria-hidden="true"
                />
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[7%] bg-gradient-to-l from-neutral-900/8 to-transparent"
                  aria-hidden="true"
                />
                <PdfFlipPage
                  doc={doc}
                  pageNumber={number}
                  width={pageWidth}
                  height={pageHeight}
                />
              </div>
            ))}
          </HTMLFlipBook>

          {spread ? (
            <div
              className="book-crease pointer-events-none absolute inset-y-0 left-1/2 z-20 w-[6%] -translate-x-1/2"
              aria-hidden="true"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
});

function PdfFlipPage({
  doc,
  pageNumber,
  width,
  height,
}: {
  doc: PdfDocument;
  pageNumber: number;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let task: PdfRenderTask | null = null;

    (async () => {
      try {
        const page = await doc.getPage(pageNumber);
        if (cancelled) return;

        const base = page.getViewport({ scale: 1 });
        if (base.width <= 0 || base.height <= 0) return;

        // "Contain" the page inside the box so nothing is clipped and the
        // intrinsic aspect ratio is preserved.
        const scale = Math.min(width / base.width, height / base.height);
        const dpr = Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: scale * dpr });

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = Math.max(1, Math.round(viewport.width));
        canvas.height = Math.max(1, Math.round(viewport.height));
        canvas.style.width = `${Math.round(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.round(viewport.height / dpr)}px`;

        task = page.render({ canvas, viewport });
        await task.promise;
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      try {
        task?.cancel();
      } catch {
        // ignore
      }
    };
  }, [doc, pageNumber, width, height]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      {failed ? (
        <span className="px-3 text-center text-xs text-[var(--ink-muted)]">
          Page {pageNumber} unavailable
        </span>
      ) : (
        <canvas
          ref={canvasRef}
          className="block select-none"
          aria-label={`Page ${pageNumber}`}
          role="img"
        />
      )}
    </div>
  );
}
