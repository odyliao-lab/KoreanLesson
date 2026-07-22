import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const learningProfiles = sqliteTable("learning_profiles", {
  email: text("email").primaryKey(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("student"),
  classCode: text("class_code"),
  payload: text("payload").notNull().default("{}"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const classes = sqliteTable("classes", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  ownerEmail: text("owner_email").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const classMembers = sqliteTable(
  "class_members",
  {
    classCode: text("class_code").notNull(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role").notNull().default("student"),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.classCode, table.email] })],
);

export const assignments = sqliteTable("assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  classCode: text("class_code").notNull(),
  title: text("title").notNull(),
  level: text("level").notNull(),
  day: integer("day").notNull(),
  dueDate: text("due_date").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const questionReports = sqliteTable("question_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  classCode: text("class_code"),
  reporterEmail: text("reporter_email").notNull(),
  reporterName: text("reporter_name").notNull(),
  level: text("level").notNull(),
  day: integer("day").notNull(),
  exerciseId: text("exercise_id").notNull(),
  kicker: text("kicker").notNull(),
  question: text("question").notNull(),
  submittedAnswer: text("submitted_answer").notNull(),
  expectedAnswer: text("expected_answer").notNull(),
  status: text("status").notNull().default("open"),
  resolutionNote: text("resolution_note"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
