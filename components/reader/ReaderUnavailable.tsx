"use client";

import { BookIcon } from "@/components/ui/icons";

export function ReaderUnavailable({ onBackToOrder }: { onBackToOrder?: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full text-white"
        style={{ backgroundImage: "var(--grad-primary)", boxShadow: "var(--shadow-primary)" }}
        aria-hidden="true"
      >
        <BookIcon width={24} height={24} />
      </span>
      <div className="space-y-1.5">
        <h2 className="text-lg font-bold text-[var(--ink)]">Preview coming soon</h2>
        <p className="mx-auto max-w-sm text-sm text-[var(--ink-soft)]">
          The book preview is being prepared. Order now to reserve your copy.
        </p>
      </div>
      {onBackToOrder ? (
        <button type="button" onClick={onBackToOrder} className="btn btn-primary btn-md">
          Order Now
        </button>
      ) : null}
    </div>
  );
}
