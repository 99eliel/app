// ConectaSaúde: cache SOMENTE da interface pública (não de dados/contas Firebase).
// Incrementar VERSION quando os arquivos da aplicação mudarem.
const VERSION="2.1.0";
const CACHE="cs-static-"+VERSION;
const SHELL=[
 "./","./index.html","./docs/index.html","./docs/app.js","./docs/styles.css",
 "./docs/modules.js","./docs/mobile-core.js","./docs/pwa-controller.js",
 "./docs/android-test.js","./docs/version.json","./docs/manifest.webmanifest",
 "./docs/icon.svg","./docs/icon-192.png","./docs/icon-512.png"
];
self.addEventListener("install",event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await Promise.allSettled(SHELL.map(file=>cache.add(new Request(new URL(file,self.registration.scope),{cache:"reload"}))));
  await self.skipWaiting();
 })());
});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{
  const existing=await caches.keys();
  await Promise.all(existing.filter(key=>key.startsWith("cs-static-")&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});
self.addEventListener("message",event=>{
 if(event.data?.type==="SKIP_WAITING")event.waitUntil(self.skipWaiting());
});
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET"||req.cache==="only-if-cached"&&req.mode!=="same-origin")return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin)return;
 if(url.search||url.pathname.includes("/__/")||url.pathname.includes("/api/"))return;
 const navigation=req.mode==="navigate";
 const staticFile=/\.(?:html|js|css|svg|png|webmanifest|json)$/.test(url.pathname);
 if(!navigation&&!staticFile)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const fresh=await fetch(req);
   if(fresh.ok&&fresh.type==="basic"&&fresh.headers.get("Cache-Control")!=="no-store"){
    try{await cache.put(req,fresh.clone());}catch{}
   }
   return fresh;
  }catch(err){
   const cached=await cache.match(req,{ignoreSearch:true});
   if(cached)return cached;
   if(navigation){
    const fallback=await cache.match(new URL("./index.html",self.registration.scope).href)
      ||await cache.match(new URL("./",self.registration.scope).href);
    if(fallback)return fallback;
    return new Response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ConectaSaúde · Offline</title><body style="font-family:system-ui;padding:2rem"><h1>Sem conexão</h1><p>Conecte-se à internet para carregar o ConectaSaúde.</p></body></html>',{status:503,headers:{"Content-Type":"text/html;charset=utf-8"}});
   }
   throw err;
  }
 })());
});
