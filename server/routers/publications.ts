import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createEvaluation, createPublication, getBookById, getPagesByBook, updateBook } from "../db";
import { TRPCError } from "@trpc/server";

const editableBookStatuses = ["draft", "rejected"];

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

      return updateBook(input.bookId, { status: "rejected" });
    }),

  // Publish book to library
  publishBook: protectedProcedure
    .input(z.object({ bookId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "coordinator" && ctx.user.role !== "admin") {
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
