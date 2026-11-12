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
