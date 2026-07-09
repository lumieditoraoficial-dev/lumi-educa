import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  AISuggestion,
  Book,
  Certificate,
  Evaluation,
  InsertAISuggestion,
  InsertBook,
  InsertCertificate,
  InsertEvaluation,
  InsertNotification,
  InsertPage,
  InsertPublication,
  InsertSchool,
  InsertUser,
  Notification,
  Page,
  Publication,
  RubricScore,
  School,
  User,
} from "../drizzle/schema";
import { buildBookMetricsFromPages } from "./_core/pageMetrics";
import { normalizeSchoolId } from "./_core/schools";

type Role = NonNullable<User["role"]>;

type LocalData = {
  users: User[];
  books: Book[];
  pages: Page[];
  publications: Publication[];
  evaluations: Evaluation[];
  rubricScores: RubricScore[];
  certificates: Certificate[];
  notifications: Notification[];
  aiSuggestions: AISuggestion[];
  schools: School[];
};

const DATA_DIR = process.env.LOCAL_DATA_DIR
  ? path.resolve(process.env.LOCAL_DATA_DIR)
  : path.resolve(process.cwd(), "data");
const DATA_FILE = process.env.LOCAL_DATA_FILE
  ? path.resolve(process.env.LOCAL_DATA_FILE)
  : path.join(DATA_DIR, "edu-smart-system.json");

const emptyData = (): LocalData => ({
  users: [],
  books: [],
  pages: [],
  publications: [],
  evaluations: [],
  rubricScores: [],
  certificates: [],
  notifications: [],
  aiSuggestions: [],
  schools: [],
});

const dateKeys = [
  "createdAt",
  "updatedAt",
  "lastSignedIn",
  "lastSeenAt",
  "publishedAt",
  "issuedAt",
  "aiCorrectedAt",
  "reviewedAt",
] as const;

function reviveDates<T extends Record<string, unknown>>(record: T): T {
  for (const key of dateKeys) {
    const value = record[key];
    if (typeof value === "string") {
      (record as Record<string, unknown>)[key] = new Date(value);
    }
  }
  return record;
}

function reviveData(data: LocalData): LocalData {
  return {
    users: data.users.map((item) => reviveDates(item)),
    books: data.books.map((item) => reviveDates(item)),
    pages: data.pages.map((item) => reviveDates(item)),
    publications: data.publications.map((item) => reviveDates(item)),
    evaluations: data.evaluations.map((item) => reviveDates(item)),
    rubricScores: data.rubricScores.map((item) => reviveDates(item)),
    certificates: data.certificates.map((item) => reviveDates(item)),
    notifications: data.notifications.map((item) => reviveDates(item)),
    aiSuggestions: data.aiSuggestions.map((item) => reviveDates(item)),
    schools: data.schools.map((item) => reviveDates(item)),
  };
}

async function readData(): Promise<LocalData> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return reviveData({ ...emptyData(), ...JSON.parse(raw) });
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      console.warn("[LocalStore] Resetting unreadable data file:", error);
    }
    const data = emptyData();
    await writeData(data);
    return data;
  }
}

async function writeData(data: LocalData) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmpFile = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmpFile, DATA_FILE);
}

async function mutateData<T>(mutator: (data: LocalData) => T | Promise<T>): Promise<T> {
  const data = await readData();
  const result = await mutator(data);
  await writeData(data);
  return result;
}

function nextId(records: Array<{ id: number }>) {
  return records.reduce((max, record) => Math.max(max, record.id), 0) + 1;
}

function countWords(content?: string | null) {
  return (content ?? "").trim().split(/\s+/).filter(Boolean).length;
}

function syncBookMetrics(data: LocalData, bookId: number) {
  const book = data.books.find((item) => item.id === bookId);
  if (!book) return;

  const bookPages = data.pages.filter((page) => page.bookId === bookId);
  const metrics = buildBookMetricsFromPages(bookPages);
  book.pageCount = metrics.pageCount;
  book.wordCount = metrics.wordCount;
  book.updatedAt = new Date();
}

function withSchoolDefault<T extends User>(user: T): T {
  return {
    ...user,
    schoolId: normalizeSchoolId(user.schoolId),
  };
}

function makeDefaultSchool(id: number): School {
  const now = new Date();
  return {
    id,
    name: id === 1 ? "Santissima Trindade" : "Nova escola",
    description: id === 1 ? "Unidade principal Santissima Trindade" : "Segunda unidade escolar",
    address: null,
    city: null,
    state: null,
    logoUrl: null,
    createdAt: now,
    updatedAt: now,
  };
}

function ensureLocalSchools(data: LocalData) {
  for (const schoolId of [1, 2]) {
    const existing = data.schools.find((school) => school.id === schoolId);
    if (!existing) {
      data.schools.push(makeDefaultSchool(schoolId));
    } else {
      if (!existing.name || existing.name === `Escola ${schoolId}`) {
        existing.name = schoolId === 1 ? "Santissima Trindade" : "Nova escola";
      }
      existing.description =
        existing.description ?? (schoolId === 1 ? "Unidade principal Santissima Trindade" : "Segunda unidade escolar");
      existing.address = existing.address ?? null;
      existing.city = existing.city ?? null;
      existing.state = existing.state ?? null;
      existing.logoUrl = existing.logoUrl ?? null;
      existing.createdAt = existing.createdAt ?? new Date();
      existing.updatedAt = existing.updatedAt ?? new Date();
    }
  }

  data.schools.sort((left, right) => left.id - right.id);
  return data.schools;
}

export const masterRoles: Role[] = ["student", "educator", "coordinator", "editor", "admin"];

const masterProfiles: Record<Role, { id: number; name: string; email: string }> = {
  student: { id: -10, name: "Aluno Mestre", email: "aluno@lumi.local" },
  educator: { id: -20, name: "Educador Mestre", email: "educador@lumi.local" },
  coordinator: { id: -30, name: "Coordenador Mestre", email: "coordenador@lumi.local" },
  editor: { id: -40, name: "Editor Mestre", email: "editor@lumi.local" },
  admin: { id: -50, name: "Administrador Mestre", email: "admin@lumi.local" },
};

export function getMasterOpenId(role: Role) {
  return `master_${role}`;
}

export function getMasterUser(role: Role): User {
  const profile = masterProfiles[role];
  const now = new Date();

  return {
    id: profile.id,
    openId: getMasterOpenId(role),
    name: profile.name,
    email: profile.email,
    avatarUrl: null,
    passwordHash: null,
    loginMethod: "master",
    role,
    schoolId: normalizeSchoolId(null),
    className: null,
    assignedEducatorId: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    lastSeenAt: now,
  };
}

export function getMasterUserByOpenId(openId: string | null | undefined): User | undefined {
  if (!openId?.startsWith("master_")) return undefined;

  const role = openId.replace("master_", "") as Role;
  return masterRoles.includes(role) ? getMasterUser(role) : undefined;
}

export async function localListSchools() {
  return mutateData((data) => ensureLocalSchools(data).map((school) => ({ ...school })));
}

export async function localUpdateSchool(schoolId: number, updates: Partial<InsertSchool>) {
  return mutateData((data) => {
    const targetId = normalizeSchoolId(schoolId);
    const school = ensureLocalSchools(data).find((item) => item.id === targetId);
    if (!school) return null;

    Object.assign(school, updates, { updatedAt: new Date() });
    return { ...school };
  });
}

export async function localListUsers() {
  const data = await readData();
  return data.users.map(withSchoolDefault);
}

export async function localGetUserByOpenId(openId: string) {
  const masterUser = getMasterUserByOpenId(openId);
  if (masterUser) return masterUser;

  const data = await readData();
  const user = data.users.find((item) => item.openId === openId);
  return user ? withSchoolDefault(user) : undefined;
}

export async function localGetUserByEmail(email: string) {
  const normalized = email.toLowerCase();
  const data = await readData();
  const user = data.users.find((item) => item.email?.toLowerCase() === normalized);
  return user ? withSchoolDefault(user) : undefined;
}

export async function localCreateUser(user: InsertUser) {
  return mutateData((data) => {
    const now = new Date();
    const record: User = {
      id: nextId(data.users),
      openId: user.openId ?? `local_${Date.now()}`,
      name: user.name ?? null,
      email: user.email ?? null,
      avatarUrl: user.avatarUrl ?? null,
      passwordHash: user.passwordHash ?? null,
      loginMethod: user.loginMethod ?? "email",
      role: user.role ?? "student",
      schoolId: normalizeSchoolId(user.schoolId),
      className: user.className ?? null,
      assignedEducatorId: user.assignedEducatorId ?? null,
      isActive: user.isActive ?? true,
      createdAt: user.createdAt ?? now,
      updatedAt: user.updatedAt ?? now,
      lastSignedIn: user.lastSignedIn ?? now,
      lastSeenAt: user.lastSeenAt ?? null,
    };

    data.users.push(record);
    return record;
  });
}

export async function localUpsertUser(user: InsertUser) {
  if (!user.openId || getMasterUserByOpenId(user.openId)) return;

  await mutateData((data) => {
    const existing = data.users.find((item) => item.openId === user.openId);
    const now = new Date();

    if (!existing) {
      data.users.push({
        id: nextId(data.users),
        openId: user.openId ?? `local_${Date.now()}`,
        name: user.name ?? null,
        email: user.email ?? null,
        avatarUrl: user.avatarUrl ?? null,
        passwordHash: user.passwordHash ?? null,
        loginMethod: user.loginMethod ?? "email",
        role: user.role ?? "student",
        schoolId: normalizeSchoolId(user.schoolId),
        className: user.className ?? null,
        assignedEducatorId: user.assignedEducatorId ?? null,
        isActive: user.isActive ?? true,
        createdAt: user.createdAt ?? now,
        updatedAt: user.updatedAt ?? now,
        lastSignedIn: user.lastSignedIn ?? now,
        lastSeenAt: user.lastSeenAt ?? null,
      });
      return;
    }

    Object.assign(existing, {
      name: user.name ?? existing.name,
      email: user.email ?? existing.email,
      avatarUrl: user.avatarUrl ?? existing.avatarUrl ?? null,
      passwordHash: user.passwordHash ?? existing.passwordHash,
      loginMethod: user.loginMethod ?? existing.loginMethod,
      role: user.role ?? existing.role,
      schoolId: user.schoolId === undefined ? normalizeSchoolId(existing.schoolId) : normalizeSchoolId(user.schoolId),
      className: user.className ?? existing.className ?? null,
      assignedEducatorId: user.assignedEducatorId ?? existing.assignedEducatorId ?? null,
      isActive: user.isActive ?? existing.isActive ?? true,
      lastSignedIn: user.lastSignedIn ?? existing.lastSignedIn,
      lastSeenAt: user.lastSeenAt ?? existing.lastSeenAt ?? null,
      updatedAt: now,
    });
  });
}

export async function localUpdateUser(userId: number, updates: Partial<InsertUser>) {
  return mutateData((data) => {
    const user = data.users.find((item) => item.id === userId);
    if (!user) return null;

    Object.assign(user, updates, { updatedAt: new Date() });
    return user;
  });
}

export async function localDeleteUser(userId: number) {
  return mutateData((data) => {
    data.users = data.users.filter((user) => user.id !== userId);
    const removedBookIds = data.books.filter((book) => book.authorId === userId).map((book) => book.id);
    data.books = data.books.filter((book) => book.authorId !== userId);
    data.pages = data.pages.filter((page) => !removedBookIds.includes(page.bookId));
    data.publications = data.publications.filter((publication) => !removedBookIds.includes(publication.bookId));
    data.evaluations = data.evaluations.filter((evaluation) => !removedBookIds.includes(evaluation.bookId));
    data.certificates = data.certificates.filter((certificate) => certificate.userId !== userId);
    data.notifications = data.notifications.filter((notification) => notification.userId !== userId);
    return { success: true };
  });
}

export async function localGetBooksByAuthor(authorId: number) {
  const data = await readData();
  return data.books.filter((book) => book.authorId === authorId);
}

export async function localGetAllBooks() {
  const data = await readData();
  return data.books;
}

export async function localGetBookById(bookId: number) {
  const data = await readData();
  return data.books.find((book) => book.id === bookId);
}

export async function localCreateBook(book: InsertBook) {
  return mutateData((data) => {
    const now = new Date();
    const record: Book = {
      id: nextId(data.books),
      authorId: book.authorId,
      title: book.title,
      subtitle: book.subtitle ?? null,
      description: book.description ?? null,
      category: book.category ?? null,
      series: book.series ?? null,
      status: book.status ?? "draft",
      coverImageUrl: book.coverImageUrl ?? null,
      wordCount: book.wordCount ?? 0,
      pageCount: book.pageCount ?? 0,
      createdAt: book.createdAt ?? now,
      updatedAt: book.updatedAt ?? now,
      publishedAt: book.publishedAt ?? null,
    };

    data.books.push(record);
    return record;
  });
}

export async function localUpdateBook(bookId: number, updates: Partial<InsertBook>) {
  return mutateData((data) => {
    const book = data.books.find((item) => item.id === bookId);
    if (!book) return null;

    Object.assign(book, updates, { updatedAt: new Date() });
    return book;
  });
}

export async function localDeleteBook(bookId: number) {
  return mutateData((data) => {
    const evaluationIds = new Set(data.evaluations.filter((evaluation) => evaluation.bookId === bookId).map((evaluation) => evaluation.id));
    data.books = data.books.filter((book) => book.id !== bookId);
    data.pages = data.pages.filter((page) => page.bookId !== bookId);
    data.publications = data.publications.filter((publication) => publication.bookId !== bookId);
    data.evaluations = data.evaluations.filter((evaluation) => evaluation.bookId !== bookId);
    data.rubricScores = data.rubricScores.filter((score) => !evaluationIds.has(score.evaluationId));
    data.certificates = data.certificates.filter((certificate) => certificate.bookId !== bookId);
    return { success: true };
  });
}

export async function localGetPageById(pageId: number) {
  const data = await readData();
  return data.pages.find((page) => page.id === pageId);
}

export async function localGetPagesByBook(bookId: number) {
  const data = await readData();
  return data.pages
    .filter((page) => page.bookId === bookId)
    .sort((a, b) => a.pageNumber - b.pageNumber);
}

export async function localCreatePage(page: InsertPage) {
  return mutateData((data) => {
    const now = new Date();
    const record: Page = {
      id: nextId(data.pages),
      bookId: page.bookId,
      pageNumber: page.pageNumber,
      title: page.title ?? null,
      content: page.content ?? "",
      originalContent: page.originalContent ?? null,
      aiCorrectedContent: page.aiCorrectedContent ?? null,
      aiCorrectionSummary: page.aiCorrectionSummary ?? null,
      aiCorrectedAt: page.aiCorrectedAt ?? null,
      reviewedAt: page.reviewedAt ?? null,
      reviewedBy: page.reviewedBy ?? null,
      wordCount: countWords(page.content),
      status: page.status ?? "draft",
      createdAt: page.createdAt ?? now,
      updatedAt: page.updatedAt ?? now,
    };

    data.pages.push(record);
    syncBookMetrics(data, page.bookId);
    return record;
  });
}

export async function localUpdatePage(pageId: number, updates: Partial<InsertPage>) {
  return mutateData((data) => {
    const page = data.pages.find((item) => item.id === pageId);
    if (!page) return null;

    Object.assign(page, updates, {
      wordCount: updates.content !== undefined ? countWords(updates.content) : page.wordCount,
      updatedAt: new Date(),
    });

    syncBookMetrics(data, page.bookId);
    return page;
  });
}

export async function localDeletePage(pageId: number) {
  return mutateData((data) => {
    const page = data.pages.find((item) => item.id === pageId);
    data.pages = data.pages.filter((item) => item.id !== pageId);
    if (page) syncBookMetrics(data, page.bookId);
    return { success: true };
  });
}

export async function localGetPublishedBooks() {
  const data = await readData();
  const publishedPublications = data.publications.filter((item) => item.status === "published");
  const publicationBookIds = new Set(publishedPublications.map((item) => item.bookId));
  const legacyPublishedBooks = data.books
    .filter((book) => book.status === "published" && !publicationBookIds.has(book.id))
    .map((book) => ({
      id: book.id,
      bookId: book.id,
      publishedAt: book.publishedAt ?? book.updatedAt,
      publishedBy: -50,
      libraryUrl: `/library/book/${book.id}`,
      status: "published" as const,
      book,
    }));

  return [
    ...publishedPublications.map((publication) => {
      const book = data.books.find((item) => item.id === publication.bookId);
      return {
        ...publication,
        book,
      };
    }),
    ...legacyPublishedBooks,
  ];
}

export async function localCreatePublication(publication: InsertPublication) {
  return mutateData((data) => {
    const now = new Date();
    const record: Publication = {
      id: nextId(data.publications),
      bookId: publication.bookId,
      publishedAt: publication.publishedAt ?? now,
      publishedBy: publication.publishedBy,
      libraryUrl: publication.libraryUrl ?? `/library/book/${publication.bookId}`,
      status: publication.status ?? "published",
    };

    data.publications.push(record);
    return record;
  });
}

export async function localCreateEvaluation(evaluation: InsertEvaluation) {
  return mutateData((data) => {
    const now = new Date();
    const record: Evaluation = {
      id: nextId(data.evaluations),
      bookId: evaluation.bookId,
      evaluatorId: evaluation.evaluatorId,
      status: evaluation.status ?? "completed",
      score: evaluation.score ?? null,
      feedback: evaluation.feedback ?? null,
      createdAt: evaluation.createdAt ?? now,
      updatedAt: evaluation.updatedAt ?? now,
    };

    data.evaluations.push(record);
    return record;
  });
}

export async function localGetEvaluationsByBook(bookId: number) {
  const data = await readData();
  return data.evaluations.filter((evaluation) => evaluation.bookId === bookId);
}

export async function localListEvaluations() {
  const data = await readData();
  return data.evaluations;
}

export async function localCreateRubricScore(score: Omit<RubricScore, "id" | "createdAt">) {
  return mutateData((data) => {
    const record: RubricScore = {
      id: nextId(data.rubricScores),
      evaluationId: score.evaluationId,
      rubricId: score.rubricId ?? null,
      criterionName: score.criterionName,
      score: score.score ?? null,
      comment: score.comment ?? null,
      createdAt: new Date(),
    };

    data.rubricScores.push(record);
    return record;
  });
}

export async function localGetRubricScoresByEvaluation(evaluationId: number) {
  const data = await readData();
  return data.rubricScores.filter((score) => score.evaluationId === evaluationId);
}

export async function localCreateNotification(notification: InsertNotification) {
  return mutateData((data) => {
    const record: Notification = {
      id: nextId(data.notifications),
      userId: notification.userId,
      type: notification.type ?? "info",
      title: notification.title,
      message: notification.message ?? null,
      relatedEntityId: notification.relatedEntityId ?? null,
      relatedEntityType: notification.relatedEntityType ?? null,
      isRead: notification.isRead ?? false,
      createdAt: notification.createdAt ?? new Date(),
    };

    data.notifications.push(record);
    return record;
  });
}

export async function localGetNotificationsByUser(userId: number, unreadOnly = false, limit = 50) {
  const data = await readData();
  return data.notifications
    .filter((notification) => notification.userId === userId)
    .filter((notification) => !unreadOnly || !notification.isRead)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

export async function localMarkNotificationAsRead(notificationId: number, userId: number) {
  return mutateData((data) => {
    const notification = data.notifications.find((item) => item.id === notificationId);
    if (!notification || notification.userId !== userId) return null;
    notification.isRead = true;
    return notification;
  });
}

export async function localMarkAllNotificationsAsRead(userId: number) {
  return mutateData((data) => {
    data.notifications
      .filter((notification) => notification.userId === userId)
      .forEach((notification) => {
        notification.isRead = true;
      });
    return { success: true };
  });
}

export async function localDeleteNotification(notificationId: number, userId: number) {
  return mutateData((data) => {
    const notification = data.notifications.find((item) => item.id === notificationId);
    if (!notification || notification.userId !== userId) return null;
    data.notifications = data.notifications.filter((item) => item.id !== notificationId);
    return { success: true };
  });
}

export async function localCreateCertificate(certificate: InsertCertificate) {
  return mutateData((data) => {
    const record: Certificate = {
      id: nextId(data.certificates),
      userId: certificate.userId,
      bookId: certificate.bookId ?? null,
      certificateNumber: certificate.certificateNumber ?? `CERT-${Date.now()}`,
      hoursSpent: certificate.hoursSpent ?? null,
      qrCodeUrl: certificate.qrCodeUrl ?? null,
      signatureUrl: certificate.signatureUrl ?? null,
      issuedAt: certificate.issuedAt ?? new Date(),
    };

    data.certificates.push(record);
    return record;
  });
}

export async function localGetCertificatesByUser(userId: number) {
  const data = await readData();
  return data.certificates.filter((certificate) => certificate.userId === userId);
}

export async function localGetCertificateById(certificateId: number) {
  const data = await readData();
  return data.certificates.find((certificate) => certificate.id === certificateId);
}

export async function localListCertificates() {
  const data = await readData();
  return data.certificates;
}

export async function localCreateAiSuggestion(suggestion: InsertAISuggestion) {
  return mutateData((data) => {
    const record: AISuggestion = {
      id: nextId(data.aiSuggestions),
      pageId: suggestion.pageId,
      type: suggestion.type,
      originalText: suggestion.originalText ?? null,
      suggestedText: suggestion.suggestedText ?? null,
      explanation: suggestion.explanation ?? null,
      status: suggestion.status ?? "pending",
      createdAt: suggestion.createdAt ?? new Date(),
    };

    data.aiSuggestions.push(record);
    return record;
  });
}
