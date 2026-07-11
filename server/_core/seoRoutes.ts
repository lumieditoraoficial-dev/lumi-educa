import type { Express, Request } from "express";

const PUBLIC_ROUTES = ["/", "/library"];
const PRIVATE_PREFIXES = [
  "/api",
  "/books",
  "/dashboard",
  "/login",
  "/messages",
  "/notifications",
  "/page-editor",
  "/profile",
  "/select-school",
  "/signup",
  "/status",
];

function getOrigin(req: Request) {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol || "https";
  const host = req.get("x-forwarded-host") || req.get("host") || "lumi-educa.onrender.com";
  return `${protocol}://${host}`.replace(/\/$/, "");
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function normalizeDate(value: unknown) {
  const date = value instanceof Date ? value : value ? new Date(String(value)) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function isPrivateIndexPath(pathname: string) {
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function registerSeoRoutes(app: Express) {
  app.get("/robots.txt", (req, res) => {
    const origin = getOrigin(req);
    res.type("text/plain").send(
      [
        "User-agent: *",
        "Allow: /",
        "Disallow: /api/",
        "Disallow: /books/",
        "Disallow: /dashboard/",
        "Disallow: /login",
        "Disallow: /messages",
        "Disallow: /notifications",
        "Disallow: /page-editor",
        "Disallow: /profile",
        "Disallow: /select-school",
        "Disallow: /signup",
        "Disallow: /status",
        `Sitemap: ${origin}/sitemap.xml`,
        "",
      ].join("\n")
    );
  });

  app.get("/sitemap.xml", async (req, res) => {
    const origin = getOrigin(req);
    const urls = PUBLIC_ROUTES.map((path) => ({ path, lastmod: normalizeDate(new Date()) }));

    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map(
        (item) =>
          `  <url>\n    <loc>${escapeXml(`${origin}${item.path}`)}</loc>\n    <lastmod>${escapeXml(item.lastmod)}</lastmod>\n  </url>`
      )
      .join("\n")}\n</urlset>\n`;

    res.setHeader("Cache-Control", "public, max-age=900");
    res.type("application/xml").send(body);
  });
}
