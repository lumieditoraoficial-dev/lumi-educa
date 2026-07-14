import type { Express, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { getAllBooks, listEvaluations, listSchools, listUsers } from "../db";
import { canSeeAllSchools, normalizeSchoolId, sameSchool } from "./schools";
import { sdk } from "./sdk";

const reportRoles = new Set(["editor", "coordinator", "admin"]);
const STUDENT_BREAK_END_AT = new Date("2026-07-24T23:59:59-03:00");

function studentsOnBreak() {
  return Date.now() <= STUDENT_BREAK_END_AT.getTime();
}

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

function toDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value?: string | Date | null) {
  const date = toDate(value);
  if (!date) return "Nunca acessou";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function accessedToday(student: any) {
  const date = toDate(student.lastSeenAt ?? student.lastSignedIn);
  if (!date) return false;
  return date.toDateString() === new Date().toDateString();
}

function accessLabel() {
  return studentsOnBreak() ? "Uso hoje nas ferias" : "Acesso hoje";
}

function accessSummaryLabel() {
  return studentsOnBreak() ? "Alunos que usaram hoje" : "Alunos que acessaram hoje";
}

function schoolName(schools: any[], schoolId: unknown) {
  const id = normalizeSchoolId(schoolId);
  return schools.find((school) => normalizeSchoolId(school.id) === id)?.name ?? (id === 1 ? "Santissima Trindade" : "Nova escola");
}

function visibleStudentsFor(user: any, users: any[]) {
  let students = users.filter((item) => item.role === "student");
  if (!canSeeAllSchools(user)) {
    students = students.filter((student) => sameSchool(student, user));
  }
  if (user.role === "educator" && user.id > 0) {
    students = students.filter((student) => student.assignedEducatorId === user.id);
  }
  return students;
}

function visibleUsersFor(user: any, users: any[]) {
  if (canSeeAllSchools(user)) return users;
  return users.filter((item) => sameSchool(item, user));
}

function assertCanSeeStudent(res: Response, user: any, student: any) {
  if (canSeeAllSchools(user) || sameSchool(student, user)) return true;
  res.status(403).json({ message: "Sem permissao para ver aluno de outra escola." });
  return false;
}

function scopedBooksForStudents(books: any[], students: any[]) {
  const studentIds = new Set(students.map((student) => student.id));
  return books.filter((book) => studentIds.has(book.authorId));
}

function scopedEvaluationsForBooks(evaluations: any[], books: any[]) {
  const bookIds = new Set(books.map((book) => book.id));
  return evaluations.filter((evaluation) => bookIds.has(evaluation.bookId));
}

function writeStudentSummary(doc: PDFKit.PDFDocument, student: any, books: any[], evaluations: any[], schools: any[] = []) {
  const studentBooks = books.filter((book) => book.authorId === student.id);
  const bookIds = new Set(studentBooks.map((book) => book.id));
  const studentEvaluations = evaluations.filter((evaluation) => bookIds.has(evaluation.bookId));
  const scores = studentEvaluations.map((evaluation) => numberValue(evaluation.score)).filter((score) => score > 0);
  const avg = average(scores);
  const pages = studentBooks.reduce((sum, book) => sum + numberValue(book.pageCount), 0);
  const words = studentBooks.reduce((sum, book) => sum + numberValue(book.wordCount), 0);

  stat(doc, "Aluno", student.name ?? `Aluno #${student.id}`);
  stat(doc, "Escola", schoolName(schools, student.schoolId));
  stat(doc, "Turma", student.className || "Sem turma");
  stat(doc, "Livros", studentBooks.length);
  stat(doc, "Paginas", pages);
  stat(doc, "Palavras", words);
  stat(doc, "Media de notas", avg === null ? "-" : avg.toFixed(1));
  stat(doc, accessLabel(), accessedToday(student) ? "Sim" : "Nao");
  stat(doc, "Ultimo acesso", formatDateTime(student.lastSeenAt ?? student.lastSignedIn));

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
        "Ainda nao ha feedback textual suficiente. Acompanhe producao, revisoes, acesso diario e envio de novas paginas.",
      { lineGap: 4 }
    );

  doc.moveDown(0.5).fillColor("#475569").font("Helvetica").fontSize(10);
  if (avg !== null && avg < 6) {
    doc.text("Encaminhamento: reforcar devolutiva individual, leitura guiada e nova meta semanal.", { lineGap: 3 });
  } else if (!studentsOnBreak() && !accessedToday(student)) {
    doc.text("Encaminhamento: lembrar rotina de acesso diario e acompanhar retomada na semana.", { lineGap: 3 });
  } else if (studentsOnBreak()) {
    doc.text("Encaminhamento: periodo de ferias ativo ate 24/07/2026; manter uso livre e incentivar escrita espontanea.", { lineGap: 3 });
  } else {
    doc.text("Encaminhamento: manter ritmo de escrita, revisoes curtas e metas progressivas.", { lineGap: 3 });
  }
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

      const [users, books, evaluations, schools] = await Promise.all([listUsers(), getAllBooks(), listEvaluations(), listSchools()]);
      const requestedSchoolId =
        canSeeAllSchools(user) && (req.query.schoolId === "1" || req.query.schoolId === "2")
          ? normalizeSchoolId(req.query.schoolId)
          : null;
      const visibleStudents = visibleStudentsFor(user, users).filter(
        (student) => requestedSchoolId === null || normalizeSchoolId(student.schoolId) === requestedSchoolId
      );
      const visibleUsers = visibleUsersFor(user, users).filter(
        (item) => requestedSchoolId === null || normalizeSchoolId(item.schoolId) === requestedSchoolId
      );
      const visibleBooks = scopedBooksForStudents(books, visibleStudents);
      const visibleEvaluations = scopedEvaluationsForBooks(evaluations, visibleBooks);
      const monthlyBooks = visibleBooks.filter((book) => isThisMonth(book.updatedAt ?? book.createdAt));
      const monthlyScores = visibleEvaluations
        .filter((evaluation) => isThisMonth(evaluation.updatedAt ?? evaluation.createdAt))
        .map((evaluation) => numberValue(evaluation.score))
        .filter((score) => score > 0);
      const reportSchoolName = requestedSchoolId
        ? schoolName(schools, requestedSchoolId)
        : canSeeAllSchools(user)
          ? "Rede completa"
          : schoolName(schools, user.schoolId);

      const doc = openReport(res, "Relatorio mensal Lumi Educa", "lumi-educa-relatorio-mensal.pdf");
      stat(doc, "Escola", reportSchoolName);
      stat(doc, "Alunos", visibleStudents.length);
      stat(doc, "Equipe cadastrada", visibleUsers.filter((item) => item.role !== "student").length);
      stat(doc, "Livros movimentados", monthlyBooks.length);
      stat(doc, "Paginas no mes", monthlyBooks.reduce((sum, book) => sum + numberValue(book.pageCount), 0));
      stat(doc, "Palavras no mes", monthlyBooks.reduce((sum, book) => sum + numberValue(book.wordCount), 0));
      stat(doc, "Livros publicados", monthlyBooks.filter((book) => book.status === "published").length);
      stat(doc, "Media de notas", average(monthlyScores)?.toFixed(1) ?? "-");
      stat(doc, "Periodo escolar", studentsOnBreak() ? "Ferias ate 24/07/2026 - uso livre" : "Aulas - acesso diario ativo");
      stat(doc, accessSummaryLabel(), visibleStudents.filter((student) => accessedToday(student)).length);

      doc.moveDown(1).fillColor("#0F3D2E").font("Helvetica-Bold").fontSize(14).text("Leitura para coordenacao pedagogica");
      doc
        .moveDown(0.3)
        .fillColor("#334155")
        .font("Helvetica")
        .fontSize(11)
        .text(
          studentsOnBreak()
            ? "Este relatorio consolida uso nas ferias, escrita, avaliacao e publicacao. O acesso diario nao gera pendencia ate 24/07/2026, mas o uso espontaneo segue sendo acompanhado."
            : "Este relatorio consolida acesso, escrita, avaliacao e publicacao. Use os alertas para planejar devolutivas, chamadas de acesso diario e metas de producao textual por turma.",
          { lineGap: 4 }
        );

      doc.moveDown(1).fillColor("#0F3D2E").font("Helvetica-Bold").fontSize(14).text("Destaques do mes");
      for (const student of visibleStudents.slice(0, 12)) {
        doc.moveDown(0.7);
        writeStudentSummary(doc, student, visibleBooks, visibleEvaluations, schools);
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
      const [users, books, evaluations, schools] = await Promise.all([listUsers(), getAllBooks(), listEvaluations(), listSchools()]);
      const student = users.find((item) => item.id === studentId && item.role === "student");
      if (!student) {
        res.status(404).json({ message: "Aluno nao encontrado." });
        return;
      }
      if (!assertCanSeeStudent(res, user, student)) return;

      const visibleBooks = scopedBooksForStudents(books, [student]);
      const visibleEvaluations = scopedEvaluationsForBooks(evaluations, visibleBooks);

      const doc = openReport(
        res,
        `Relatorio de rendimento - ${student.name}`,
        `${normalizeFileName(`relatorio-${student.name}`)}.pdf`
      );
      writeStudentSummary(doc, student, visibleBooks, visibleEvaluations, schools);
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
      const [users, books, evaluations, schools] = await Promise.all([listUsers(), getAllBooks(), listEvaluations(), listSchools()]);
      const requestedSchoolId = normalizeSchoolId(req.query.schoolId ?? user.schoolId);
      if (!canSeeAllSchools(user) && normalizeSchoolId(user.schoolId) !== requestedSchoolId) {
        res.status(403).json({ message: "Sem permissao para relatorio de outra escola." });
        return;
      }

      const students = visibleStudentsFor(user, users).filter(
        (item) => item.className === className && normalizeSchoolId(item.schoolId) === requestedSchoolId
      );
      const visibleBooks = scopedBooksForStudents(books, students);
      const visibleEvaluations = scopedEvaluationsForBooks(evaluations, visibleBooks);
      const titleSchool = schoolName(schools, requestedSchoolId);

      const doc = openReport(
        res,
        `Relatorio da turma - ${className}`,
        `${normalizeFileName(`turma-${titleSchool}-${className}`)}.pdf`
      );
      stat(doc, "Escola", titleSchool);
      stat(doc, "Alunos na turma", students.length);
      stat(doc, accessSummaryLabel(), students.filter((student) => accessedToday(student)).length);
      stat(doc, "Livros da turma", visibleBooks.length);
      stat(doc, "Paginas da turma", visibleBooks.reduce((sum, book) => sum + numberValue(book.pageCount), 0));
      for (const student of students) {
        doc.moveDown(1);
        writeStudentSummary(doc, student, visibleBooks, visibleEvaluations, schools);
      }
      doc.end();
    } catch {
      if (!res.headersSent) res.status(401).json({ message: "Sessao invalida para baixar relatorio." });
    }
  });
}
