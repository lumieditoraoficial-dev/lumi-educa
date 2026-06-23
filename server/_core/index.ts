import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerBookPdfRoutes } from "./bookPdf";
import { registerReportsPdfRoutes } from "./reportsPdf";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { checkDatabaseHealth } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    let finished = false;

    const finish = (available: boolean) => {
      if (finished) return;
      finished = true;
      server.removeAllListeners();

      if (server.listening) {
        server.close(() => resolve(available));
        return;
      }

      resolve(available);
    };

    server.once("listening", () => finish(true));
    server.once("error", () => finish(false));
    server.listen({ port, host: "127.0.0.1" });
    setTimeout(() => finish(false), 700);
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  const healthPayload = () => ({
    ok: true,
    service: "lumi-educa",
    database: {
      configured: Boolean(process.env.DATABASE_URL),
      mode: process.env.DATABASE_URL ? "postgresql" : "local-json",
    },
    timestamp: new Date().toISOString(),
  });

  app.get("/api/health", (_req, res) => {
    res.json(healthPayload());
  });
  app.get("/health", (_req, res) => {
    res.json(healthPayload());
  });
  app.get("/status.json", (_req, res) => {
    res.json(healthPayload());
  });
  app.get("/api/health/database", async (_req, res) => {
    try {
      const database = await checkDatabaseHealth();
      res.json({
        ok: true,
        service: "lumi-educa",
        database,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown database error";
      console.error("[Health] Database check failed:", message);
      res.status(503).json({
        ok: false,
        service: "lumi-educa",
        database: { ok: false, mode: "unavailable" },
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  });
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerBookPdfRoutes(app);
  registerReportsPdfRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
