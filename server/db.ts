import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import {
  InsertBook,
  InsertCertificate,
  InsertEvaluation,
  InsertNotification,
  InsertPage,
  InsertPublication,
  InsertUser,
  books,
  certificates,
  evaluations,
  notifications,
  pages,
  publications,
  rubricScores,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { normalizeSchoolId } from "./_core/schools";
import { countWords } from "./_core/textReview";
import {
  localCreateBook,
  localCreateCertificate,
  localCreateEvaluation,
  localCreateNotification,
  localDeleteNotification,
  localCreatePage,
  localCreatePublication,
  localCreateRubricScore,
  localCreateUser,
  localDeletePage,
  localDeleteUser,
  getMasterUserByOpenId,
  localGetAllBooks,
  localGetBookById,
  localGetBooksByAuthor,
  localGetCertificateById,
  localGetCertificatesByUser,
  localGetEvaluationsByBook,
  localGetNotificationsByUser,
  localGetPageById,
  localGetPagesByBook,
  localGetPublishedBooks,
  localGetRubricScoresByEvaluation,
  localGetUserByEmail,
  localGetUserByOpenId,
  localListUsers,
  localListEvaluations,
  localListCertificates,
  localDeleteBook,
  localMarkAllNotificationsAsRead,
  localMarkNotificationAsRead,
  localUpdateBook,
  localUpdatePage,
  localUpdateUser,
  localUpsertUser,
} from "./localStore";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;
let _dbUnavailable = false;

function createPoolConfig(connectionString: string): PoolConfig {
  const databaseUrl = new URL(connectionString);
  const shouldUseSsl =
    databaseUrl.searchParams.has("sslmode") ||
    databaseUrl.hostname.includes("supabase") ||
    databaseUrl.hostname.includes("pooler");

  if (shouldUseSsl) {
    databaseUrl.searchParams.delete("sslmode");
    databaseUrl.searchParams.delete("uselibpqcompat");
  }

  return {
    connectionString: databaseUrl.toString(),
    max: 10,
    ...(shouldUseSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

export function isLocalStoreMode() {
  return !process.env.DATABASE_URL || _dbUnavailable;
}

export async function checkDatabaseHealth() {
  const db = await getDb();

  if (!db) {
    return {
      ok: true,
      mode: "local-json" as const,
    };
  }

  if (_pool) {
    await _pool.query("select 1");
  } else {
    await db.execute(sql`select 1`);
  }

  return {
    ok: true,
    mode: "postgresql" as const,
  };
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (_dbUnavailable || !process.env.DATABASE_URL) return null;

  if (!_db) {
    try {
      _pool = new Pool(createPoolConfig(process.env.DATABASE_URL));
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect, using local JSON store:", error);
      _dbUnavailable = true;
      _db = null;
    }
  }

  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const masterUser = getMasterUserByOpenId(user.openId);
  if (masterUser) return;

  const db = await getDb();
  if (!db) {
    await localUpsertUser(user);
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "avatarUrl", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.lastSeenAt !== undefined) {
      values.lastSeenAt = user.lastSeenAt;
      updateSet.lastSeenAt = user.lastSeenAt;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (user.schoolId !== undefined) {
      values.schoolId = normalizeSchoolId(user.schoolId);
      updateSet.schoolId = normalizeSchoolId(user.schoolId);
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const masterUser = getMasterUserByOpenId(openId);
  if (masterUser) return masterUser;

  const db = await getDb();
  if (!db) return localGetUserByOpenId(openId);

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return localGetUserByEmail(email);

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function createUser(user: InsertUser) {
  const db = await getDb();
  if (!db) return localCreateUser(user);

  const [result] = await db.insert(users).values(user).returning();
  return result;
}

export async function listUsers() {
  const db = await getDb();
  if (!db) return localListUsers();

  return db.select().from(users);
}

export async function updateUserById(userId: number, updates: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) return localUpdateUser(userId, updates);

  const [result] = await db
    .update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return result || null;
}

export async function deleteUserById(userId: number) {
  const db = await getDb();
  if (!db) return localDeleteUser(userId);

  return db.delete(users).where(eq(users.id, userId));
}

// Books
export async function getBooksByAuthor(authorId: number) {
  const db = await getDb();
  if (!db) return localGetBooksByAuthor(authorId);

  return db.select().from(books).where(eq(books.authorId, authorId));
}

export async function getAllBooks() {
  const db = await getDb();
  if (!db) return localGetAllBooks();

  return db.select().from(books);
}

export async function getBookById(bookId: number) {
  const db = await getDb();
  if (!db) return localGetBookById(bookId);

  const result = await db.select().from(books).where(eq(books.id, bookId)).limit(1);
  return result[0];
}

export async function createBook(book: InsertBook) {
  const db = await getDb();
  if (!db) return localCreateBook(book);

  const [result] = await db.insert(books).values(book).returning();
  return result;
}

export async function updateBook(bookId: number, updates: Partial<InsertBook>) {
  const db = await getDb();
  if (!db) return localUpdateBook(bookId, updates);

  const [result] = await db
    .update(books)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(books.id, bookId))
    .returning();
  return result;
}

// Pages
export async function getPageById(pageId: number) {
  const db = await getDb();
  if (!db) return localGetPageById(pageId);

  const result = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
  return result[0];
}

export async function getPagesByBook(bookId: number) {
  const db = await getDb();
  if (!db) return localGetPagesByBook(bookId);

  return db.select().from(pages).where(eq(pages.bookId, bookId)).orderBy(pages.pageNumber);
}

export async function createPage(page: InsertPage) {
  const db = await getDb();
  if (!db) return localCreatePage(page);

  const [result] = await db
    .insert(pages)
    .values({ ...page, wordCount: page.wordCount ?? countWords(page.content) })
    .returning();
  return result;
}

export async function updatePage(pageId: number, updates: Partial<InsertPage>) {
  const db = await getDb();
  if (!db) return localUpdatePage(pageId, updates);

  const [result] = await db
    .update(pages)
    .set({
      ...updates,
      ...(updates.content !== undefined ? { wordCount: countWords(updates.content) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(pages.id, pageId))
    .returning();
  return result;
}

export async function deletePage(pageId: number) {
  const db = await getDb();
  if (!db) return localDeletePage(pageId);

  return db.delete(pages).where(eq(pages.id, pageId));
}

export async function deleteBookById(bookId: number) {
  const db = await getDb();
  if (!db) return localDeleteBook(bookId);

  const bookEvaluations = await getEvaluationsByBook(bookId);
  for (const evaluation of bookEvaluations) {
    await db.delete(rubricScores).where(eq(rubricScores.evaluationId, evaluation.id));
  }

  await db.delete(publications).where(eq(publications.bookId, bookId));
  await db.delete(certificates).where(eq(certificates.bookId, bookId));
  await db.delete(evaluations).where(eq(evaluations.bookId, bookId));
  await db.delete(pages).where(eq(pages.bookId, bookId));
  await db.delete(books).where(eq(books.id, bookId));

  return { success: true };
}

// Evaluations
export async function getEvaluationsByBook(bookId: number) {
  const db = await getDb();
  if (!db) return localGetEvaluationsByBook(bookId);

  return db.select().from(evaluations).where(eq(evaluations.bookId, bookId));
}

export async function listEvaluations() {
  const db = await getDb();
  if (!db) return localListEvaluations();

  return db.select().from(evaluations);
}

export async function createEvaluation(evaluation: InsertEvaluation) {
  const db = await getDb();
  if (!db) return localCreateEvaluation(evaluation);

  const [result] = await db.insert(evaluations).values(evaluation).returning();
  return result;
}

export async function createRubricScore(score: {
  evaluationId: number;
  rubricId: number | null;
  criterionName: string;
  score: number | null;
  comment: string | null;
}) {
  const db = await getDb();
  if (!db) return localCreateRubricScore(score);

  const [result] = await db.insert(rubricScores).values(score).returning();
  return result;
}

export async function getRubricScoresByEvaluation(evaluationId: number) {
  const db = await getDb();
  if (!db) return localGetRubricScoresByEvaluation(evaluationId);

  return db.select().from(rubricScores).where(eq(rubricScores.evaluationId, evaluationId));
}

// Notifications
export async function createNotification(notification: InsertNotification) {
  const db = await getDb();
  if (!db) return localCreateNotification(notification);

  const [result] = await db.insert(notifications).values(notification).returning();
  return result;
}

export async function getNotificationsByUser(userId: number, unreadOnly = false, limit = 50) {
  const db = await getDb();
  if (!db) return localGetNotificationsByUser(userId, unreadOnly, limit);

  if (unreadOnly) {
    return db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationAsRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) return localMarkNotificationAsRead(notificationId, userId);

  const [notification] = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, notificationId))
    .limit(1);

  if (!notification || notification.userId !== userId) return null;

  const [updated] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, notificationId))
    .returning();

  return updated;
}

export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) return localMarkAllNotificationsAsRead(userId);

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return { success: true };
}

export async function deleteNotificationForUser(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) return localDeleteNotification(notificationId, userId);

  const [notification] = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, notificationId))
    .limit(1);

  if (!notification || notification.userId !== userId) return null;

  await db.delete(notifications).where(eq(notifications.id, notificationId));
  return { success: true };
}

// Certificates
export async function createCertificate(certificate: InsertCertificate) {
  const db = await getDb();
  if (!db) return localCreateCertificate(certificate);

  const [result] = await db.insert(certificates).values(certificate).returning();
  return result;
}

export async function getCertificatesByUser(userId: number) {
  const db = await getDb();
  if (!db) return localGetCertificatesByUser(userId);

  return db.select().from(certificates).where(eq(certificates.userId, userId));
}

export async function getCertificateById(certificateId: number) {
  const db = await getDb();
  if (!db) return localGetCertificateById(certificateId);

  const result = await db.select().from(certificates).where(eq(certificates.id, certificateId)).limit(1);
  return result[0];
}

export async function listCertificates() {
  const db = await getDb();
  if (!db) return localListCertificates();

  return db.select().from(certificates);
}

// Publications
export async function getPublishedBooks() {
  const db = await getDb();
  if (!db) return localGetPublishedBooks();

  const pubs = await db.select().from(publications).where(eq(publications.status, "published"));
  const booksData = await Promise.all(
    pubs.map(async (pub) => {
      const book = await getBookById(pub.bookId);
      return { ...pub, book };
    })
  );
  return booksData;
}

export async function createPublication(publication: InsertPublication) {
  const db = await getDb();
  if (!db) return localCreatePublication(publication);

  const [result] = await db.insert(publications).values(publication).returning();
  return result;
}
