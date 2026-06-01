import { TRPCError } from "@trpc/server";
import QRCode from "qrcode";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createCertificate,
  getBookById,
  getCertificateById,
  getCertificatesByUser,
  isLocalStoreMode,
  listCertificates,
} from "../db";
import { storagePut } from "../storage";

export const certificatesRouter = router({
  generateCertificate: protectedProcedure
    .input(
      z.object({
        bookId: z.number(),
        hoursSpent: z.number().min(0).max(999),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const book = await getBookById(input.bookId);
      if (!book) throw new TRPCError({ code: "NOT_FOUND" });
      if (book.authorId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (book.status !== "published") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Livro nao foi publicado" });
      }

      const certificateNumber = `CERT-${book.id}-${ctx.user.id}-${Date.now()}`;
      const qrDataUrl = await QRCode.toDataURL(certificateNumber);
      let qrCodeUrl = qrDataUrl;

      if (!isLocalStoreMode()) {
        try {
          const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");
          const stored = await storagePut(`certificates/qr-${certificateNumber}.png`, qrBuffer, "image/png");
          qrCodeUrl = stored.url;
        } catch {
          qrCodeUrl = `/certificates/${certificateNumber}`;
        }
      }

      const certificate = await createCertificate({
        userId: ctx.user.id,
        bookId: input.bookId,
        certificateNumber,
        hoursSpent: input.hoursSpent.toString(),
        qrCodeUrl,
        issuedAt: new Date(),
      });

      return {
        certificateId: certificate?.id,
        certificateNumber,
        qrCodeUrl,
      };
    }),

  getUserCertificates: protectedProcedure.query(async ({ ctx }) => {
    return getCertificatesByUser(ctx.user.id);
  }),

  getCertificateDetails: protectedProcedure
    .input(z.object({ certificateId: z.number() }))
    .query(async ({ input, ctx }) => {
      const certificate = await getCertificateById(input.certificateId);
      if (!certificate) throw new TRPCError({ code: "NOT_FOUND" });

      if (certificate.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return certificate;
    }),

  listAllCertificates: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return listCertificates();
  }),
});
