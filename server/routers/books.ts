import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createBook, createPage, deletePage, getAllBooks, getBookById, getBooksByAuthor, getPageById, getPagesByBook, updatePage } from "../db";
import { TRPCError } from "@trpc/server";

const staffRoles = ["educator", "coordinator", "editor", "admin"];
const editableBookStatuses = ["draft", "submitted", "under_review", "approved", "rejected"];

export const booksRouter = router({
  // Get all books by current user (student)
  myBooks: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "student") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return getBooksByAuthor(ctx.user.id);
  }),

  listBooks: protectedProcedure.query(async ({ ctx }) => {
    if (!["educator", "coordinator", "editor", "admin"].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return getAllBooks();
  }),

  // Get book details
  getBook: protectedProcedure
    .input(z.object({ bookId: z.number() }))
    .query(async ({ input, ctx }) => {
      const book = await getBookById(input.bookId);
      if (!book) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (book.authorId !== ctx.user.id && !staffRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return book;
    }),

  // Create new book
  createBook: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        subtitle: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        series: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "student") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return createBook({
        authorId: ctx.user.id,
        title: input.title,
        subtitle: input.subtitle,
        description: input.description,
        category: input.category,
        series: input.series,
        status: "draft",
      });
    }),

  // Get pages of a book
  getPages: protectedProcedure
    .input(z.object({ bookId: z.number() }))
    .query(async ({ input, ctx }) => {
      const book = await getBookById(input.bookId);
      if (!book) throw new TRPCError({ code: "NOT_FOUND" });
      if (book.authorId !== ctx.user.id && !staffRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getPagesByBook(input.bookId);
    }),

  // Create page (up to 250 pages per book)
  createPage: protectedProcedure
    .input(
      z.object({
        bookId: z.number(),
        pageNumber: z.number().min(1).max(250),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user owns the book
      const book = await getBookById(input.bookId);
      if (!book || book.authorId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (!editableBookStatuses.includes(book.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este livro ja foi publicado e nao pode receber novas paginas agora." });
      }

      const existingPages = await getPagesByBook(input.bookId);
      if (existingPages.some((page) => page.pageNumber === input.pageNumber)) {
        throw new TRPCError({ code: "CONFLICT", message: "Já existe uma página com esse número" });
      }

      return createPage({
        bookId: input.bookId,
        pageNumber: input.pageNumber,
        title: input.title,
        content: "",
        status: "draft",
      });
    }),

  // Update page content
  updatePageContent: protectedProcedure
    .input(
      z.object({
        pageId: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get page and verify ownership
      const page = await getPageById(input.pageId);
      if (!page) throw new TRPCError({ code: "NOT_FOUND" });

      const book = await getBookById(page.bookId);
      if (!book || book.authorId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (!editableBookStatuses.includes(book.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este livro ja foi publicado e nao pode ser editado agora." });
      }

      return updatePage(input.pageId, {
        title: input.title,
        content: input.content,
      });
    }),

  // Delete page
  deletePage: protectedProcedure
    .input(z.object({ pageId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Get page and verify ownership
      const page = await getPageById(input.pageId);
      if (!page) throw new TRPCError({ code: "NOT_FOUND" });

      const book = await getBookById(page.bookId);
      if (!book || book.authorId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (!editableBookStatuses.includes(book.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este livro ja foi publicado e nao pode ser alterado agora." });
      }

      return deletePage(input.pageId);
    }),
});
