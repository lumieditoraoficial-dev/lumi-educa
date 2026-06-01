import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createEvaluation,
  createRubricScore,
  getBookById,
  getEvaluationsByBook,
  getRubricScoresByEvaluation,
} from "../db";

export const evaluationsRouter = router({
  createEvaluation: protectedProcedure
    .input(
      z.object({
        bookId: z.number(),
        scores: z.array(
          z.object({
            criterionName: z.string(),
            score: z.number().min(0).max(10),
            comment: z.string().optional(),
          })
        ),
        generalFeedback: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!["educator", "coordinator", "editor", "admin"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const book = await getBookById(input.bookId);
      if (!book) throw new TRPCError({ code: "NOT_FOUND" });

      const avgScore =
        input.scores.reduce((sum, score) => sum + score.score, 0) / input.scores.length;

      const evaluationResult: any = await createEvaluation({
        bookId: input.bookId,
        evaluatorId: ctx.user.id,
        status: "completed",
        score: avgScore.toString(),
        feedback: input.generalFeedback,
      });

      const evaluationId = evaluationResult?.id ?? evaluationResult?.insertId ?? 0;

      for (const score of input.scores) {
        await createRubricScore({
          evaluationId,
          rubricId: null,
          criterionName: score.criterionName,
          score: score.score,
          comment: score.comment ?? null,
        });
      }

      return { evaluationId, score: avgScore };
    }),

  getBookEvaluations: protectedProcedure
    .input(z.object({ bookId: z.number() }))
    .query(async ({ input, ctx }) => {
      const book = await getBookById(input.bookId);
      if (!book) throw new TRPCError({ code: "NOT_FOUND" });

      if (
        ctx.user.id !== book.authorId &&
        !["educator", "coordinator", "editor", "admin"].includes(ctx.user.role)
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return getEvaluationsByBook(input.bookId);
    }),

  listEvaluations: protectedProcedure.query(async ({ ctx }) => {
    if (!["educator", "coordinator", "editor", "admin"].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const { listEvaluations } = await import("../db");
    return listEvaluations();
  }),

  getEvaluationScores: protectedProcedure
    .input(z.object({ evaluationId: z.number() }))
    .query(async ({ input }) => {
      return getRubricScoresByEvaluation(input.evaluationId);
    }),

  getBookAverageScore: protectedProcedure
    .input(z.object({ bookId: z.number() }))
    .query(async ({ input }) => {
      const evals = await getEvaluationsByBook(input.bookId);
      if (evals.length === 0) return null;

      const avgScore =
        evals.reduce((sum, evaluation) => sum + (parseFloat(evaluation.score as string) || 0), 0) /
        evals.length;

      return {
        averageScore: avgScore,
        evaluationCount: evals.length,
        lastEvaluation: evals[evals.length - 1]?.updatedAt,
      };
    }),
});
