'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(){
 const handlers={},matched=[],cached=[];
 const self={location:{origin:'https://example.test',href:'https://example.test/psychdesk/sw.js'},clients:{claim(){}},skipWaiting(){},addEventListener:(name,fn)=>handlers[name]=fn};
 vm.runInNewContext(fs.readFileSync('sw.js','utf8'),{self,URL,Request,Response,
  fetch:async()=>{throw Error('Offline')},caches:{open:async()=>({match:async url=>{matched.push(url);return 'cached:'+url},addAll:async files=>cached.push(...files)}),keys:async()=>[]}});
 return {matched,cached,async fetch(path,mode='navigate'){let response;handlers.fetch({request:{method:'GET',url:'https://example.test'+path,mode},respondWith:value=>response=value});return response},async install(){let completion;handlers.install({waitUntil:value=>completion=value});await completion}};
}
test('offline World navigation serves World HTML rather than the main app shell',async()=>{
 const env=setup();assert.equal(await env.fetch('/psychdesk/world/index.html'),'cached:https://example.test/psychdesk/world/index.html');
});
test('offline home aliases and query URLs resolve to their own cached document',async()=>{
 const env=setup();for(const path of ['/psychdesk/','/psychdesk/index.html?v=release'])assert.equal(await env.fetch(path),'cached:https://example.test/psychdesk/index.html');
});
test('offline assets strip version queries only within the current release cache',async()=>{
 const env=setup();assert.equal(await env.fetch('/psychdesk/world/world-ui.js?v=natural-2','cors'),'cached:https://example.test/psychdesk/world/world-ui.js');
});
test('all local entrypoint assets exist and are precached, including World fallback',()=>{
 const sw=fs.readFileSync('sw.js','utf8');const files=vm.runInNewContext(sw.match(/const FILES=(\[[^;]+\]);/)[1]);
 for(const file of files)assert.ok(fs.existsSync(file),file+' is missing');
 for(const entry of ['index.html','world/index.html']){
  const html=fs.readFileSync(entry,'utf8');
  for(const [,url] of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
   if(/^(?:https?:|data:)/.test(url))continue;
   const local='./'+require('node:path').posix.join(require('node:path').posix.dirname(entry),url.split('?')[0]);
   assert.ok(files.includes(local),'Missing offline asset '+local);
  }
 }
});

test('repaired entrypoint scripts do not reuse their obsolete HTTP-cache URLs',()=>{
 const html=fs.readFileSync('index.html','utf8');
 const previous={'sticky-notes.js':'copy-sober-1','setup-status.js':'calm-20261102-1','tour.js':'copy-sober-1','firebase-sync.js':'calm-20261102-1','motion-runtime.js':'human-motion-1','reference-manager.js':'calm-20261102-1','autopilot/studio.js':'desk-startup-20261110','world/world-bridge.js':'natural-2'};
 for(const [file,version] of Object.entries(previous)){
  const url=Array.from(html.matchAll(/<script[^>]+src="([^"]+)"/g),match=>match[1]).find(url=>url.startsWith(file+'?'));
  assert.ok(url,'missing script '+file);assert.notEqual(url,file+'?v='+version,'stale URL for '+file);
 }
});
