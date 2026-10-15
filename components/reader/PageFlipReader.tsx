"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import HTMLFlipBook from "react-pageflip";
import type { BookPage } from "@/types/book";
import type { ReaderHandle } from "@/lib/reader/reader-handle";

interface PageFlipInstance {
  turnToNextPage(): void;
  turnToPrevPage(): void;
  turnToPage(page: number): void;
  getPageCount(): number;
}

interface FlipBookRef {
  pageFlip: () => PageFlipInstance | undefined;
}

interface PageFlipReaderProps {
  pages: BookPage[];
  pageWidth: number;
  pageHeight: number;
  spread: boolean;
  zoom: number;
  startPage: number;
  onPageChange: (page: number) => void;
}

export const PageFlipReader = forwardRef<ReaderHandle, PageFlipReaderProps>(function PageFlipReader(
  { pages, pageWidth, pageHeight, spread, zoom, startPage, onPageChange },
  ref,
) {
  const flipRef = useRef<FlipBookRef | null>(null);

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

  const bookWidth = pageWidth * (spread ? 2 : 1);
  const scaledWidth = Math.round(bookWidth * zoom);
  const scaledHeight = Math.round(pageHeight * zoom);

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
            {pages.map((page) => (
              <div
                key={page.number}
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page.imageUrl}
                  alt={page.alt}
                  className="h-full w-full select-none object-contain"
                  draggable={false}
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
