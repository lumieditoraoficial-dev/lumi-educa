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
import { canSeeAllSchools, sameSchool } from "../_core/schools";
import { buildBookMetricsFromPages, withBookMetrics } from "../_core/pageMetrics";

const staffRoles = ["educator", "coordinator", "editor", "admin"];
const editableBookStatuses = ["draft", "submitted", "under_review", "approved", "rejected", "published"];

async function syncBookMetrics(bookId: number) {
  const pages = await getPagesByBook(bookId);
  await updateBook(bookId, buildBookMetricsFromPages(pages));
}

async function enrichBookMetrics<TBook extends { id: number; pageCount?: number | null; wordCount?: number | null }>(book: TBook) {
  const pages = await getPagesByBook(book.id);
  return withBookMetrics(book, pages);
}

async function enrichBooksMetrics<TBook extends { id: number; pageCount?: number | null; wordCount?: number | null }>(books: TBook[]) {
  return Promise.all(books.map((book) => enrichBookMetrics(book)));
}

function getVisibleStudentIds(users: Awaited<ReturnType<typeof listUsers>>, viewer: any) {
  let students = users.filter((user) => user.role === "student");

  if (!canSeeAllSchools(viewer)) {
    students = students.filter((user) => sameSchool(user, viewer));
  }

  if (viewer.role === "educator" && viewer.id > 0) {
    students = students.filter((user) => user.assignedEducatorId === viewer.id);
  }

  return new Set(students.map((user) => user.id));
}

function canAccessBook(book: { authorId: number }, viewer: any, users: Awaited<ReturnType<typeof listUsers>>) {
  if (book.authorId === viewer.id) return true;
  if (!staffRoles.includes(viewer.role)) return false;
  if (canSeeAllSchools(viewer)) return true;
  return getVisibleStudentIds(users, viewer).has(book.authorId);
}

export const booksRouter = router({
  // Get all books by current user (student)
  myBooks: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "student") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const books = await getBooksByAuthor(ctx.user.id);
    return enrichBooksMetrics(books);
  }),

  listBooks: protectedProcedure.query(async ({ ctx }) => {
    if (!["educator", "coordinator", "editor", "admin"].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const books = await getAllBooks();

    if (!canSeeAllSchools(ctx.user)) {
      const users = await listUsers();
      const allowedStudentIds = getVisibleStudentIds(users, ctx.user);
      return enrichBooksMetrics(books.filter((book) => allowedStudentIds.has(book.authorId)));
    }

    return enrichBooksMetrics(books);
  }),

  // Get book details
  getBook: protectedProcedure
    .input(z.object({ bookId: z.number() }))
    .query(async ({ input, ctx }) => {
      const book = await getBookById(input.bookId);
      if (!book) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const users = await listUsers();
      if (!canAccessBook(book, ctx.user, users)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return enrichBookMetrics(book);
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
      const users = await listUsers();
      if (!canAccessBook(book, ctx.user, users)) {
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
      if (page.status === "published" || (book.status === "published" && page.status === "approved")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta parte ja esta publicada. Use continuar escrevendo para criar a proxima parte." });
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
      if (page.status === "published" || (book.status === "published" && page.status === "approved")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta parte ja esta publicada e nao pode ser removida." });
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

      const users = await listUsers();
      const canEditOwn = ctx.user.role === "student" && book.authorId === ctx.user.id;
      const canEditEditorial = ["editor", "coordinator", "admin"].includes(ctx.user.role) && canAccessBook(book, ctx.user, users);

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

      const users = await listUsers();
      const canDeleteOwn = ctx.user.role === "student" && book.authorId === ctx.user.id && book.status !== "published";
      const canDeleteEditorial = ["editor", "admin"].includes(ctx.user.role) && canAccessBook(book, ctx.user, users);

      if (!canDeleteOwn && !canDeleteEditorial) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return deleteBookById(input.bookId);
    }),
});
