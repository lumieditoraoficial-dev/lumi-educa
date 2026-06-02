import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createBook,
  createPage,
  deleteBookById,
  deletePage,
  getAllBooks,
  getBookById,
  getBooksByAuthor,
  getPageById,
  getPagesByBook,
  listUsers,
  updateBook,
  updatePage,
} from "../db";
import { TRPCError } from "@trpc/server";
import { countWords } from "../_core/textReview";

const staffRoles = ["educator", "coordinator", "editor", "admin"];
const editableBookStatuses = ["draft", "submitted", "under_review", "approved", "rejected"];

async function syncBookMetrics(bookId: number) {
  const pages = await getPagesByBook(bookId);
  await updateBook(bookId, {
    pageCount: pages.length,
    wordCount: pages.reduce((sum, page) => sum + countWords(page.content), 0),
  });
}

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

    const books = await getAllBooks();

    if (ctx.user.role === "educator" && ctx.user.id > 0) {
      const users = await listUsers();
      const allowedStudentIds = new Set(
        users
          .filter((user) => user.role === "student")
          .filter((user) => user.assignedEducatorId === ctx.user.id || user.assignedEducatorId == null)
          .map((user) => user.id)
      );
      return books.filter((book) => allowedStudentIds.has(book.authorId));
    }

    return books;
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

      const page = await createPage({
        bookId: input.bookId,
        pageNumber: input.pageNumber,
        title: input.title,
        content: "",
        status: "draft",
      });
      await syncBookMetrics(input.bookId);
      return page;
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

      const contentChanged = input.content !== undefined && input.content !== page.content;
      const updated = await updatePage(input.pageId, {
        title: input.title,
        content: input.content,
        ...(contentChanged ? { status: "draft" as const } : {}),
      });
      await syncBookMetrics(page.bookId);
      return updated;
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

      const result = await deletePage(input.pageId);
      await syncBookMetrics(page.bookId);
      return result;
    }),

  updateBookDetails: protectedProcedure
    .input(
      z.object({
        bookId: z.number(),
        title: z.string().min(1).optional(),
        subtitle: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        category: z.string().nullable().optional(),
        series: z.string().nullable().optional(),
        coverImageUrl: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const book = await getBookById(input.bookId);
      if (!book) throw new TRPCError({ code: "NOT_FOUND" });

      const canEditOwn = ctx.user.role === "student" && book.authorId === ctx.user.id && book.status !== "published";
      const canEditEditorial = ["editor", "coordinator", "admin"].includes(ctx.user.role);

      if (!canEditOwn && !canEditEditorial) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return updateBook(input.bookId, {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.series !== undefined ? { series: input.series } : {}),
        ...(input.coverImageUrl !== undefined ? { coverImageUrl: input.coverImageUrl } : {}),
      });
    }),

  deleteBook: protectedProcedure
    .input(z.object({ bookId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const book = await getBookById(input.bookId);
      if (!book) throw new TRPCError({ code: "NOT_FOUND" });

      const canDeleteOwn = ctx.user.role === "student" && book.authorId === ctx.user.id && book.status !== "published";
      const canDeleteEditorial = ["editor", "admin"].includes(ctx.user.role);

      if (!canDeleteOwn && !canDeleteEditorial) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return deleteBookById(input.bookId);
    }),
});
