// Çevrimdışı açılış: sayfanın kendisini (HTML, ikon, yazı tipi) önbelleğe alır.
// Kayıtlara dokunmaz; kayıtlar localStorage'da, burası ayrı bir depo (Cache Storage).
const CACHE = "antrenman-defteri-kabuk-v1";
const SHELL = ["./", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];
const WAIT_MS = 3000;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith("antrenman-defteri-kabuk-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Kendi dosyalarımız: önce ağ (yenileyince son sürüm gelsin), ağ yoksa ya da 3 sn'de cevap vermezse önbellek.
async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, {ignoreSearch: true});
  const net = fetch(req, {cache: "no-cache"}).then(res => { if (res.ok) cache.put(req, res.clone()); return res; });
  if (!hit) return net;
  net.catch(() => {});
  return Promise.race([net, new Promise(r => setTimeout(() => r(hit), WAIT_MS))]).catch(() => hit);
}
// Yazı tipleri değişmez: önce önbellek.
async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) e.respondWith(networkFirst(req));
  else if (FONT_HOSTS.includes(url.hostname)) e.respondWith(cacheFirst(req));
});
