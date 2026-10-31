// ConectaSaúde PWA: cache exclusivo da interface, nunca de respostas do Firebase.
const CACHE="cs-static-v20261031-1";
self.addEventListener("install",event=>{event.waitUntil(self.skipWaiting());});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith("cs-static-")&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET"||new URL(req.url).origin!==self.location.origin)return;
 const url=new URL(req.url);
 if(url.pathname.includes("/api/")||url.pathname.includes("/__/"))return;
 const navigation=req.mode==="navigate";
 const staticFile=/\.(?:js|css|html|svg|png|webmanifest|json)$/.test(url.pathname);
 if(!navigation&&!staticFile)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const response=await fetch(req);
   if(response.ok&&response.type==="basic")void cache.put(req,response.clone());
   return response;
  }catch(err){
   const saved=await cache.match(req);
   if(saved)return saved;
   if(navigation){
    const fallback=await cache.match(new URL("./",self.registration.scope).href)
      ||await cache.match(new URL("./index.html",self.registration.scope).href);
    if(fallback)return fallback;
    return new Response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>ConectaSaúde</title><body><h1>Conexão indisponível</h1><p>Conecte-se à internet para usar os serviços.</p></body></html>',{status:503,headers:{"Content-Type":"text/html;charset=utf-8"}});
   }
   throw err;
  }
 })());
});
