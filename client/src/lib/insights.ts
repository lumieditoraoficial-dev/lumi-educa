import { STUDENT_BREAK_LABEL, STUDENTS_ON_BREAK } from "./academicCalendar";

export const ONLINE_WINDOW_MS = 75_000;

type AnyUser = {
  id: number;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  schoolId?: number | null;
  className?: string | null;
  assignedEducatorId?: number | null;
  isActive?: boolean | null;
  lastSeenAt?: string | Date | null;
  lastSignedIn?: string | Date | null;
};

type AnyBook = {
  id: number;
  authorId: number;
  status?: string | null;
  title?: string | null;
  wordCount?: number | null;
  pageCount?: number | null;
  updatedAt?: string | Date | null;
  publishedAt?: string | Date | null;
};

type AnyEvaluation = {
  id: number;
  bookId: number;
  score?: string | number | null;
  updatedAt?: string | Date | null;
};

export function toDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function lastActivityAt(user: AnyUser) {
  return toDate(user.lastSeenAt) ?? toDate(user.lastSignedIn);
}

export function isOnlineNow(user: AnyUser, now = new Date()) {
  if (user.isActive === false || !user.lastSeenAt) return false;
  const lastSeen = toDate(user.lastSeenAt);
  if (!lastSeen) return false;
  return now.getTime() - lastSeen.getTime() <= ONLINE_WINDOW_MS;
}

export function isWeekend(now = new Date()) {
  const day = now.getDay();
  return day === 0 || day === 6;
}

export function hasAccessedToday(user: AnyUser, now = new Date()) {
  const activity = lastActivityAt(user);
  if (!activity) return false;
  return activity.toDateString() === now.toDateString();
}

export function isStudentOnBreak(user: AnyUser) {
  return STUDENTS_ON_BREAK && user.role === "student";
}

export function dailyAccessStatus(user: AnyUser, now = new Date()) {
  if (isStudentOnBreak(user)) {
    return {
      label: `${STUDENT_BREAK_LABEL} - uso livre`,
      ok: true,
      required: false,
      className: "bg-sky-100 text-sky-800",
    };
  }

  if (isWeekend(now)) {
    return {
      label: "Fim de semana",
      ok: true,
      required: false,
      className: "bg-slate-100 text-slate-700",
    };
  }

  if (hasAccessedToday(user, now)) {
    return {
      label: "Acessou hoje",
      ok: true,
      required: true,
      className: "bg-emerald-100 text-emerald-800",
    };
  }

  return {
    label: "Precisa acessar hoje",
    ok: false,
    required: true,
    className: "bg-amber-100 text-amber-800",
  };
}

export function formatLastAccess(value?: string | Date | null) {
  const date = toDate(value);
  if (!date) return "Nunca acessou";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatScore(score: number | null | undefined) {
  if (score === null || score === undefined || Number.isNaN(score)) return "-";
  return score.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function parseScore(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const score = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(score) ? score : null;
}

export function buildStudentInsights(
  students: AnyUser[],
  books: AnyBook[],
  evaluations: AnyEvaluation[],
  now = new Date()
) {
  const booksByStudent = new Map<number, AnyBook[]>();
  const evaluationsByBook = new Map<number, AnyEvaluation[]>();

  for (const book of books) {
    const current = booksByStudent.get(book.authorId) ?? [];
    current.push(book);
    booksByStudent.set(book.authorId, current);
  }

  for (const evaluation of evaluations) {
    const current = evaluationsByBook.get(evaluation.bookId) ?? [];
    current.push(evaluation);
    evaluationsByBook.set(evaluation.bookId, current);
  }

  return students.map((student) => {
    const studentBooks = booksByStudent.get(student.id) ?? [];
    const studentEvaluations = studentBooks.flatMap((book) => evaluationsByBook.get(book.id) ?? []);
    const scores = studentEvaluations.map((evaluation) => parseScore(evaluation.score)).filter((score): score is number => score !== null);
    const avgScore = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
    const lastEvaluation = studentEvaluations
      .slice()
      .sort((a, b) => (toDate(b.updatedAt)?.getTime() ?? 0) - (toDate(a.updatedAt)?.getTime() ?? 0))[0];
    const lastBook = studentBooks
      .slice()
      .sort((a, b) => (toDate(b.updatedAt)?.getTime() ?? 0) - (toDate(a.updatedAt)?.getTime() ?? 0))[0];
    const totalWords = studentBooks.reduce((sum, book) => sum + (book.wordCount ?? 0), 0);
    const totalPages = studentBooks.reduce((sum, book) => sum + (book.pageCount ?? 0), 0);
    const dailyAccess = dailyAccessStatus(student, now);

    return {
      student,
      books: studentBooks,
      evaluations: studentEvaluations,
      avgScore,
      lastScore: parseScore(lastEvaluation?.score),
      lastEvaluationAt: toDate(lastEvaluation?.updatedAt),
      lastBookAt: toDate(lastBook?.updatedAt),
      totalBooks: studentBooks.length,
      submittedBooks: studentBooks.filter((book) => ["submitted", "under_review", "approved"].includes(book.status ?? "")).length,
      publishedBooks: studentBooks.filter((book) => book.status === "published").length,
      totalWords,
      totalPages,
      online: isOnlineNow(student, now),
      accessedToday: hasAccessedToday(student, now),
      dailyAccess,
      lastActivity: lastActivityAt(student),
      needsAttention: (dailyAccess.required && !dailyAccess.ok) || (avgScore !== null && avgScore < 6),
    };
  });
}

export function buildClassInsights(studentInsights: ReturnType<typeof buildStudentInsights>) {
  const groups = new Map<string, ReturnType<typeof buildStudentInsights>>();

  for (const item of studentInsights) {
    const className = item.student.className?.trim() || "Sem turma";
    const schoolId = item.student.schoolId ?? 1;
    const key = `${schoolId}::${className}`;
    const current = groups.get(key) ?? [];
    current.push(item);
    groups.set(key, current);
  }

  return Array.from(groups.entries())
    .map(([key, items]) => {
      const scored = items.filter((item) => item.avgScore !== null);
      const avgScore = scored.length
        ? scored.reduce((sum, item) => sum + (item.avgScore ?? 0), 0) / scored.length
        : null;
      const firstStudent = items[0]?.student;
      const className = firstStudent?.className?.trim() || "Sem turma";

      return {
        key,
        schoolId: firstStudent?.schoolId ?? 1,
        className,
        students: items.length,
        online: items.filter((item) => item.online).length,
        accessedToday: items.filter((item) => item.accessedToday).length,
        needsAttention: items.filter((item) => item.needsAttention).length,
        avgScore,
        books: items.reduce((sum, item) => sum + item.totalBooks, 0),
        publishedBooks: items.reduce((sum, item) => sum + item.publishedBooks, 0),
        words: items.reduce((sum, item) => sum + item.totalWords, 0),
        pages: items.reduce((sum, item) => sum + item.totalPages, 0),
      };
    })
    .sort((a, b) => {
      if (a.schoolId !== b.schoolId) return Number(a.schoolId) - Number(b.schoolId);
      return a.className.localeCompare(b.className);
    });
}
