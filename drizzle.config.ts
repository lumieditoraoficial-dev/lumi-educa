import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

const databaseUrl = new URL(connectionString);
const shouldUseSsl =
  databaseUrl.searchParams.has("sslmode") ||
  databaseUrl.hostname.includes("supabase") ||
  databaseUrl.hostname.includes("pooler");

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: databaseUrl.hostname,
    port: databaseUrl.port ? Number(databaseUrl.port) : 5432,
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    database: databaseUrl.pathname.replace(/^\//, "") || "postgres",
    ...(shouldUseSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  },
});
