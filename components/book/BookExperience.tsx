"use client";

import { useBook } from "./BookProvider";
import { BookReader } from "@/components/reader/BookReader";
import { OrderForm } from "@/components/order/OrderForm";
import { BookIcon, TruckIcon } from "@/components/ui/icons";

export function BookExperience() {
  const { book } = useBook();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1560px] flex-col px-4 pt-4 pb-12 sm:px-6 lg:px-8">
      <header className="glass glass-card flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.85rem] text-white"
            style={{ backgroundImage: "var(--grad-primary)", boxShadow: "var(--shadow-primary)" }}
            aria-hidden="true"
          >
            <BookIcon width={18} height={18} />
          </span>
          <div className="min-w-0">
            <p className="brand-wordmark truncate font-bold">HSC English Last Hour</p>
            <p className="hidden truncate text-xs text-[var(--ink-muted)] sm:block">{book.title}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="glass-control hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[var(--ink-soft)] sm:inline-flex">
            <TruckIcon width={15} height={15} />
            Cash on Delivery
          </span>
          <a href="#order" className="btn btn-primary btn-sm lg:hidden">
            <span className="sm:hidden">Order</span>
            <span className="hidden sm:inline">Order Now</span>
          </a>
        </div>
      </header>

      <div className="mt-4 grid flex-1 grid-cols-1 items-start gap-5 sm:mt-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,320px)] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
        <section data-reader className="min-w-0">
          <BookReader orderSectionId="order" />
        </section>

        <aside
          id="order"
          data-order
          tabIndex={-1}
          aria-label="Order"
          className="min-w-0 scroll-mt-4 outline-none lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1"
        >
          <OrderForm />
        </aside>
      </div>
    </div>
  );
}
