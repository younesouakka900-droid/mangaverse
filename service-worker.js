// ════════════════════════════════════════════════════════
// MangaVerse — Service Worker
// يدعم: PWA Cache + Push Notifications + Offline
// ════════════════════════════════════════════════════════

const SW_VERSION  = "mv-v1.0";
const CACHE_NAME  = SW_VERSION + "-cache";
const ICON_URL    = "https://ahmnycfbfonmztxmwqdi.supabase.co/storage/v1/object/public/pdfs/uploads/icon-192.png";
const BADGE_URL   = "https://ahmnycfbfonmztxmwqdi.supabase.co/storage/v1/object/public/pdfs/uploads/icon-192.png";
const SITE_URL    = "https://mangaverse.top";

// الملفات التي تُخزَّن مؤقتاً للعمل بدون إنترنت
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
];

// ── تثبيت الـ Service Worker ──
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

// ── تفعيل وحذف الكاش القديم ──
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── استراتيجية الكاش: Network First → Cache Fallback ──
self.addEventListener("fetch", event => {
  // تجاهل طلبات غير GET أو روابط خارجية
  if(event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // خزّن نسخة من الاستجابة
        if(response && response.status === 200){
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        }
        return response;
      })
      .catch(() => {
        // لا إنترنت → ارجع للكاش
        return caches.match(event.request).then(cached => {
          if(cached) return cached;
          // صفحة 404 offline
          if(event.request.headers.get("accept")?.includes("text/html")){
            return caches.match("/index.html");
          }
        });
      })
  );
});

// ════════════════════════════════════════
// ── استقبال Push Notifications ──────────
// ════════════════════════════════════════
self.addEventListener("push", event => {
  let data = {};
  try{
    data = event.data?.json() || {};
  }catch(e){
    data = { title: "MangaVerse 🎨", body: event.data?.text() || "لديك إشعار جديد" };
  }

  const title   = data.title || "MangaVerse 🎨";
  const options = {
    body:    data.body    || "لديك إشعار جديد",
    icon:    data.icon    || ICON_URL,
    badge:   BADGE_URL,
    image:   data.image   || null,
    data:    { url: data.url || SITE_URL, workId: data.workId || null },
    dir:     "rtl",
    lang:    "ar",
    vibrate: [200, 100, 200],
    tag:     data.tag     || "mv-notif",
    renotify: true,
    actions: [
      { action: "open",    title: "📖 اقرأ الآن" },
      { action: "dismiss", title: "✕ إغلاق" }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── النقر على الإشعار ──
self.addEventListener("notificationclick", event => {
  event.notification.close();
  if(event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || SITE_URL;
  const workId    = event.notification.data?.workId;
  const openUrl   = workId ? `${SITE_URL}/#/work/${workId}` : targetUrl;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      // إذا كانت هناك نافذة مفتوحة → ركّز عليها
      for(const client of clientList){
        if(client.url.includes(SITE_URL) && "focus" in client){
          client.focus();
          client.postMessage({ type: "OPEN_WORK", workId });
          return;
        }
      }
      // افتح نافذة جديدة
      if(clients.openWindow) return clients.openWindow(openUrl);
    })
  );
});

// ── إلغاء الاشتراك ──
self.addEventListener("pushsubscriptionchange", event => {
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
  );
});

// ── رسائل من الصفحة الرئيسية ──
self.addEventListener("message", event => {
  if(event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
