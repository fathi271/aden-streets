/* شوارع عدن — service worker: makes the game installable and loads faster.
   Pages: network first (always newest version), saved copy if offline.
   Songs, icons, three.js: saved copy first. */
const C = "aden-v1";
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  const page = r.mode === "navigate" || u.pathname.endsWith(".html") || u.pathname.endsWith("/");
  const asset = /\.(mp3|png|json)$/.test(u.pathname) || u.hostname === "cdnjs.cloudflare.com";
  if (u.origin !== location.origin && !asset) return;
  if (page) {
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(C).then(x => x.put(r, c)); return res; })
      .catch(() => caches.match(r).then(m => m || caches.match("./"))));
  } else if (asset) {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { if (res.ok || res.type === "opaque") { const c = res.clone(); caches.open(C).then(x => x.put(r, c)); } return res; })));
  }
});
