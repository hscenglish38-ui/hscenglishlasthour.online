import { loadPublishedBook } from "@/lib/book/source";
import { BookExperience } from "@/components/book/BookExperience";
import { BookProvider } from "@/components/book/BookProvider";

export const instant = false;

export default async function Home() {
  const book = await loadPublishedBook();
  return (
    <BookProvider initialBook={book} bookId={book.id}>
      <BookExperience />
    </BookProvider>
  );
}
