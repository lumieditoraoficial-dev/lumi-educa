import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerBookPdfRoutes } from "./bookPdf";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { checkDatabaseHealth } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
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
  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "lumi-educa",
      database: {
        configured: Boolean(process.env.DATABASE_URL),
        mode: process.env.DATABASE_URL ? "postgresql" : "local-json",
      },
      timestamp: new Date().toISOString(),
    });
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
    } catch {
      res.status(503).json({
        ok: false,
        service: "lumi-educa",
        database: { ok: false, mode: "unavailable" },
        timestamp: new Date().toISOString(),
      });
    }
  });
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerBookPdfRoutes(app);
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
