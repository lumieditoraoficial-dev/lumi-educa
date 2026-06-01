import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["student", "educator", "coordinator", "editor", "admin"]);
export const classMemberRoleEnum = pgEnum("class_member_role", ["student", "educator"]);
export const bookStatusEnum = pgEnum("book_status", [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "published",
  "rejected",
]);
export const pageStatusEnum = pgEnum("page_status", ["draft", "submitted", "approved", "published"]);
export const evaluationStatusEnum = pgEnum("evaluation_status", ["pending", "completed"]);
export const publicationStatusEnum = pgEnum("publication_status", ["published", "archived"]);
export const notificationTypeEnum = pgEnum("notification_type", ["info", "warning", "success", "error"]);
export const aiSuggestionTypeEnum = pgEnum("ai_suggestion_type", ["grammar", "style", "creativity", "structure"]);
export const aiSuggestionStatusEnum = pgEnum("ai_suggestion_status", ["pending", "accepted", "rejected"]);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    openId: varchar("openId", { length: 64 }).unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }).unique(),
    avatarUrl: text("avatarUrl"),
    passwordHash: varchar("passwordHash", { length: 255 }),
    loginMethod: varchar("loginMethod", { length: 64 }).default("email"),
    role: userRoleEnum("role").default("student").notNull(),
    schoolId: integer("schoolId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  (table) => ({
    schoolIdIdx: index("schoolIdIdx").on(table.schoolId),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  address: varchar("address", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type School = typeof schools.$inferSelect;
export type InsertSchool = typeof schools.$inferInsert;

export const classes = pgTable(
  "classes",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("schoolId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    series: varchar("series", { length: 50 }),
    coordinatorId: integer("coordinatorId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    schoolIdIdx: index("classSchoolIdIdx").on(table.schoolId),
    coordinatorIdIdx: index("classCoordinatorIdIdx").on(table.coordinatorId),
  })
);

export type Class = typeof classes.$inferSelect;
export type InsertClass = typeof classes.$inferInsert;

export const classMembers = pgTable(
  "classMembers",
  {
    id: serial("id").primaryKey(),
    classId: integer("classId").notNull(),
    userId: integer("userId").notNull(),
    role: classMemberRoleEnum("role").notNull(),
    joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  },
  (table) => ({
    classIdIdx: index("cmClassIdIdx").on(table.classId),
    userIdIdx: index("cmUserIdIdx").on(table.userId),
  })
);

export type ClassMember = typeof classMembers.$inferSelect;
export type InsertClassMember = typeof classMembers.$inferInsert;

export const books = pgTable(
  "books",
  {
    id: serial("id").primaryKey(),
    authorId: integer("authorId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    subtitle: varchar("subtitle", { length: 255 }),
    description: text("description"),
    category: varchar("category", { length: 100 }),
    series: varchar("series", { length: 100 }),
    status: bookStatusEnum("status").default("draft").notNull(),
    coverImageUrl: varchar("coverImageUrl", { length: 500 }),
    wordCount: integer("wordCount").default(0),
    pageCount: integer("pageCount").default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    publishedAt: timestamp("publishedAt"),
  },
  (table) => ({
    authorIdIdx: index("bookAuthorIdIdx").on(table.authorId),
    statusIdx: index("bookStatusIdx").on(table.status),
  })
);

export type Book = typeof books.$inferSelect;
export type InsertBook = typeof books.$inferInsert;

export const pages = pgTable(
  "pages",
  {
    id: serial("id").primaryKey(),
    bookId: integer("bookId").notNull(),
    pageNumber: integer("pageNumber").notNull(),
    title: varchar("title", { length: 255 }),
    content: text("content"),
    wordCount: integer("wordCount").default(0),
    status: pageStatusEnum("status").default("draft").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    bookIdIdx: index("pageBookIdIdx").on(table.bookId),
    pageNumberIdx: index("pageNumberIdx").on(table.pageNumber),
  })
);

export type Page = typeof pages.$inferSelect;
export type InsertPage = typeof pages.$inferInsert;

export const pageVersions = pgTable(
  "pageVersions",
  {
    id: serial("id").primaryKey(),
    pageId: integer("pageId").notNull(),
    versionNumber: integer("versionNumber").notNull(),
    content: text("content"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdBy: integer("createdBy"),
  },
  (table) => ({
    pageIdIdx: index("pvPageIdIdx").on(table.pageId),
  })
);

export type PageVersion = typeof pageVersions.$inferSelect;
export type InsertPageVersion = typeof pageVersions.$inferInsert;

export const evaluations = pgTable(
  "evaluations",
  {
    id: serial("id").primaryKey(),
    bookId: integer("bookId").notNull(),
    evaluatorId: integer("evaluatorId").notNull(),
    status: evaluationStatusEnum("status").default("pending").notNull(),
    score: numeric("score", { precision: 3, scale: 1 }),
    feedback: text("feedback"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    bookIdIdx: index("evalBookIdIdx").on(table.bookId),
    evaluatorIdIdx: index("evalEvaluatorIdIdx").on(table.evaluatorId),
  })
);

export type Evaluation = typeof evaluations.$inferSelect;
export type InsertEvaluation = typeof evaluations.$inferInsert;

export const rubrics = pgTable(
  "rubrics",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    criteria: jsonb("criteria"),
    schoolId: integer("schoolId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    schoolIdIdx: index("rubricSchoolIdIdx").on(table.schoolId),
  })
);

export type Rubric = typeof rubrics.$inferSelect;
export type InsertRubric = typeof rubrics.$inferInsert;

export const rubricScores = pgTable(
  "rubricScores",
  {
    id: serial("id").primaryKey(),
    evaluationId: integer("evaluationId").notNull(),
    rubricId: integer("rubricId"),
    criterionName: varchar("criterionName", { length: 255 }).notNull(),
    score: integer("score"),
    comment: text("comment"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    evaluationIdIdx: index("rsEvaluationIdIdx").on(table.evaluationId),
  })
);

export type RubricScore = typeof rubricScores.$inferSelect;
export type InsertRubricScore = typeof rubricScores.$inferInsert;

export const publications = pgTable(
  "publications",
  {
    id: serial("id").primaryKey(),
    bookId: integer("bookId").notNull().unique(),
    publishedAt: timestamp("publishedAt").defaultNow().notNull(),
    publishedBy: integer("publishedBy").notNull(),
    libraryUrl: varchar("libraryUrl", { length: 500 }),
    status: publicationStatusEnum("status").default("published").notNull(),
  },
  (table) => ({
    bookIdIdx: index("pubBookIdIdx").on(table.bookId),
  })
);

export type Publication = typeof publications.$inferSelect;
export type InsertPublication = typeof publications.$inferInsert;

export const certificates = pgTable(
  "certificates",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    bookId: integer("bookId"),
    certificateNumber: varchar("certificateNumber", { length: 100 }).unique(),
    hoursSpent: numeric("hoursSpent", { precision: 5, scale: 2 }),
    qrCodeUrl: varchar("qrCodeUrl", { length: 500 }),
    signatureUrl: varchar("signatureUrl", { length: 500 }),
    issuedAt: timestamp("issuedAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("certUserIdIdx").on(table.userId),
    bookIdIdx: index("certBookIdIdx").on(table.bookId),
  })
);

export type Certificate = typeof certificates.$inferSelect;
export type InsertCertificate = typeof certificates.$inferInsert;

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    type: notificationTypeEnum("type").default("info").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message"),
    relatedEntityId: integer("relatedEntityId"),
    relatedEntityType: varchar("relatedEntityType", { length: 50 }),
    isRead: boolean("isRead").default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("notifUserIdIdx").on(table.userId),
    isReadIdx: index("notifIsReadIdx").on(table.isRead),
  })
);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export const aiSuggestions = pgTable(
  "aiSuggestions",
  {
    id: serial("id").primaryKey(),
    pageId: integer("pageId").notNull(),
    type: aiSuggestionTypeEnum("type").notNull(),
    originalText: text("originalText"),
    suggestedText: text("suggestedText"),
    explanation: text("explanation"),
    status: aiSuggestionStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    pageIdIdx: index("aiSugPageIdIdx").on(table.pageId),
  })
);

export type AISuggestion = typeof aiSuggestions.$inferSelect;
export type InsertAISuggestion = typeof aiSuggestions.$inferInsert;
