import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { deleteUserById, getUserByEmail, listUsers, updateUserById } from "../db";

const roleSchema = z.enum(["student", "educator", "coordinator", "editor", "admin"]);

export const usersRouter = router({
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
        updatedAt: new Date(),
      };

      return updateUserById(input.userId, updates);
    }),

  listStudents: protectedProcedure.query(async ({ ctx }) => {
    if (!["educator", "coordinator", "editor", "admin"].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const allUsers = await listUsers();
    return allUsers.filter((user) => user.role === "student");
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
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.id < 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Perfil mestre não pode ser editado. Crie usuários reais no painel admin.",
        });
      }

      return updateUserById(ctx.user.id, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email.toLowerCase() } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
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
