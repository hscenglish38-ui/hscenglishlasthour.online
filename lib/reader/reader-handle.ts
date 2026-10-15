/** Imperative navigation surface shared by the reader modes. */
export interface ReaderHandle {
  goToNext(): void;
  goToPrev(): void;
  goToPage(page: number): void;
}

export type ReadingState = {
  mode: "flip" | "pdf";
  page: number;
  zoom: number;
  fitMode: "page" | "width";
};
