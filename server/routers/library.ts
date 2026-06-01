import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getBookById, getPagesByBook, getPublishedBooks } from "../db";
import { TRPCError } from "@trpc/server";

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

      return filtered;
    }),

  getPublishedBook: publicProcedure
    .input(z.object({ bookId: z.number() }))
    .query(async ({ input }) => {
      const book = await getBookById(input.bookId);
      if (!book || book.status !== "published") {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const pages = await getPagesByBook(input.bookId);
      return { book, pages };
    }),
});
