self.addEventListener("install", (event) => {
  console.log("Service worker installing...");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service worker activating...");
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Let the browser do its default thing
  // for non-GET requests.
  if (event.request.method !== "GET") return;

  // Basic pass-through fetch with a simple offline fallback strategy
  // For a production app, you might want to use Workbox here.
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) return cachedResponse;
      
      // If network fails and it's not in cache, we MUST return a valid Response
      // otherwise event.respondWith throws a TypeError.
      return new Response("Network error and not available offline.", {
        status: 503,
        statusText: "Service Unavailable"
      });
    })
  );
});
