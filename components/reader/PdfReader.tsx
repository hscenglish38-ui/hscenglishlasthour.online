"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfReaderProps {
  fileUrl: string;
  pageNumber: number;
  pageWidth: number;
  zoom: number;
  onLoadPages: (numPages: number) => void;
}

export function PdfReader({ fileUrl, pageNumber, pageWidth, zoom, onLoadPages }: PdfReaderProps) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex h-full w-full justify-center overflow-auto p-2">
      {error ? (
        <p
          role="alert"
          className="animate-rise self-center rounded-[var(--r-md)] border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      ) : (
        <Document
          file={fileUrl}
          options={{ standardFontDataUrl: "/standard_fonts/" }}
          onLoadSuccess={({ numPages }) => {
            setError(null);
            onLoadPages(numPages);
          }}
          onLoadError={() => setError("Could not load the preview.")}
          loading={<span className="reader-loader self-center" aria-label="Loading" />}
          error={
            <p className="self-center text-sm text-[var(--ink-muted)]">Unable to display the preview.</p>
          }
        >
          {pageNumber > 0 ? (
            <Page
              pageNumber={pageNumber}
              width={Math.round(pageWidth * zoom)}
              renderAnnotationLayer={false}
              className="pdf-sheet self-start"
              loading={<span className="reader-loader" aria-label="Loading page" />}
            />
          ) : null}
        </Document>
      )}
    </div>
  );
}
