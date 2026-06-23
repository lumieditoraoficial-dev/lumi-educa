import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { canSeeAllSchools, normalizeSchoolId } from "../_core/schools";
import { protectedProcedure, router } from "../_core/trpc";
import { listSchools, updateSchoolById } from "../db";

const schoolProfileSchema = z.object({
  schoolId: z.number().int().min(1).max(2),
  name: z.string().min(2).max(255).optional(),
  description: z.string().max(400).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  logoUrl: z.string().max(2_500_000).nullable().optional(),
});

function cleanText(value?: string | null) {
  if (value === undefined) return undefined;
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const schoolsRouter = router({
  listSchools: protectedProcedure.query(async ({ ctx }) => {
    const allSchools = await listSchools();

    if (ctx.user.id < 0 || canSeeAllSchools(ctx.user)) {
      return allSchools;
    }

    const schoolId = normalizeSchoolId(ctx.user.schoolId);
    return allSchools.filter((school) => normalizeSchoolId(school.id) === schoolId);
  }),

  updateSchool: protectedProcedure
    .input(schoolProfileSchema)
    .mutation(async ({ input, ctx }) => {
      const isInternalManager = ctx.user.id < 0 && ["admin", "editor"].includes(ctx.user.role);
      if (!isInternalManager) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Somente o acesso interno pode editar a identidade das escolas.",
        });
      }

      return updateSchoolById(input.schoolId, {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined ? { description: cleanText(input.description) } : {}),
        ...(input.address !== undefined ? { address: cleanText(input.address) } : {}),
        ...(input.city !== undefined ? { city: cleanText(input.city) } : {}),
        ...(input.state !== undefined ? { state: cleanText(input.state) } : {}),
        ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl || null } : {}),
      });
    }),
});
