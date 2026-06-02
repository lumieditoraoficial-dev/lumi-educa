import type { Express, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { getAllBooks, listEvaluations, listUsers } from "../db";
import { sdk } from "./sdk";

const reportRoles = new Set(["editor", "coordinator", "admin"]);

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isThisMonth(value: unknown) {
  const date = new Date(String(value ?? Date.now()));
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function normalizeFileName(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "lumi-educa-relatorio"
  );
}

function openReport(res: Response, title: string, fileName: string) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const doc = new PDFDocument({
    size: "A4",
    margin: 54,
    info: {
      Title: title,
      Author: "Lumi Educa",
      Subject: "Relatorio pedagogico",
    },
  });

  doc.pipe(res);
  doc.fillColor("#0F3D2E").font("Helvetica-Bold").fontSize(24).text(title);
  doc.moveDown(0.5).fillColor("#475569").font("Helvetica").fontSize(10).text(`Gerado em ${new Date().toLocaleString("pt-BR")}`);
  doc.moveDown(1.2);

  return doc;
}

function stat(doc: PDFKit.PDFDocument, label: string, value: string | number) {
  doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(12).text(`${label}: `, { continued: true });
  doc.fillColor("#334155").font("Helvetica").fontSize(12).text(String(value));
}

function average(scores: number[]) {
  if (scores.length === 0) return null;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function writeStudentSummary(doc: PDFKit.PDFDocument, student: any, books: any[], evaluations: any[]) {
  const studentBooks = books.filter((book) => book.authorId === student.id);
  const bookIds = new Set(studentBooks.map((book) => book.id));
  const studentEvaluations = evaluations.filter((evaluation) => bookIds.has(evaluation.bookId));
  const scores = studentEvaluations.map((evaluation) => numberValue(evaluation.score)).filter((score) => score > 0);
  const avg = average(scores);
  const pages = studentBooks.reduce((sum, book) => sum + numberValue(book.pageCount), 0);
  const words = studentBooks.reduce((sum, book) => sum + numberValue(book.wordCount), 0);

  stat(doc, "Aluno", student.name ?? `Aluno #${student.id}`);
  stat(doc, "Turma", student.className || "Sem turma");
  stat(doc, "Livros", studentBooks.length);
  stat(doc, "Paginas", pages);
  stat(doc, "Palavras", words);
  stat(doc, "Media de notas", avg === null ? "-" : avg.toFixed(1));

  const latestFeedback = studentEvaluations
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

  doc.moveDown(0.8).fillColor("#0F3D2E").font("Helvetica-Bold").fontSize(14).text("Leitura pedagogica");
  doc
    .moveDown(0.3)
    .fillColor("#334155")
    .font("Helvetica")
    .fontSize(11)
    .text(
      latestFeedback?.feedback ||
        "Ainda nao ha feedback textual suficiente. Acompanhe producao, revisoes e envio de novas paginas.",
      { lineGap: 4 }
    );
}

async function authorize(req: Request, res: Response) {
  const user = await sdk.authenticateRequest(req);
  if (!reportRoles.has(user.role)) {
    res.status(403).json({ message: "Sem permissao para baixar relatorio." });
    return null;
  }
  return user;
}

export function registerReportsPdfRoutes(app: Express) {
  app.get("/api/reports/monthly.pdf", async (req: Request, res: Response) => {
    try {
      const user = await authorize(req, res);
      if (!user) return;

      const [users, books, evaluations] = await Promise.all([listUsers(), getAllBooks(), listEvaluations()]);
      const monthlyBooks = books.filter((book) => isThisMonth(book.updatedAt ?? book.createdAt));
      const monthlyScores = evaluations
        .filter((evaluation) => isThisMonth(evaluation.updatedAt ?? evaluation.createdAt))
        .map((evaluation) => numberValue(evaluation.score))
        .filter((score) => score > 0);

      const doc = openReport(res, "Relatorio mensal Lumi Educa", "lumi-educa-relatorio-mensal.pdf");
      stat(doc, "Alunos", users.filter((item) => item.role === "student").length);
      stat(doc, "Livros movimentados", monthlyBooks.length);
      stat(doc, "Paginas no mes", monthlyBooks.reduce((sum, book) => sum + numberValue(book.pageCount), 0));
      stat(doc, "Palavras no mes", monthlyBooks.reduce((sum, book) => sum + numberValue(book.wordCount), 0));
      stat(doc, "Livros publicados", monthlyBooks.filter((book) => book.status === "published").length);
      stat(doc, "Media de notas", average(monthlyScores)?.toFixed(1) ?? "-");

      doc.moveDown(1).fillColor("#0F3D2E").font("Helvetica-Bold").fontSize(14).text("Destaques do mes");
      const students = users.filter((item) => item.role === "student");
      for (const student of students.slice(0, 12)) {
        doc.moveDown(0.7);
        writeStudentSummary(doc, student, books, evaluations);
      }

      doc.end();
    } catch {
      if (!res.headersSent) res.status(401).json({ message: "Sessao invalida para baixar relatorio." });
    }
  });

  app.get("/api/reports/student/:studentId.pdf", async (req: Request, res: Response) => {
    try {
      const user = await authorize(req, res);
      if (!user) return;

      const studentId = Number(req.params.studentId);
      const [users, books, evaluations] = await Promise.all([listUsers(), getAllBooks(), listEvaluations()]);
      const student = users.find((item) => item.id === studentId && item.role === "student");
      if (!student) {
        res.status(404).json({ message: "Aluno nao encontrado." });
        return;
      }

      const doc = openReport(
        res,
        `Relatorio de rendimento - ${student.name}`,
        `${normalizeFileName(`relatorio-${student.name}`)}.pdf`
      );
      writeStudentSummary(doc, student, books, evaluations);
      doc.end();
    } catch {
      if (!res.headersSent) res.status(401).json({ message: "Sessao invalida para baixar relatorio." });
    }
  });

  app.get("/api/reports/class/:className.pdf", async (req: Request, res: Response) => {
    try {
      const user = await authorize(req, res);
      if (!user) return;

      const className = decodeURIComponent(req.params.className);
      const [users, books, evaluations] = await Promise.all([listUsers(), getAllBooks(), listEvaluations()]);
      const students = users.filter((item) => item.role === "student" && item.className === className);

      const doc = openReport(res, `Relatorio da turma - ${className}`, `${normalizeFileName(`turma-${className}`)}.pdf`);
      stat(doc, "Alunos na turma", students.length);
      for (const student of students) {
        doc.moveDown(1);
        writeStudentSummary(doc, student, books, evaluations);
      }
      doc.end();
    } catch {
      if (!res.headersSent) res.status(401).json({ message: "Sessao invalida para baixar relatorio." });
    }
  });
}
