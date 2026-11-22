const CACHE='psychdesk-library-reference-v106-psychopathology';const FILES=['./psychopathology-9e.html','./psychopathology-assets/extra-diagrams.js','./biological-psychology-14e.html','./desktop-bookshelf.css','./fast-pdf-reader.js','./bio-book-index.js','./book-suggestions.js','./book-suggestions.config.js','./book-reference.css','./book-catalog.js','./book-reader.js','./book-reader.css','./study-clarity.css','./world/index.html','./world/world.css','./world/world.js','./world/world-ui.js','./world/world-bridge.js','./world/world-bridge.css','./world/landscape.js','./world/places.js','./world/life.js','./lidar-scan.js','./lidar-scan.css','./home-diorama.css','./motion-lively.css','./study-calm.css','./motion-runtime.js','./focus-sober.css','./autopilot/imports.js','./autopilot/preparation.js','./autopilot/phase2.css','./autopilot/studio.js','./autopilot/studio.css','./autopilot/garden.css','./autopilot/garden.js','./autopilot/worker.js','./automation/data/curated-concepts.json','./tour.js','./tour.css','./study-studio.js','./syllabus-data.js','./preparation.css','./workspace-refine.css','./motion.js','./motion.css','./','./index.html','./style.css','./studio-v4.css','./app.js','./cloud.js','./materials.js','./theme.js','./library.css','./amoled.css','./sticky-notes.css','./sticky-notes.js','./study-extras.js','./study-extras.css','./study-boards.js','./phase3-knowledge.js','./phase3-knowledge.css','./phase4-garden.js','./phase4-garden.css','./phase5-chapters.js','./phase5-chapters.css','./phase6-next-step.js','./phase6-next-step.css','./phase7-weak-concepts.js','./phase7-weak-concepts.css','./phase8-reflection.js','./phase8-reflection.css','./phase-release.css','./garden-refresh.css','./design-system.css','./design-accessibility.js','./study-boards.css','./pdf-reader.js','./reader-studio.css','./study-session.js','./pdf-reader.css','./psychology-data.js','./psychology-expanded-data.js','./psychology-knowledge.js','./psychology-knowledge.css','./psychology-imports.js','./psychology-imports.css','./psychology-online.js','./psychology-online.css','./note-history.js','./psychopathology-course-data.js','./psychopathology-graph.js','./psychopathology-graph.css','./psychology-connections.js','./psychology-academic.js','./study-connections.css','./reference-manager.js','./audit-fixes.css','./planner-refine.css','./ink-notes.css','./ink-notes.js','./quick-note.js','./drive-indicator.js','./drive-persistence.js','./quick-note.css','./setup-status.js','./setup-status.css','./firebase-config.js','./firebase-sync.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
// Fetch new release assets rather than stale HTTP-cache precache entries.
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(path=>new Request(path,{cache:'reload'})))));
 self.skipWaiting();
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith('psychdesk-')&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 // Cache the large study companion only when opened, not during ordinary app startup.
 if(['/biological-psychology-assets/part-','/psychopathology-assets/part-'].some(prefix=>new URL(request.url).pathname.includes(prefix))){
  event.respondWith(fetch(request).then(response=>{
   if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}
   return response;
  }).catch(async()=> (await caches.open(CACHE)).match(request) || Response.error()));
  return;
 }
 if(request.mode==='navigate'){
  event.respondWith(fetch(request,{cache:'no-store'}).catch(async()=>{
   const cache=await caches.open(CACHE);
   const url=new URL(request.url);
   // Each document needs its own HTML. Serving the app shell inside the World
   // iframe recursively launches PsychDesk instead of its accessible fallback.
   const root=new URL('./',self.location.href);
   const path=url.pathname===root.pathname?new URL('index.html',root).href:url.origin+url.pathname;
   return (await cache.match(path))||Response.error();
  }));
  return;
 }
 // Offline fallback only from this service-worker release, never older caches.
 event.respondWith(fetch(request).catch(async()=>{
  const cache=await caches.open(CACHE),url=new URL(request.url);
  return (await cache.match(url.origin+url.pathname))||Response.error();
 }));
});
