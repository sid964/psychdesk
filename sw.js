/* Online-only PWA coordination. Never cache HTML or mixed-version app assets.
   No study notes, Drive access tokens, or account data are handled here. */
const CACHE='psychdesk-spatial-current-v79';
self.addEventListener('install',()=>{self.skipWaiting();});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('psychdesk-')).map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 // No cached navigation: never paint a historical homepage before updating it.
 if(request.mode==='navigate'
    ||/\/(?:index\.html|app\.js|home-diorama\.css|spatial-desk\.(?:css|js))$/.test(url.pathname)
    ||/\/autopilot\/studio\.js$/.test(url.pathname)){
  event.respondWith(fetch(request,{cache:'no-store'}));
 }
});
