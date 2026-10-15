"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { BookConfig } from "@/types/book";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export interface BookContextValue {
  book: BookConfig;
  loading: boolean;
  refresh: () => Promise<void>;
}

const BookContext = createContext<BookContextValue | null>(null);

export function useBook(): BookContextValue {
  const context = useContext(BookContext);
  if (!context) {
    throw new Error("useBook must be used within BookProvider");
  }
  return context;
}

export function BookProvider({
  initialBook,
  bookId = "hscenglishlasthour", // slug id; display name is "HSC English Last Hour"
  children,
}: {
  initialBook: BookConfig;
  bookId?: string;
  children: React.ReactNode;
}) {
  const [book, setBook] = useState<BookConfig>(initialBook);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/book?bookId=${encodeURIComponent(bookId)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { book?: BookConfig };
        if (data.book) setBook(data.book);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    // realtime: books
    const channelBooks = supabase
      .channel(`books:${bookId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "books", filter: `id=eq.${bookId}` },
        () => {
          void refresh();
        },
      )
      .subscribe();

    // realtime: book_pages
    const channelPages = supabase
      .channel(`book_pages:${bookId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "book_pages", filter: `book_id=eq.${bookId}` },
        () => {
          void refresh();
        },
      )
      .subscribe();

    // fallback: refresh on visibility/focus
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onFocus = () => void refresh();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    // slow poll as extra fallback
    const poll = setInterval(() => void refresh(), 60_000);

    return () => {
      supabase.removeChannel(channelBooks);
      supabase.removeChannel(channelPages);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      clearInterval(poll);
    };
  }, [bookId, refresh]); // refresh depends on bookId and is memoized

  return <BookContext.Provider value={{ book, loading, refresh }}>{children}</BookContext.Provider>;
}
