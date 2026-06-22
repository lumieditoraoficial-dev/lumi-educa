import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createEvaluation,
  getAllBooks,
  createRubricScore,
  getBookById,
  getBooksByAuthor,
  getEvaluationsByBook,
  getRubricScoresByEvaluation,
  listUsers,
} from "../db";
import { canSeeAllSchools, sameSchool } from "../_core/schools";

function visibleBookIdsForViewer(
  books: Awaited<ReturnType<typeof getAllBooks>>,
  users: Awaited<ReturnType<typeof listUsers>>,
  viewer: any
) {
  if (canSeeAllSchools(viewer)) return new Set(books.map((book) => book.id));

  const visibleStudentIds = new Set(
    users
      .filter((user) => user.role === "student")
      .filter((user) => sameSchool(user, viewer))
      .filter((user) => viewer.role !== "educator" || viewer.id <= 0 || user.assignedEducatorId === viewer.id || user.assignedEducatorId == null)
      .map((user) => user.id)
  );

  return new Set(books.filter((book) => visibleStudentIds.has(book.authorId)).map((book) => book.id));
}

async function assertCanSeeBook(book: { id: number; authorId: number }, viewer: any) {
  if (book.authorId === viewer.id || canSeeAllSchools(viewer)) return;

  const users = await listUsers();
  const author = users.find((user) => user.id === book.authorId);
  if (!author || !sameSchool(author, viewer)) throw new TRPCError({ code: "FORBIDDEN" });

  if (viewer.role === "educator" && viewer.id > 0 && author.assignedEducatorId !== viewer.id && author.assignedEducatorId != null) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

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
      await assertCanSeeBook(book, ctx.user);

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
      await assertCanSeeBook(book, ctx.user);

      return getEvaluationsByBook(input.bookId);
    }),

  getBookEvaluationDetails: protectedProcedure
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
      await assertCanSeeBook(book, ctx.user);

      const [evaluations, users] = await Promise.all([getEvaluationsByBook(input.bookId), listUsers()]);
      return evaluations
        .slice()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .map((evaluation) => {
          const evaluator = users.find((user) => user.id === evaluation.evaluatorId);
          return {
            ...evaluation,
            evaluatorName: evaluator?.name ?? "Equipe pedagogica",
            evaluatorRole: evaluator?.role ?? null,
          };
        });
    }),

  listEvaluations: protectedProcedure.query(async ({ ctx }) => {
    if (!["educator", "coordinator", "editor", "admin"].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const { listEvaluations } = await import("../db");
    const allEvaluations = await listEvaluations();
    if (canSeeAllSchools(ctx.user)) return allEvaluations;

    const [books, users] = await Promise.all([getAllBooks(), listUsers()]);
    const visibleBookIds = visibleBookIdsForViewer(books, users, ctx.user);
    return allEvaluations.filter((evaluation) => visibleBookIds.has(evaluation.bookId));
  }),

  myEvaluations: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "student") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const [studentBooks, users] = await Promise.all([getBooksByAuthor(ctx.user.id), listUsers()]);
    const result = [];

    for (const book of studentBooks) {
      const bookEvaluations = await getEvaluationsByBook(book.id);
      for (const evaluation of bookEvaluations) {
        const evaluator = users.find((user) => user.id === evaluation.evaluatorId);
        result.push({
          ...evaluation,
          bookTitle: book.title,
          evaluatorName: evaluator?.name ?? "Equipe pedagogica",
          evaluatorRole: evaluator?.role ?? null,
        });
      }
    }

    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
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
