import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
  const [page, intermediate, advanced, schema, manifest, worker] =
    await Promise.all([
      readFile(new URL("app/page.tsx", root), "utf8"),
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
  assert.match(page, /skip-link/);
  assert.match(page, /syncToCloud/);
  assert.match(schema, /learningProfiles/);
  assert.match(schema, /classMembers/);
  assert.equal(JSON.parse(manifest).display, "standalone");
  assert.match(worker, /CACHE_NAME/);
});
