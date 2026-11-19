/* شوارع عدن — service worker: the game opens fast and keeps working on a weak network (falls back to the last saved version, never a browser error page) */
const C = "aden-v2";
const OFF = '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>شوارع عدن</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1e2229;color:#eef2f6;font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;text-align:center}main{max-width:340px;padding:24px}h1{color:#ff7a1a;font-size:30px;margin:0 0 14px}p{line-height:1.9;margin:8px 0;color:#c8d0d9}button{margin-top:16px;font:inherit;font-size:18px;font-weight:700;background:#ff7a1a;color:#1a1a1a;border:0;border-radius:14px;padding:12px 30px}small{display:block;margin-top:14px;opacity:.65}</style></head><body><main><h1>شوارع عدن</h1><p>ما قدرنا نوصل للعبة الحين. يمكن الشبكة ضعيفة أو مزود الإنترنت ما يفتح الموقع.</p><p>جرّب تغيّر بين الواي فاي وبيانات الجوال، أو شغّل VPN.</p><button onclick="location.reload()">حاول مرة ثانية</button><small id="t"></small></main><script>var n=10;setInterval(function(){n--;document.getElementById("t").textContent="بنحاول تلقائياً بعد "+n+" ثواني";if(n<=0)location.reload()},1000)</script></body></html>';
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
const vOf = u => +(new URL(u).searchParams.get("v") || 0);
const offline = () => new Response(OFF, { headers: { "Content-Type": "text/html; charset=utf-8" } });
function save(r, res) {
  if (res && res.ok && res.type === "basic") {
    const c = res.clone(), p = new URL(r.url).pathname;
    caches.open(C).then(x => x.put(r, c).then(() => x.keys()).then(ks => Promise.all(ks.filter(k => k.url !== r.url && new URL(k.url).pathname === p).map(k => x.delete(k))))).catch(() => {});
  }
  return res;
}
function newest(r, anyGame) {
  return caches.open(C).then(x => x.keys().then(ks => {
    const p = new URL(r.url).pathname;
    let list = ks.filter(k => new URL(k.url).pathname === p);
    if (!list.length && anyGame) list = ks.filter(k => { const q = new URL(k.url).pathname; return q.endsWith(".html") && !/\/index\.html$/.test(q); });
    if (!list.length) return null;
    list.sort((a, b) => vOf(a.url) - vOf(b.url));
    return x.match(list[list.length - 1]);
  })).catch(() => null);
}
const net = (r, n = 2) => fetch(r).catch(err => n > 1 ? new Promise(ok => setTimeout(ok, 1500)).then(() => net(r, n - 1)) : Promise.reject(err));
function netOrSaved(r, wait, anyGame) {
  return new Promise(ok => {
    let done = false;
    const give = res => { if (!done) { done = true; ok(res); } };
    const t = setTimeout(() => newest(r, anyGame).then(m => { if (m) give(m); }), wait);
    net(r).then(res => { if (res.status >= 500) throw new Error("server " + res.status); clearTimeout(t); give(save(r, res)); })
      .catch(() => { clearTimeout(t); newest(r, anyGame).then(m => give(m || offline())); });
  });
}
function refresh(r, m) {
  const h = {}, tag = m.headers.get("ETag"), mod = m.headers.get("Last-Modified");
  if (tag) h["If-None-Match"] = tag; else if (mod) h["If-Modified-Since"] = mod;
  return fetch(r.url, { headers: h, credentials: "same-origin" }).then(res => { if (res.status === 200) save(r, res); }).catch(() => {});
}
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  const p = u.pathname, small = p.endsWith("/") || /\/index\.html$/.test(p), page = r.mode === "navigate" || p.endsWith(".html"), asset = /\.(mp3|png|json)$/.test(p);
  if (page && small) e.respondWith(netOrSaved(r, 6000, false));
  else if (page) e.respondWith(caches.match(r).then(m => { if (m) { e.waitUntil(refresh(r, m)); return m; } return netOrSaved(r, 12000, true); }).catch(() => offline()));
  else if (asset) e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => save(r, res))));
});
