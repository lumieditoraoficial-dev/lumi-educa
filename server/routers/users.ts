import { TRPCError } from "@trpc/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { deleteUserById, getUserByEmail, listUsers, updateUserById } from "../db";

const roleSchema = z.enum(["student", "educator", "coordinator", "editor", "admin"]);

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(`${salt}:${password}`).digest("hex");
  return `${salt}:${hash}`;
}

export const usersRouter = router({
  heartbeat: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.id < 0) return { success: true };

    await updateUserById(ctx.user.id, { lastSeenAt: new Date() });
    return { success: true };
  }),

  listUsers: protectedProcedure.query(async ({ ctx }) => {
    if (!["admin", "editor", "coordinator"].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return listUsers();
  }),

  getUser: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input, ctx }) => {
    if (!["admin", "editor", "coordinator"].includes(ctx.user.role) && ctx.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const allUsers = await listUsers();
      return allUsers.find((user) => user.id === input.userId) ?? null;
    }),

  updateUser: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        role: roleSchema.optional(),
        avatarUrl: z.string().nullable().optional(),
        className: z.string().nullable().optional(),
        assignedEducatorId: z.number().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (input.email) {
        const existing = await getUserByEmail(input.email.toLowerCase());
        if (existing && existing.id !== input.userId) {
          throw new TRPCError({ code: "CONFLICT", message: "Email já está em uso" });
        }
      }

      const updates = {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email.toLowerCase() } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
        ...(input.className !== undefined ? { className: input.className } : {}),
        ...(input.assignedEducatorId !== undefined ? { assignedEducatorId: input.assignedEducatorId } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        updatedAt: new Date(),
      };

      return updateUserById(input.userId, updates);
    }),

  listStudents: protectedProcedure.query(async ({ ctx }) => {
    if (!["educator", "coordinator", "editor", "admin"].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const allUsers = await listUsers();
    const students = allUsers.filter((user) => user.role === "student");

    if (ctx.user.role === "educator" && ctx.user.id > 0) {
      return students.filter((user) => user.assignedEducatorId === ctx.user.id || user.assignedEducatorId == null);
    }

    return students;
  }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        avatarUrl: z.string().nullable().optional(),
        password: z.string().min(6).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.id < 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Perfil mestre não pode ser editado. Crie usuários reais no painel admin.",
        });
      }

      if (input.email) {
        const existing = await getUserByEmail(input.email.toLowerCase());
        if (existing && existing.id !== ctx.user.id) {
          throw new TRPCError({ code: "CONFLICT", message: "Email ja esta em uso." });
        }
      }

      return updateUserById(ctx.user.id, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email.toLowerCase() } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
        ...(input.password !== undefined ? { passwordHash: hashPassword(input.password) } : {}),
        updatedAt: new Date(),
      });
    }),

  assignStudent: protectedProcedure
    .input(
      z.object({
        studentId: z.number(),
        educatorId: z.number().nullable().optional(),
        className: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!["editor", "coordinator", "admin"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const allUsers = await listUsers();
      const student = allUsers.find((user) => user.id === input.studentId && user.role === "student");
      if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Aluno nao encontrado." });

      if (input.educatorId !== undefined && input.educatorId !== null) {
        const educator = allUsers.find((user) => user.id === input.educatorId && user.role === "educator");
        if (!educator) throw new TRPCError({ code: "BAD_REQUEST", message: "Educador invalido." });
      }

      return updateUserById(input.studentId, {
        ...(input.educatorId !== undefined ? { assignedEducatorId: input.educatorId } : {}),
        ...(input.className !== undefined ? { className: input.className } : {}),
        updatedAt: new Date(),
      });
    }),

  deleteUser: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return deleteUserById(input.userId);
    }),
});
