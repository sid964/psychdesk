/* Run with: node --test tests/psychology-online.test.cjs */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','psychology-online.js'),'utf8');

function createModule(){
 let requests=0;
 const listeners={};
 const context={
  window:{PsychDeskCore:{esc:String},addEventListener:(type,fn)=>{listeners[type]=fn;}},
  document:{addEventListener:(type,fn)=>{listeners[type]=fn;}},
  fetch:()=>{requests++;throw Error('Unexpected automatic network request');},
  URL,AbortController,setTimeout,clearTimeout
 };
 vm.runInNewContext(source,context,{timeout:1000});
 return {api:context.window.PsychDeskOnDemand,context,get requests(){return requests;}};
}
test('on-demand lookup does not fetch on page load',()=>{
 const module=createModule();
 assert.equal(module.requests,0);
 assert.equal(typeof module.api.mount,'function');
});
test('search sends only the current term to the documented public API',async()=>{
 const {api}=createModule();
 let requested,opts;
 const response={ok:true,json:async()=>({query:{pages:[
  {pageid:203,index:2,title:'Working memory',extract:'An article summary about short term working memory and cognition.'},
  {pageid:10,index:1,title:'Memory',extract:'An explanation of the mechanisms and storage of information.'}
 ]}})};
 const results=await api.searchWikipedia(' working   memory ',{
  fetchImpl:async(url,options)=>{requested=new URL(url);opts=options;return response;}
 });
 assert.equal(requested.origin,'https://en.wikipedia.org');
 assert.equal(requested.pathname,'/w/api.php');
 assert.equal(requested.searchParams.get('origin'),'*');
 assert.equal(requested.searchParams.get('gsrsearch'),'working memory');
 assert.equal(requested.searchParams.get('explaintext'),'1');
 assert.equal(requested.searchParams.get('gsrlimit'),'8');
 assert.equal(opts.credentials,'omit');
 assert.deepEqual(Array.from(results.map(x=>x.term)),['Memory','Working memory']);
 assert.equal(results[0].source,'https://en.wikipedia.org/wiki/Memory');
});
test('short queries make no network requests',async()=>{
 const {api}=createModule();
 let calls=0;
 const results=await api.searchWikipedia('A',{fetchImpl:async()=>{calls++;}});
 assert.equal(calls,0);assert.equal(results.length,0);
});
test('external results are bounded and ignore malformed or duplicate entries',()=>{
 const {api}=createModule();
 const payload={query:{pages:[
  {pageid:1,index:1,title:'Example',extract:'A sufficiently long description of this example page.'},
  {pageid:1,index:2,title:'Example again',extract:'Another sufficiently long paragraph.'},
  {pageid:-1,index:3,title:'Missing',extract:'A sufficiently long description.'},
  {pageid:2,index:4,title:'Empty',extract:''}
 ]}};
 const entries=api.parseResults(payload);
 assert.equal(entries.length,1);
 assert.equal(entries[0].term,'Example');
 assert.equal(api.articleURL('Theory of mind'),'https://en.wikipedia.org/wiki/Theory_of_mind');
});
test('remote provider errors are reported, never mistaken for definitions',async()=>{
 const {api}=createModule();
 await assert.rejects(api.searchWikipedia('attention',{fetchImpl:async()=>({ok:false,status:503})}),/unavailable/);
 await assert.rejects(api.searchWikipedia('attention',{fetchImpl:async()=>({ok:true,json:async()=>({error:{code:'maxlag'}})})}),/could not complete/);
});
test('online code is delivered after existing curated and imported vocabulary',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 const worker=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
 for(const name of ['psychology-online.js','psychology-online.css']){
  assert.ok(html.includes(name));
  assert.ok(worker.includes(name));
 }
 assert.ok(html.indexOf('psychology-imports.js')<html.indexOf('psychology-online.js'));
 const importer=fs.readFileSync(path.join(__dirname,'..','psychology-imports.js'),'utf8');
 assert.ok(importer.includes('async function saveTerm(row)'));
 assert.ok(importer.includes('Wikipedia contributors'));
});
