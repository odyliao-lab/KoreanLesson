import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import {
  answersMatch,
  buildCheckpointExercises,
  buildLessonExercises,
} from "../app/learning-exercises.ts";

const root = new URL("../", import.meta.url);

test("keeps public learning and privacy routes product-specific", async () => {
  const [home, layout, privacy] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/privacy/page.tsx", root), "utf8"),
  ]);
  assert.match(layout, /별빛韓語研究所/);
  assert.match(home, /三個階段/);
  assert.match(home, /高級 · 正式出道/);
  assert.match(privacy, /隱私與資料說明/);
});

test("keeps curriculum, sync, accessibility and offline contracts intact", async () => {
  const [page, exercises, intermediate, advanced, schema, manifest, worker] =
    await Promise.all([
      readFile(new URL("app/page.tsx", root), "utf8"),
      readFile(new URL("app/learning-exercises.ts", root), "utf8"),
      readFile(new URL("app/intermediate-lessons.ts", root), "utf8"),
      readFile(new URL("app/advanced-lessons.ts", root), "utf8"),
      readFile(new URL("db/schema.ts", root), "utf8"),
      readFile(new URL("public/manifest.webmanifest", root), "utf8"),
      readFile(new URL("public/service-worker.js", root), "utf8"),
    ]);

  assert.equal((intermediate.match(/^\s{4}day:\s*\d+,/gm) ?? []).length, 15);
  assert.equal((advanced.match(/^\s{4}day:\s*\d+,/gm) ?? []).length, 15);
  assert.match(page, /starlight-korean-progress/);
  assert.match(page, /starlight-korean-study-sessions/);
  assert.match(page, /starlight-korean-detailed-mistakes/);
  assert.match(page, /starlight-korean-question-reports/);
  assert.match(page, /LEARNING SUPPORT/);
  assert.match(page, /家長／老師協助/);
  assert.match(page, /skip-link/);
  assert.match(page, /syncToCloud/);
  for (const kind of [
    "choice",
    "match",
    "listen",
    "order",
    "fill",
    "correction",
    "translation",
    "dictation",
  ]) {
    assert.match(exercises, new RegExp(`"${kind}"`));
  }
  assert.match(exercises, /buildCheckpointExercises/);
  assert.match(page, /playFixedAudio/);
  assert.match(schema, /learningProfiles/);
  assert.match(schema, /classMembers/);
  assert.equal(JSON.parse(manifest).display, "standalone");
  assert.match(worker, /CACHE_NAME/);
});

test("ships one fixed Korean lesson track per day and five original guide portraits", async () => {
  const [audioFiles, guideFiles] = await Promise.all([
    readdir(new URL("public/audio/", root)),
    readdir(new URL("public/guides/", root)),
  ]);
  assert.equal(audioFiles.filter((file) => file.endsWith(".mp3")).length, 50);
  assert.deepEqual(
    guideFiles.filter((file) => file.endsWith(".webp")).sort(),
    [
      "byeol-v1.webp",
      "haru-v1.webp",
      "lumi-v1.webp",
      "nuri-v1.webp",
      "on-v1.webp",
    ],
  );
});

test("builds eight daily exercises and ten cumulative checkpoint questions without fixed answer positions", () => {
  const sampleLesson = (day) => ({
    day,
    question: "哪一句正確？",
    options: ["정답이에요", "오답 하나", "오답 둘"],
    answer: "정답이에요",
    listenText: "저는 오늘 한국어를 공부해요.",
    sounds: [
      { char: "가", label: "학교에 가요", hint: "去學校" },
      { char: "먹다", label: "밥을 먹어요", hint: "吃飯" },
      { char: "보다", label: "영화를 봐요", hint: "看電影" },
      { char: "듣다", label: "음악을 들어요", hint: "聽音樂" },
    ],
  });
  const daily = buildLessonExercises(sampleLesson(1), "beginner");
  assert.equal(daily.length, 8);
  assert.deepEqual(
    daily.map((exercise) => exercise.kind),
    [
      "choice",
      "match",
      "listen",
      "order",
      "fill",
      "correction",
      "translation",
      "dictation",
    ],
  );
  for (const kind of ["match", "order", "translation"]) {
    const exercise = daily.find((item) => item.kind === kind);
    assert.notEqual(exercise.options[0], exercise.answer);
  }
  assert.ok(answersMatch("저는 오늘 한국어를 공부해요", daily[7].answer));
  assert.equal(
    buildCheckpointExercises(
      Array.from({ length: 5 }, (_, index) => sampleLesson(index + 1)),
      5,
      "beginner",
    ).length,
    10,
  );
});
