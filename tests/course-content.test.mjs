import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import {
  answersMatch,
  buildCheckpointExercises,
  buildLessonExercises,
} from "../app/learning-exercises.ts";

const root = new URL("../", import.meta.url);

function unwrap(node) {
  let current = node;
  while (
    ts.isAsExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function readLiteral(node) {
  const value = unwrap(node);
  if (
    ts.isStringLiteral(value) ||
    ts.isNoSubstitutionTemplateLiteral(value)
  ) {
    return value.text;
  }
  if (ts.isNumericLiteral(value)) return Number(value.text);
  if (ts.isArrayLiteralExpression(value)) {
    return value.elements.map(readLiteral);
  }
  if (ts.isObjectLiteralExpression(value)) {
    return Object.fromEntries(
      value.properties
        .filter(ts.isPropertyAssignment)
        .map((property) => {
          const name = property.name;
          const key =
            ts.isIdentifier(name) ||
            ts.isStringLiteral(name) ||
            ts.isNumericLiteral(name)
              ? name.text
              : name.getText();
          return [key, readLiteral(property.initializer)];
        }),
    );
  }
  throw new Error(`Unsupported curriculum literal: ${value.getText()}`);
}

async function loadLessonArray(path, variableName, scriptKind) {
  const sourceText = await readFile(new URL(path, root), "utf8");
  const source = ts.createSourceFile(
    path,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  let lessons;
  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === variableName &&
      node.initializer
    ) {
      lessons = readLiteral(node.initializer);
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(lessons, `Missing curriculum array ${variableName}`);
  return lessons;
}

test("audits all 50 custom questions and 400 generated exercises for clear answer contracts", async () => {
  const [beginner, intermediate, advanced] = await Promise.all([
    loadLessonArray("app/page.tsx", "lessons", ts.ScriptKind.TSX),
    loadLessonArray(
      "app/intermediate-lessons.ts",
      "intermediateLessons",
      ts.ScriptKind.TS,
    ),
    loadLessonArray(
      "app/advanced-lessons.ts",
      "advancedLessons",
      ts.ScriptKind.TS,
    ),
  ]);
  const levels = [
    ["beginner", beginner, 20],
    ["intermediate", intermediate, 15],
    ["advanced", advanced, 15],
  ];
  assert.equal(levels.reduce((sum, [, lessons]) => sum + lessons.length, 0), 50);

  for (const [level, lessons, expectedCount] of levels) {
    assert.equal(lessons.length, expectedCount);
    for (const lesson of lessons) {
      assert.ok(
        lesson.options.includes(lesson.answer),
        `${level} Day ${lesson.day}: custom answer must appear in options`,
      );
      assert.ok(lesson.question.trim());
      assert.ok(lesson.sounds.length >= 3);

      const exercises = buildLessonExercises(lesson, level);
      assert.equal(exercises.length, 8);
      for (const exercise of exercises) {
        assert.ok(
          exercise.question.trim(),
          `${level} Day ${lesson.day} ${exercise.kind}: missing prompt`,
        );
        assert.doesNotMatch(
          exercise.question,
          /請用韓文完整輸入：|最適合翻成哪一句|哪一組詞序最自然/,
          `${level} Day ${lesson.day} ${exercise.kind}: legacy ambiguous wording`,
        );
        if (exercise.interaction === "options") {
          assert.ok(
            exercise.options.includes(exercise.answer),
            `${level} Day ${lesson.day} ${exercise.kind}: answer missing from options`,
          );
        }
        if (exercise.kind === "fill") {
          assert.match(exercise.question, /字卡「.+」/);
          assert.match(exercise.question, /提示：.+。/);
        }
        if (exercise.kind === "translation") {
          assert.match(exercise.question, /字卡「.+」/);
          assert.equal(exercise.kicker, "提示選句");
        }
      }
    }
  }

  const beginnerDay3 = beginner[2];
  const beginnerDay3Fill = buildLessonExercises(
    beginnerDay3,
    "beginner",
  ).find((exercise) => exercise.kind === "fill");
  assert.equal(beginnerDay3Fill.answer, "ㄴ + ㅓ");
  assert.match(beginnerDay3Fill.question, /字卡「너」/);
  assert.match(beginnerDay3Fill.question, /韓文字母 \+ 韓文字母/);
  assert.ok(answersMatch("ㄴ+ㅓ", beginnerDay3Fill.answer));
  assert.match(beginner[16].question, /我做不到／沒有能力做/);
});

test("audits every five-day checkpoint as a ten-question cumulative review", async () => {
  const levels = [
    [
      "beginner",
      await loadLessonArray("app/page.tsx", "lessons", ts.ScriptKind.TSX),
    ],
    [
      "intermediate",
      await loadLessonArray(
        "app/intermediate-lessons.ts",
        "intermediateLessons",
        ts.ScriptKind.TS,
      ),
    ],
    [
      "advanced",
      await loadLessonArray(
        "app/advanced-lessons.ts",
        "advancedLessons",
        ts.ScriptKind.TS,
      ),
    ],
  ];
  for (const [level, lessons] of levels) {
    for (let day = 5; day <= lessons.length; day += 5) {
      const checkpoint = buildCheckpointExercises(lessons, day, level);
      assert.equal(checkpoint.length, 10);
      assert.deepEqual(
        [...new Set(checkpoint.map((exercise) => exercise.sourceDay))],
        [day - 4, day - 3, day - 2, day - 1, day],
      );
    }
  }
});
