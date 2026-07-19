const CACHE_NAME = "starlight-korean-v6";
const AUDIO_ASSETS = Object.entries({
  beginner: 20,
  intermediate: 15,
  advanced: 15,
}).flatMap(([level, days]) =>
  Array.from(
    { length: days },
    (_, index) => `/audio/${level}-day-${String(index + 1).padStart(2, "0")}.mp3`,
  ),
);
const CORE_ASSETS = [
  "/",
  "/privacy",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/guides/lumi-v1.webp",
  "/guides/haru-v1.webp",
  "/guides/byeol-v1.webp",
  "/guides/nuri-v1.webp",
  "/guides/on-v1.webp",
  ...AUDIO_ASSETS,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match("/")),
      ),
  );
});
