import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  assignmentProgress,
  assignments,
  classMembers,
} from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

const validLevels = ["beginner", "intermediate", "advanced"];

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ error: "登入後才會回報作業完成狀態。" }, { status: 401 });
  }

  const body = (await request.json()) as {
    level?: string;
    day?: number;
    score?: number;
    totalQuestions?: number;
  };
  const level = validLevels.includes(body.level ?? "") ? body.level! : "";
  const day = Number(body.day);
  const totalQuestions = Math.max(1, Math.min(20, Number(body.totalQuestions) || 1));
  const score = Math.max(0, Math.min(100, Math.round(Number(body.score) || 0)));
  if (!level || !Number.isInteger(day) || day < 1 || day > (level === "beginner" ? 20 : 15)) {
    return Response.json({ error: "作業完成資料不正確。" }, { status: 400 });
  }

  const db = getDb();
  const memberships = await db
    .select({ classCode: classMembers.classCode })
    .from(classMembers)
    .where(
      and(
        eq(classMembers.email, user.email),
        eq(classMembers.role, "student"),
      ),
    );
  const classCodes = memberships.map((membership) => membership.classCode);
  if (!classCodes.length) return Response.json({ ok: true, updated: 0 });

  const matchingAssignments = await db
    .select()
    .from(assignments)
    .where(
      and(
        inArray(assignments.classCode, classCodes),
        eq(assignments.level, level),
        eq(assignments.day, day),
      ),
    );
  const now = new Date();
  for (const assignment of matchingAssignments) {
    const [existing] = await db
      .select()
      .from(assignmentProgress)
      .where(
        and(
          eq(assignmentProgress.assignmentId, assignment.id),
          eq(assignmentProgress.studentEmail, user.email),
        ),
      )
      .limit(1);
    await db
      .insert(assignmentProgress)
      .values({
        assignmentId: assignment.id,
        studentEmail: user.email,
        score,
        bestScore: Math.max(score, existing?.bestScore ?? 0),
        totalQuestions,
        attemptCount: (existing?.attemptCount ?? 0) + 1,
        completedAt: existing?.completedAt ?? now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [assignmentProgress.assignmentId, assignmentProgress.studentEmail],
        set: {
          score,
          bestScore: Math.max(score, existing?.bestScore ?? 0),
          totalQuestions,
          attemptCount: (existing?.attemptCount ?? 0) + 1,
          completedAt: existing?.completedAt ?? now,
          updatedAt: now,
        },
      });
  }
  return Response.json({ ok: true, updated: matchingAssignments.length });
}
