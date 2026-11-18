/* شوارع عدن — service worker: makes the game installable and loads fast.
   Game page: opens instantly from the saved copy; any update is fetched quietly in the background
   and shows on the next open (a new ?v= link always downloads the newest version).
   Small redirect page: network first. Songs, icons: saved copy first. */
const C = "aden-v2";
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
function save(r, res) { if (res && res.ok) { const c = res.clone(); caches.open(C).then(x => x.put(r, c)); } return res; }
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  const p = u.pathname;
  const small = p.endsWith("/") || /\/index\.html$/.test(p);
  const page = r.mode === "navigate" || p.endsWith(".html");
  const asset = /\.(mp3|png|json)$/.test(p);
  if (page && small) {
    e.respondWith(fetch(r).then(res => save(r, res)).catch(() => caches.match(r).then(m => m || caches.match("./"))));
  } else if (page) {
    e.respondWith(caches.match(r).then(m => {
      const net = fetch(r).then(res => save(r, res));
      if (m) { e.waitUntil(net.catch(() => {})); return m; }
      return net;
    }));
  } else if (asset) {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => save(r, res))));
  }
});
