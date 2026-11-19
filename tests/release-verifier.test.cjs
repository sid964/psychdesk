'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {CRITICAL_FILES,verifyRelease}=require('../scripts/verify-live-release.cjs');
const root=path.resolve(__dirname,'..');
const site='https://example.test/psychdesk/';
const sha='a'.repeat(40);
const mockFetch=({staleFirst=false,staleAlways=false,missing=null}={})=>{
 let first=true;
 return async url=>{
  const file=decodeURIComponent(new URL(url).pathname.split('/psychdesk/')[1]||'');
  if(!CRITICAL_FILES.includes(file)||file===missing)return new Response('missing',{status:404});
  const bytes=await fs.readFile(path.join(root,file));
  const wrong=file==='index.html'&&(staleAlways||(staleFirst&&first));
  if(file==='index.html')first=false;
  return new Response(wrong?Buffer.from('stale index'):bytes,{status:200});
 };
};
test('release verifier covers the actual shipped app, course and World assets',()=>{
 for(const file of ['index.html','app.js','sw.js','study-clarity.css','autopilot/studio.js','psychopathology-graph.js','psychopathology-graph.css','world/world.js','world/world.css','world/index.html','world/life.js'])
  assert.ok(CRITICAL_FILES.includes(file),'critical release file '+file);
 assert.equal(new Set(CRITICAL_FILES).size,CRITICAL_FILES.length,'no duplicate downloads');
});
test('release verifier succeeds only after every file matches the current commit',async()=>{
 const messages=[];
 const result=await verifyRelease({site,sha,root,attempts:2,delayMs:0,fetcher:mockFetch({staleFirst:true}),log:s=>messages.push(s)});
 assert.equal(result.attempts,2);
 assert.deepEqual(result.verified,CRITICAL_FILES);
 assert.match(messages[0],/index.html \(content mismatch\)/);
 assert.match(messages.at(-1),/LIVE_RELEASE_VERIFIED/);
});
test('a stale or missing published file blocks the release',async()=>{
 await assert.rejects(verifyRelease({site,sha,root,attempts:1,fetcher:mockFetch({staleAlways:true}),log:()=>{}}),/index.html \(content mismatch\)/);
 await assert.rejects(verifyRelease({site,sha,root,attempts:1,fetcher:mockFetch({missing:'world/world.js'}),log:()=>{}}),/world\/world.js \(HTTP 404\)/);
});
test('missing release commit does not silently pass',async()=>{
 await assert.rejects(verifyRelease({site,sha:'invalid',fetcher:mockFetch(),log:()=>{}}),/40-character commit hash/);
});
