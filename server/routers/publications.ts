import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createEvaluation, createNotification, createPublication, getBookById, getPagesByBook, updateBook, updatePage } from "../db";
import { TRPCError } from "@trpc/server";
import { polishHtmlForEducator } from "../_core/textReview";

const editableBookStatuses = ["draft", "submitted", "under_review", "approved", "rejected"];

async function preparePagesForReview(bookId: number) {
  const pages = await getPagesByBook(bookId);
  const reviewablePages = pages.filter((page) => !["approved", "published"].includes(page.status));

  for (const page of reviewablePages) {
    const correction = polishHtmlForEducator(page.content);
    await updatePage(page.id, {
      originalContent: correction.changed ? page.content : (page.originalContent ?? null),
      content: correction.corrected,
      aiCorrectedContent: correction.corrected,
      aiCorrectionSummary: correction.summary,
      aiCorrectedAt: new Date(),
      status: "submitted",
    });
  }

  return reviewablePages.length;
}

async function approveSubmittedPages(bookId: number, reviewerId: number) {
  const pages = await getPagesByBook(bookId);
  await Promise.all(
    pages
      .filter((page) => page.status === "submitted")
      .map((page) =>
        updatePage(page.id, {
          status: "approved",
          reviewedAt: new Date(),
          reviewedBy: reviewerId,
        })
      )
  );
}

export const publicationsRouter = router({
  // Submit book for review
  submitForReview: protectedProcedure
    .input(z.object({ bookId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const book = await getBookById(input.bookId);
      if (!book) throw new TRPCError({ code: "NOT_FOUND" });
      if (book.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (!editableBookStatuses.includes(book.status)) throw new TRPCError({ code: "BAD_REQUEST" });

      const pages = await getPagesByBook(input.bookId);
      if (pages.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Crie pelo menos uma pagina antes de enviar para revisao." });
      }

      const pagesToReview = await preparePagesForReview(input.bookId);
      if (pagesToReview === 0 && book.status !== "approved") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhuma pagina nova para revisar." });
      }

      return updateBook(input.bookId, { status: "submitted" });
    }),

  // Educator: Request changes
  requestChanges: protectedProcedure
    .input(z.object({ bookId: z.number(), feedback: z.string(), score: z.number().min(0).max(10) }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "educator") throw new TRPCError({ code: "FORBIDDEN" });

      const book = await getBookById(input.bookId);
      if (!book) throw new TRPCError({ code: "NOT_FOUND" });
      if (book.status !== "submitted") throw new TRPCError({ code: "BAD_REQUEST" });

      await createEvaluation({
        bookId: input.bookId,
        evaluatorId: ctx.user.id,
        status: "completed",
        score: input.score.toString(),
        feedback: input.feedback,
      });

      await createNotification({
        userId: book.authorId,
        type: "warning",
        title: "Livro devolvido para revisão",
        message: input.feedback,
        relatedEntityId: input.bookId,
        relatedEntityType: "book",
      });

      return updateBook(input.bookId, { status: "rejected" });
    }),

  // Educator: Approve for coordinator review
  approveForCoordinator: protectedProcedure
    .input(z.object({ bookId: z.number(), feedback: z.string().optional(), score: z.number().min(0).max(10) }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "educator") throw new TRPCError({ code: "FORBIDDEN" });

      const book = await getBookById(input.bookId);
      if (!book) throw new TRPCError({ code: "NOT_FOUND" });
      if (book.status !== "submitted") throw new TRPCError({ code: "BAD_REQUEST" });

      await createEvaluation({
        bookId: input.bookId,
        evaluatorId: ctx.user.id,
        status: "completed",
        score: input.score.toString(),
        feedback: input.feedback,
      });

      await approveSubmittedPages(input.bookId, ctx.user.id);
      await createNotification({
        userId: book.authorId,
        type: "success",
        title: "Páginas aprovadas pelo educador",
        message: input.feedback || "O educador aprovou as páginas novas e encaminhou o livro para a coordenação.",
        relatedEntityId: input.bookId,
        relatedEntityType: "book",
      });

      return updateBook(input.bookId, { status: "under_review" });
    }),

  // Coordinator: Approve for publication
  approveForPublication: protectedProcedure
    .input(z.object({ bookId: z.number(), score: z.number().min(0).max(10), feedback: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "coordinator" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const book = await getBookById(input.bookId);
      if (!book) throw new TRPCError({ code: "NOT_FOUND" });
      if (book.status !== "under_review") throw new TRPCError({ code: "BAD_REQUEST" });

      await createEvaluation({
        bookId: input.bookId,
        evaluatorId: ctx.user.id,
        status: "completed",
        score: input.score.toString(),
        feedback: input.feedback,
      });

      await approveSubmittedPages(input.bookId, ctx.user.id);
      await createNotification({
        userId: book.authorId,
        type: "success",
        title: "Livro aprovado pela coordenação",
        message: input.feedback || "A coordenação aprovou o livro para preparação editorial.",
        relatedEntityId: input.bookId,
        relatedEntityType: "book",
      });

      return updateBook(input.bookId, { status: "approved" });
    }),

  // Coordinator: Reject book
  rejectBook: protectedProcedure
    .input(z.object({ bookId: z.number(), reason: z.string(), score: z.number().min(0).max(10) }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "coordinator" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const book = await getBookById(input.bookId);
      if (!book) throw new TRPCError({ code: "NOT_FOUND" });
      if (!["under_review", "approved"].includes(book.status)) throw new TRPCError({ code: "BAD_REQUEST" });

      await createEvaluation({
        bookId: input.bookId,
        evaluatorId: ctx.user.id,
        status: "completed",
        score: input.score.toString(),
        feedback: input.reason,
      });

      await createNotification({
        userId: book.authorId,
        type: "warning",
        title: "Livro recusado pela coordenação",
        message: input.reason,
        relatedEntityId: input.bookId,
        relatedEntityType: "book",
      });

      return updateBook(input.bookId, { status: "rejected" });
    }),

  // Publish book to library
  publishBook: protectedProcedure
    .input(z.object({ bookId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!["editor", "coordinator", "admin"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const book = await getBookById(input.bookId);
      if (!book) throw new TRPCError({ code: "NOT_FOUND" });
      if (book.status !== "approved") throw new TRPCError({ code: "BAD_REQUEST" });

      const updatedBook = await updateBook(input.bookId, {
        status: "published",
        publishedAt: new Date(),
      });

      await createPublication({
        bookId: input.bookId,
        publishedBy: ctx.user.id,
        status: "published",
        libraryUrl: `/library/book/${input.bookId}`,
      });

      return updatedBook;
    }),
});
