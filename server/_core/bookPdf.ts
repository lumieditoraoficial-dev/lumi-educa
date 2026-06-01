import type { Express, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { getBookById, getPagesByBook, listUsers } from "../db";
import { sdk } from "./sdk";

const staffRoles = new Set(["educator", "coordinator", "editor", "admin"]);

function normalizeFileName(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "lumi-educa-livro"
  );
}

function decodeHtmlEntities(content: string) {
  return content
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractPageHtml(content?: string | null) {
  const raw = content ?? "";
  const wrapperMatch = raw.match(/<div[^>]*data-lumi-page-content=["']true["'][^>]*>([\s\S]*)<\/div>\s*$/i);
  return wrapperMatch?.[1] ?? raw;
}

function htmlToText(content?: string | null) {
  return decodeHtmlEntities(
    extractPageHtml(content)
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<\/(p|div|h1|h2|h3|blockquote|li)>/gi, "\n")
      .replace(/<(br|hr)\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function writeWrappedText(doc: PDFKit.PDFDocument, text: string) {
  const paragraphs = text.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);

  if (paragraphs.length === 0) {
    doc.fillColor("#475569").font("Helvetica-Oblique").fontSize(12).text("Pagina sem texto.");
    return;
  }

  doc.fillColor("#111827").font("Helvetica").fontSize(12);
  for (const paragraph of paragraphs) {
    doc.text(paragraph.replace(/\s+/g, " "), {
      align: "justify",
      lineGap: 5,
    });
    doc.moveDown(0.9);
  }
}

function addPageNumbers(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#64748b")
      .text(`Lumi Educa | ${index + 1}`, 54, doc.page.height - 42, {
        align: "center",
        width: doc.page.width - 108,
      });
  }
}

export function registerBookPdfRoutes(app: Express) {
  app.get("/api/books/:bookId/pdf", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const bookId = Number(req.params.bookId);

      if (!Number.isInteger(bookId) || bookId <= 0) {
        res.status(400).json({ message: "Livro invalido." });
        return;
      }

      const book = await getBookById(bookId);
      if (!book) {
        res.status(404).json({ message: "Livro nao encontrado." });
        return;
      }

      if (book.authorId !== user.id && !staffRoles.has(user.role)) {
        res.status(403).json({ message: "Sem permissao para baixar este PDF." });
        return;
      }

      const [pages, users] = await Promise.all([getPagesByBook(bookId), listUsers()]);
      const author = users.find((item) => item.id === book.authorId);
      const fileName = `${normalizeFileName(book.title)}.pdf`;
      const publishedAt = book.publishedAt ? new Date(book.publishedAt).toLocaleDateString("pt-BR") : null;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

      const doc = new PDFDocument({
        size: "A4",
        margin: 54,
        bufferPages: true,
        info: {
          Title: book.title,
          Author: author?.name ?? `Aluno #${book.authorId}`,
          Subject: "Livro estudantil exportado pelo Lumi Educa",
        },
      });

      doc.pipe(res);
      doc.fillColor("#0F3D2E").font("Helvetica-Bold").fontSize(30).text(book.title, { align: "center" });

      if (book.subtitle) {
        doc.moveDown(0.4).fillColor("#266B3D").fontSize(16).text(book.subtitle, { align: "center" });
      }

      doc
        .moveDown(2)
        .fillColor("#111827")
        .font("Helvetica")
        .fontSize(12)
        .text(`Autor: ${author?.name ?? `Aluno #${book.authorId}`}`, { align: "center" })
        .moveDown(0.5)
        .text(`Status: ${book.status}`, { align: "center" });

      if (publishedAt) {
        doc.moveDown(0.5).text(`Publicado em: ${publishedAt}`, { align: "center" });
      }

      if (book.description) {
        doc
          .moveDown(2)
          .fillColor("#334155")
          .fontSize(12)
          .text(book.description, { align: "center", lineGap: 4 });
      }

      doc
        .moveDown(4)
        .fillColor("#6DB33F")
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("Lumi Educa", { align: "center" });

      const sortedPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
      for (const page of sortedPages) {
        doc.addPage();
        doc
          .fillColor("#266B3D")
          .font("Helvetica-Bold")
          .fontSize(11)
          .text(`Pagina ${page.pageNumber}`, { continued: false });
        doc
          .moveDown(0.3)
          .fillColor("#0F172A")
          .fontSize(20)
          .text(page.title || `Pagina ${page.pageNumber}`);
        doc.moveDown(1);
        writeWrappedText(doc, htmlToText(page.content));
      }

      if (sortedPages.length === 0) {
        doc.addPage();
        doc.fillColor("#475569").font("Helvetica").fontSize(12).text("Este livro ainda nao possui paginas.");
      }

      addPageNumbers(doc);
      doc.end();
    } catch (error) {
      if (!res.headersSent) {
        res.status(401).json({ message: "Sessao invalida para baixar PDF." });
      }
    }
  });
}
