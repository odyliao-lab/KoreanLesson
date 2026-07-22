import { and, eq, inArray, or } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  assignmentProgress,
  assignments,
  classMembers,
  classes,
  learningProfiles,
  parentStudentLinks,
  questionReports,
} from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

type LearningPayload = {
  completedDays?: unknown[];
  completedIntermediateDays?: unknown[];
  completedAdvancedDays?: unknown[];
  studySessions?: { minutes?: number; completedAt?: string }[];
  mistakes?: Record<string, number>;
  detailedMistakes?: Record<
    string,
    {
      key?: string;
      level?: string;
      day?: number;
      exerciseId?: string;
      kicker?: string;
      question?: string;
      submittedAnswer?: string;
      correctAnswer?: string;
      attempts?: number;
      hintLevel?: number;
      resolved?: boolean;
      updatedAt?: string;
    }
  >;
};

function createCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    alphabet.charAt(Math.floor(Math.random() * alphabet.length)),
  ).join("");
}

async function createUniqueCode(db: ReturnType<typeof getDb>) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = createCode();
    const [existing] = await db
      .select({ code: classes.code })
      .from(classes)
      .where(eq(classes.code, code))
      .limit(1);
    if (!existing) return code;
  }
  throw new Error("Unable to generate a unique class code.");
}

function summarizePayload(payload: string) {
  const fallback = {
    progress: 0,
    minutes: 0,
    mistakes: 0,
    lastActive: null as string | null,
    completedKeys: [] as string[],
    recentMistakes: [] as Array<Record<string, unknown>>,
  };
  try {
    const data = JSON.parse(payload) as LearningPayload;
    const completedKeys = [
      ...(data.completedDays ?? []).map((day) => `beginner-${day}`),
      ...(data.completedIntermediateDays ?? []).map(
        (day) => `intermediate-${day}`,
      ),
      ...(data.completedAdvancedDays ?? []).map((day) => `advanced-${day}`),
    ];
    return {
      progress: Math.round((completedKeys.length / 50) * 100),
      minutes: (data.studySessions ?? []).reduce(
        (total, session) => total + (session.minutes ?? 0),
        0,
      ),
      mistakes: Object.values(data.mistakes ?? {}).reduce(
        (total, count) => total + count,
        0,
      ),
      lastActive: data.studySessions?.[0]?.completedAt ?? null,
      completedKeys,
      recentMistakes: Object.values(data.detailedMistakes ?? {})
        .filter((item) => !item.resolved)
        .sort((a, b) =>
          (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
        )
        .slice(0, 5),
    };
  } catch {
    return fallback;
  }
}

async function summarizeMember(
  db: ReturnType<typeof getDb>,
  member: typeof classMembers.$inferSelect,
) {
  const [profile] = await db
    .select()
    .from(learningProfiles)
    .where(eq(learningProfiles.email, member.email))
    .limit(1);
  return {
    ...member,
    ...summarizePayload(profile?.payload ?? "{}"),
  };
}

function resultView(
  result: typeof assignmentProgress.$inferSelect,
  dueDate: string,
  displayName?: string,
) {
  return {
    ...result,
    displayName,
    redoCount: Math.max(0, result.attemptCount - 1),
    late: result.completedAt.toISOString().slice(0, 10) > dueDate,
  };
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "請先登入。" }, { status: 401 });

  const db = getDb();
  const [owned, memberships] = await Promise.all([
    db.select().from(classes).where(eq(classes.ownerEmail, user.email)),
    db
      .select()
      .from(classMembers)
      .where(eq(classMembers.email, user.email)),
  ]);

  const rosters = await Promise.all(
    owned.map(async (course) => {
      const [members, courseAssignments, links] = await Promise.all([
        db
          .select()
          .from(classMembers)
          .where(eq(classMembers.classCode, course.code)),
        db
          .select()
          .from(assignments)
          .where(eq(assignments.classCode, course.code)),
        db
          .select()
          .from(parentStudentLinks)
          .where(eq(parentStudentLinks.classCode, course.code)),
      ]);
      const summaries = await Promise.all(
        members.map((member) => summarizeMember(db, member)),
      );
      const assignmentIds = courseAssignments.map((assignment) => assignment.id);
      const results = assignmentIds.length
        ? await db
            .select()
            .from(assignmentProgress)
            .where(inArray(assignmentProgress.assignmentId, assignmentIds))
        : [];
      const assignmentResults = courseAssignments.map((assignment) => {
        const assignmentRows = results
          .filter((result) => result.assignmentId === assignment.id)
          .map((result) =>
            resultView(
              result,
              assignment.dueDate,
              summaries.find((member) => member.email === result.studentEmail)
                ?.displayName,
            ),
          );
        const students = summaries.filter((member) => member.role === "student");
        return {
          ...assignment,
          completedCount: assignmentRows.length,
          totalStudents: students.length,
          averageScore: assignmentRows.length
            ? Math.round(
                assignmentRows.reduce((sum, row) => sum + row.bestScore, 0) /
                  assignmentRows.length,
              )
            : null,
          lateCount: assignmentRows.filter((row) => row.late).length,
          overdueCount:
            new Date().toISOString().slice(0, 10) > assignment.dueDate
              ? Math.max(0, students.length - assignmentRows.length)
              : 0,
          results: assignmentRows,
        };
      });
      return {
        ...course,
        members: summaries,
        assignments: assignmentResults,
        parentLinks: links,
      };
    }),
  );

  const memberAssignments = await Promise.all(
    memberships
      .filter((membership) => membership.role === "student")
      .map(async (membership) => {
      const rows = await db
        .select()
        .from(assignments)
        .where(eq(assignments.classCode, membership.classCode));
      if (!rows.length) return [];
      const progressRows = await db
        .select()
        .from(assignmentProgress)
        .where(
          and(
            inArray(
              assignmentProgress.assignmentId,
              rows.map((row) => row.id),
            ),
            eq(assignmentProgress.studentEmail, user.email),
          ),
        );
      return rows.map((assignment) => {
        const result = progressRows.find(
          (item) => item.assignmentId === assignment.id,
        );
        return {
          ...assignment,
          result: result ? resultView(result, assignment.dueDate) : null,
        };
      });
      }),
  );

  const parentMemberships = memberships.filter((item) => item.role === "parent");
  const linkedStudents = (
    await Promise.all(
      parentMemberships.map(async (membership) => {
        const links = await db
          .select()
          .from(parentStudentLinks)
          .where(
            and(
              eq(parentStudentLinks.classCode, membership.classCode),
              eq(parentStudentLinks.parentEmail, user.email),
            ),
          );
        return Promise.all(
          links.map(async (link) => {
            const [member] = await db
              .select()
              .from(classMembers)
              .where(
                and(
                  eq(classMembers.classCode, link.classCode),
                  eq(classMembers.email, link.studentEmail),
                ),
              )
              .limit(1);
            if (!member) return null;
            return {
              classCode: link.classCode,
              ...(await summarizeMember(db, member)),
            };
          }),
        );
      }),
    )
  )
    .flat()
    .filter(Boolean);

  return Response.json({
    owned: rosters,
    memberships,
    assignments: memberAssignments.flat(),
    linkedStudents,
  });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "請先登入。" }, { status: 401 });
  const body = (await request.json()) as {
    action?: "create" | "join" | "assign" | "regenerate-code" | "link-parent";
    name?: string;
    code?: string;
    role?: "student" | "parent";
    level?: "beginner" | "intermediate" | "advanced";
    day?: number;
    dueDate?: string;
    title?: string;
    parentEmail?: string;
    studentEmail?: string;
  };
  const db = getDb();
  const now = new Date();

  if (body.action === "create") {
    const name = body.name?.trim().slice(0, 40);
    if (!name) return Response.json({ error: "請輸入班級名稱。" }, { status: 400 });
    const code = await createUniqueCode(db);
    await db.batch([
      db.insert(classes).values({ code, name, ownerEmail: user.email, createdAt: now }),
      db.insert(classMembers).values({
        classCode: code,
        email: user.email,
        displayName: user.displayName,
        role: "teacher",
        joinedAt: now,
      }),
    ]);
    return Response.json({ ok: true, code }, { status: 201 });
  }

  if (body.action === "join") {
    const code = body.code?.trim().toUpperCase().slice(0, 12) ?? "";
    const [course] = await db.select().from(classes).where(eq(classes.code, code)).limit(1);
    if (!course) return Response.json({ error: "找不到這個班級代碼。" }, { status: 404 });
    if (course.ownerEmail === user.email) {
      return Response.json({ error: "班級建立者不能改成學生或家長身分。" }, { status: 400 });
    }
    await db
      .insert(classMembers)
      .values({
        classCode: code,
        email: user.email,
        displayName: user.displayName,
        role: body.role === "parent" ? "parent" : "student",
        joinedAt: now,
      })
      .onConflictDoUpdate({
        target: [classMembers.classCode, classMembers.email],
        set: {
          displayName: user.displayName,
          role: body.role === "parent" ? "parent" : "student",
          joinedAt: now,
        },
      });
    return Response.json({ ok: true, code });
  }

  const code = body.code?.trim().toUpperCase() ?? "";
  const [course] = await db
    .select()
    .from(classes)
    .where(and(eq(classes.code, code), eq(classes.ownerEmail, user.email)))
    .limit(1);
  if (!course) return Response.json({ error: "只有班級教師可以執行這項操作。" }, { status: 403 });

  if (body.action === "assign") {
    const level = ["beginner", "intermediate", "advanced"].includes(body.level ?? "")
      ? body.level!
      : "beginner";
    const day = Math.max(1, Math.min(level === "beginner" ? 20 : 15, Number(body.day) || 1));
    const dueDate = body.dueDate?.slice(0, 10) ?? "";
    if (!dueDate) return Response.json({ error: "請選擇截止日期。" }, { status: 400 });
    await db.insert(assignments).values({
      classCode: code,
      title: body.title?.trim().slice(0, 80) || `${level} Day ${day}`,
      level,
      day,
      dueDate,
      createdBy: user.email,
      createdAt: now,
    });
    return Response.json({ ok: true }, { status: 201 });
  }

  if (body.action === "regenerate-code") {
    const nextCode = await createUniqueCode(db);
    await db.batch([
      db.update(classes).set({ code: nextCode }).where(eq(classes.code, code)),
      db.update(classMembers).set({ classCode: nextCode }).where(eq(classMembers.classCode, code)),
      db.update(assignments).set({ classCode: nextCode }).where(eq(assignments.classCode, code)),
      db.update(parentStudentLinks).set({ classCode: nextCode }).where(eq(parentStudentLinks.classCode, code)),
      db.update(questionReports).set({ classCode: nextCode }).where(eq(questionReports.classCode, code)),
      db.update(learningProfiles).set({ classCode: nextCode }).where(eq(learningProfiles.classCode, code)),
    ]);
    return Response.json({ ok: true, code: nextCode });
  }

  if (body.action === "link-parent") {
    const parentEmail = body.parentEmail?.trim().toLowerCase() ?? "";
    const studentEmail = body.studentEmail?.trim().toLowerCase() ?? "";
    const members = await db
      .select()
      .from(classMembers)
      .where(eq(classMembers.classCode, code));
    if (
      !members.some((member) => member.email === parentEmail && member.role === "parent") ||
      !members.some((member) => member.email === studentEmail && member.role === "student")
    ) {
      return Response.json({ error: "請選擇同班的家長與學生。" }, { status: 400 });
    }
    await db
      .insert(parentStudentLinks)
      .values({ classCode: code, parentEmail, studentEmail, createdAt: now })
      .onConflictDoNothing();
    return Response.json({ ok: true }, { status: 201 });
  }

  return Response.json({ error: "不支援的操作。" }, { status: 400 });
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "請先登入。" }, { status: 401 });
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") ?? "leave";
  const code = url.searchParams.get("code")?.toUpperCase() ?? "";
  const db = getDb();

  if (resource === "leave") {
    const [course] = await db.select().from(classes).where(eq(classes.code, code)).limit(1);
    if (course?.ownerEmail === user.email) {
      return Response.json({ error: "班級建立者請使用刪除班級。" }, { status: 400 });
    }
    const courseAssignments = await db
      .select({ id: assignments.id })
      .from(assignments)
      .where(eq(assignments.classCode, code));
    await db.batch([
      db.delete(classMembers).where(and(eq(classMembers.classCode, code), eq(classMembers.email, user.email))),
      db.delete(parentStudentLinks).where(
        and(
          eq(parentStudentLinks.classCode, code),
          or(
            eq(parentStudentLinks.parentEmail, user.email),
            eq(parentStudentLinks.studentEmail, user.email),
          ),
        ),
      ),
      db.update(learningProfiles).set({ classCode: null }).where(
        and(
          eq(learningProfiles.email, user.email),
          eq(learningProfiles.classCode, code),
        ),
      ),
      ...(courseAssignments.length
        ? [
            db.delete(assignmentProgress).where(
              and(
                inArray(assignmentProgress.assignmentId, courseAssignments.map((item) => item.id)),
                eq(assignmentProgress.studentEmail, user.email),
              ),
            ),
          ]
        : []),
    ]);
    return Response.json({ ok: true });
  }

  const [course] = await db
    .select()
    .from(classes)
    .where(and(eq(classes.code, code), eq(classes.ownerEmail, user.email)))
    .limit(1);
  if (!course) return Response.json({ error: "只有班級教師可以刪除資料。" }, { status: 403 });

  if (resource === "member") {
    const email = url.searchParams.get("email")?.trim().toLowerCase() ?? "";
    if (!email || email === user.email) {
      return Response.json({ error: "不能移除班級建立者。" }, { status: 400 });
    }
    const courseAssignments = await db
      .select({ id: assignments.id })
      .from(assignments)
      .where(eq(assignments.classCode, code));
    await db.batch([
      db.delete(classMembers).where(and(eq(classMembers.classCode, code), eq(classMembers.email, email))),
      db.delete(parentStudentLinks).where(
        and(
          eq(parentStudentLinks.classCode, code),
          or(eq(parentStudentLinks.parentEmail, email), eq(parentStudentLinks.studentEmail, email)),
        ),
      ),
      db.update(learningProfiles).set({ classCode: null }).where(
        and(
          eq(learningProfiles.email, email),
          eq(learningProfiles.classCode, code),
        ),
      ),
      ...(courseAssignments.length
        ? [
            db.delete(assignmentProgress).where(
              and(
                inArray(assignmentProgress.assignmentId, courseAssignments.map((item) => item.id)),
                eq(assignmentProgress.studentEmail, email),
              ),
            ),
          ]
        : []),
    ]);
    return Response.json({ ok: true });
  }

  if (resource === "assignment") {
    const id = Number(url.searchParams.get("id"));
    const [assignment] = await db
      .select()
      .from(assignments)
      .where(and(eq(assignments.id, id), eq(assignments.classCode, code)))
      .limit(1);
    if (!assignment) return Response.json({ error: "找不到作業。" }, { status: 404 });
    await db.batch([
      db.delete(assignmentProgress).where(eq(assignmentProgress.assignmentId, id)),
      db.delete(assignments).where(eq(assignments.id, id)),
    ]);
    return Response.json({ ok: true });
  }

  if (resource === "class") {
    const courseAssignments = await db
      .select({ id: assignments.id })
      .from(assignments)
      .where(eq(assignments.classCode, code));
    await db.batch([
      ...(courseAssignments.length
        ? [db.delete(assignmentProgress).where(inArray(assignmentProgress.assignmentId, courseAssignments.map((item) => item.id)))]
        : []),
      db.delete(assignments).where(eq(assignments.classCode, code)),
      db.delete(questionReports).where(eq(questionReports.classCode, code)),
      db.delete(parentStudentLinks).where(eq(parentStudentLinks.classCode, code)),
      db.delete(classMembers).where(eq(classMembers.classCode, code)),
      db.update(learningProfiles).set({ classCode: null }).where(eq(learningProfiles.classCode, code)),
      db.delete(classes).where(eq(classes.code, code)),
    ]);
    return Response.json({ ok: true });
  }

  return Response.json({ error: "不支援的刪除操作。" }, { status: 400 });
}
