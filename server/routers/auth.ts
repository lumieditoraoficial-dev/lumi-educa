import { TRPCError } from "@trpc/server";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { ENV } from "../_core/env";
import { sdk } from "../_core/sdk";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { createUser, getUserByEmail, updateUserById } from "../db";
import { getMasterUser, masterRoles } from "../localStore";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(`${salt}:${password}`).digest("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const computed = createHash("sha256").update(`${salt}:${password}`).digest("hex");
  const left = Buffer.from(hash, "hex");
  const right = Buffer.from(computed, "hex");

  return left.length === right.length && timingSafeEqual(left, right);
}

async function setSessionCookie(ctx: any, openId: string, name: string) {
  const sessionToken = await sdk.createSessionToken(openId, {
    name,
    expiresInMs: ONE_YEAR_MS,
  });

  ctx.res.cookie(COOKIE_NAME, sessionToken, {
    ...getSessionCookieOptions(ctx.req),
    maxAge: ONE_YEAR_MS,
  });
}

const roleSchema = z.enum(["student", "educator", "coordinator", "editor", "admin"]);

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email("Email invalido"),
        password: z.string().min(6, "Senha deve ter no minimo 6 caracteres"),
        name: z.string().min(2, "Nome deve ter no minimo 2 caracteres"),
        role: roleSchema.default("student"),
        avatarUrl: z.string().optional(),
        className: z.string().optional(),
        assignedEducatorId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ input }: any) => {
      const normalizedEmail = input.email.toLowerCase();
      const existingUser = await getUserByEmail(normalizedEmail);

      if (existingUser) {
        throw new TRPCError({ code: "CONFLICT", message: "Email ja registrado" });
      }

      await createUser({
        email: normalizedEmail,
        name: input.name,
        passwordHash: hashPassword(input.password),
        avatarUrl: input.avatarUrl,
        role: input.role,
        className: input.className,
        assignedEducatorId: input.assignedEducatorId,
        loginMethod: "email",
        openId: `email_${normalizedEmail}`,
        isActive: true,
        lastSignedIn: new Date(),
        lastSeenAt: new Date(),
      });

      return { success: true, message: "Usuario registrado com sucesso" };
    }),

  login: publicProcedure
    .input(
      z
        .object({
          email: z.string().email("Email invalido").optional(),
          password: z.string().min(1, "Informe a senha"),
          role: roleSchema.optional(),
        })
        .refine((value) => value.email || value.role, {
          message: "Informe um email ou selecione um perfil mestre",
        })
    )
    .mutation(async ({ input, ctx }: any) => {
      if (input.role && !input.email) {
        if (!masterRoles.includes(input.role) || input.password !== ENV.masterPassword) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha mestra incorreta" });
        }

        const user = getMasterUser(input.role);
        await setSessionCookie(ctx, user.openId ?? "", user.name ?? "Usuario");

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        };
      }

      const email = input.email?.toLowerCase();
      if (!email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Email obrigatorio" });
      }

      const user = await getUserByEmail(email);
      if (!user || !user.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha incorretos" });
      }

      if (user.isActive === false) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Perfil inativo. Fale com a administracao." });
      }

      const signedInAt = new Date();
      await updateUserById(user.id, { lastSignedIn: signedInAt, lastSeenAt: signedInAt });
      await setSessionCookie(ctx, user.openId ?? `email_${email}`, user.name ?? "Usuario");

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    }),

  logout: publicProcedure.mutation(({ ctx }: any) => {
    ctx.res.clearCookie(COOKIE_NAME, {
      ...getSessionCookieOptions(ctx.req),
      maxAge: -1,
    });
    return { success: true };
  }),

  switchMasterRole: protectedProcedure
    .input(z.object({ role: roleSchema }))
    .mutation(async ({ input, ctx }: any) => {
      if (ctx.user.id >= 0) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Troca rapida disponivel apenas no acesso interno." });
      }

      if (!masterRoles.includes(input.role)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Perfil invalido." });
      }

      const user = getMasterUser(input.role);
      await setSessionCookie(ctx, user.openId ?? "", user.name ?? "Usuario");

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
      };
    }),

  me: publicProcedure.query((opts: any) => opts.ctx.user),
});
