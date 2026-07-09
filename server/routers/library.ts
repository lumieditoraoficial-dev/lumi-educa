import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getBookById, getPagesByBook, getPublishedBooks } from "../db";
import { TRPCError } from "@trpc/server";
import { withBookMetrics } from "../_core/pageMetrics";

function getLibraryPages<TPage extends { status: string }>(pages: TPage[]) {
  const publishedPages = pages.filter((page) => page.status === "published");
  if (publishedPages.length > 0) return publishedPages;
  return pages.filter((page) => page.status === "approved");
}

export const libraryRouter = router({
  // Get all published books (public access)
  getPublishedBooks: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
        series: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const publications = await getPublishedBooks();
      
      let filtered = publications.filter((p) => p.book);

      if (input.category) {
        filtered = filtered.filter((p) => p.book?.category === input.category);
      }

      if (input.series) {
        filtered = filtered.filter((p) => p.book?.series === input.series);
      }

      if (input.search) {
        const searchLower = input.search.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.book?.title.toLowerCase().includes(searchLower) ||
            p.book?.description?.toLowerCase().includes(searchLower)
        );
      }

      return Promise.all(
        filtered.map(async (publication) => {
          if (!publication.book) return publication;
          const pages = await getPagesByBook(publication.book.id);
          const libraryPages = getLibraryPages(pages);
          return {
            ...publication,
            book: withBookMetrics(publication.book, libraryPages),
          };
        })
      );
    }),

  getPublishedBook: publicProcedure
    .input(z.object({ bookId: z.number() }))
    .query(async ({ input }) => {
      const book = await getBookById(input.bookId);
      const publications = await getPublishedBooks();
      const publication = publications.find((item) => item.bookId === input.bookId);
      if (!book || !publication) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const pages = await getPagesByBook(input.bookId);
      const libraryPages = getLibraryPages(pages);
      return { book: withBookMetrics(book, libraryPages), pages: libraryPages };
    }),
});
