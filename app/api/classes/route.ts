import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  assignments,
  classMembers,
  classes,
  learningProfiles,
} from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

function createCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    alphabet.charAt(Math.floor(Math.random() * alphabet.length)),
  ).join("");
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ error: "請先登入。" }, { status: 401 });
  }

  const db = getDb();
  const owned = await db
    .select()
    .from(classes)
    .where(eq(classes.ownerEmail, user.email));
  const memberships = await db
    .select()
    .from(classMembers)
    .where(eq(classMembers.email, user.email));
  const rosters = await Promise.all(
    owned.map(async (course) => {
      const members = await db
        .select()
        .from(classMembers)
        .where(eq(classMembers.classCode, course.code));
      const summaries = await Promise.all(
        members.map(async (member) => {
          const [profile] = await db
            .select()
            .from(learningProfiles)
            .where(eq(learningProfiles.email, member.email))
            .limit(1);
          let progress = 0;
          let minutes = 0;
          let mistakes = 0;
          let lastActive: string | null = null;
          if (profile) {
            try {
              const data = JSON.parse(profile.payload) as {
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
                    resolved?: boolean;
                    updatedAt?: string;
                  }
                >;
              };
              const completed =
                (data.completedDays?.length ?? 0) +
                (data.completedIntermediateDays?.length ?? 0) +
                (data.completedAdvancedDays?.length ?? 0);
              progress = Math.round((completed / 50) * 100);
              minutes = (data.studySessions ?? []).reduce(
                (total, session) => total + (session.minutes ?? 0),
                0,
              );
              mistakes = Object.values(data.mistakes ?? {}).reduce(
                (total, count) => total + count,
                0,
              );
              lastActive = data.studySessions?.[0]?.completedAt ?? null;
              const completedKeys = [
                ...(data.completedDays ?? []).map((day) => `beginner-${day}`),
                ...(data.completedIntermediateDays ?? []).map(
                  (day) => `intermediate-${day}`,
                ),
                ...(data.completedAdvancedDays ?? []).map(
                  (day) => `advanced-${day}`,
                ),
              ];
              const recentMistakes = Object.values(
                data.detailedMistakes ?? {},
              )
                .filter((item) => !item.resolved)
                .sort((a, b) =>
                  (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
                )
                .slice(0, 5);
              return {
                ...member,
                progress,
                minutes,
                mistakes,
                lastActive,
                completedKeys,
                recentMistakes,
              };
            } catch {
              // A damaged payload should not block the rest of the roster.
            }
          }
          return {
            ...member,
            progress,
            minutes,
            mistakes,
            lastActive,
            completedKeys: [] as string[],
            recentMistakes: [] as unknown[],
          };
        }),
      );
      const courseAssignments = await db
        .select()
        .from(assignments)
        .where(eq(assignments.classCode, course.code));
      const assignmentResults = courseAssignments.map((assignment) => {
        const students = summaries.filter((member) => member.role === "student");
        const completionKey = `${assignment.level}-${assignment.day}`;
        return {
          ...assignment,
          completedCount: students.filter((member) =>
            member.completedKeys.includes(completionKey),
          ).length,
          totalStudents: students.length,
        };
      });
      return { ...course, members: summaries, assignments: assignmentResults };
    }),
  );
  const memberAssignments = await Promise.all(
    memberships.map((membership) =>
      db
        .select()
        .from(assignments)
        .where(eq(assignments.classCode, membership.classCode)),
    ),
  );

  return Response.json({
    owned: rosters,
    memberships,
    assignments: memberAssignments.flat(),
  });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ error: "請先登入。" }, { status: 401 });
  }

  const body = (await request.json()) as {
    action?: "create" | "join" | "assign";
    name?: string;
    code?: string;
    role?: "student" | "parent";
    level?: "beginner" | "intermediate" | "advanced";
    day?: number;
    dueDate?: string;
    title?: string;
  };
  const db = getDb();
  const now = new Date();

  if (body.action === "create") {
    const name = body.name?.trim().slice(0, 40);
    if (!name)
      return Response.json({ error: "請輸入班級名稱。" }, { status: 400 });
    const code = createCode();
    await db.batch([
      db.insert(classes).values({
        code,
        name,
        ownerEmail: user.email,
        createdAt: now,
      }),
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
    const [course] = await db
      .select()
      .from(classes)
      .where(eq(classes.code, code))
      .limit(1);
    if (!course)
      return Response.json({ error: "找不到這個班級代碼。" }, { status: 404 });

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

  if (body.action === "assign") {
    const code = body.code?.trim().toUpperCase() ?? "";
    const [course] = await db
      .select()
      .from(classes)
      .where(
        and(eq(classes.code, code), eq(classes.ownerEmail, user.email)),
      )
      .limit(1);
    if (!course)
      return Response.json({ error: "只有班級教師可以指派課程。" }, { status: 403 });
    const level = ["beginner", "intermediate", "advanced"].includes(
      body.level ?? "",
    )
      ? body.level!
      : "beginner";
    const maxDay = level === "beginner" ? 20 : 15;
    const day = Math.max(1, Math.min(maxDay, Number(body.day) || 1));
    const dueDate = body.dueDate?.slice(0, 10) ?? "";
    if (!dueDate)
      return Response.json({ error: "請選擇截止日期。" }, { status: 400 });
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

  return Response.json({ error: "不支援的操作。" }, { status: 400 });
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "請先登入。" }, { status: 401 });
  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.toUpperCase() ?? "";
  const db = getDb();
  await db
    .delete(classMembers)
    .where(
      and(
        eq(classMembers.classCode, code),
        eq(classMembers.email, user.email),
      ),
    );
  return Response.json({ ok: true });
}
