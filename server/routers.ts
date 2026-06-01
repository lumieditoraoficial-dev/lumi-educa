import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { booksRouter } from "./routers/books";
import { evaluationsRouter } from "./routers/evaluations";
import { libraryRouter } from "./routers/library";
import { publicationsRouter } from "./routers/publications";
import { aiRouter } from "./routers/ai";
import { certificatesRouter } from "./routers/certificates";
import { notificationsRouter } from "./routers/notifications";
import { usersRouter } from "./routers/users";
import { authRouter } from "./routers/auth";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: authRouter,
  books: booksRouter,
  evaluations: evaluationsRouter,
  library: libraryRouter,
  publications: publicationsRouter,
  ai: aiRouter,
  certificates: certificatesRouter,
  notifications: notificationsRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
