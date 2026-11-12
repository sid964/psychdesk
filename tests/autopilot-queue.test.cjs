'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){
 const events=new EventTarget(),storage=new Map(),stores={jobs:new Map(),artifacts:new Map(),activity:new Map()};
 const data={notes:[{id:'n1',title:'Memory',body:'Memory: Holding and retrieving information.',subjectId:''}],subjects:[{id:'cog',name:'Cognitive Psychology'}],cards:[]};
 let reply,analysisStarted;const started=new Promise(resolve=>analysisStarted=resolve);
 const db={transaction(name){const tx={objectStore(){return {getAll(){return request([...stores[name].values()])},put(value){stores[name].set(value.key,structuredClone(value));return request(value.key)}}}};function request(value){const req={};queueMicrotask(()=>{req.result=structuredClone(value);req.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.())});return req;}return tx;}};
 const indexedDB={open(){const req={};queueMicrotask(()=>{req.result=db;req.onsuccess()});return req;}};
 const core={getStorageKey:()=> 'test-account',getData:()=>data,esc:String,render(){},commitChange(fn){fn(data);return true}};
 const window={PsychDeskCore:core,indexedDB,addEventListener:events.addEventListener.bind(events)};
 const document={querySelector:()=>null,addEventListener(){},documentElement:{dataset:{}},body:{append(){},classList:{toggle(){}}},createElement(){return {addEventListener(){}}}};
 class Worker{addEventListener(_name,fn){reply=fn}removeEventListener(){}postMessage(message){analysisStarted(message)}terminate(){}}
 const source=fs.readFileSync('autopilot/studio.js','utf8').replace('window.PsychDeskAutopilot={','window.__queue={run,rev};window.PsychDeskAutopilot={');
 vm.runInNewContext(source,{window,document,indexedDB,Worker,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},fetch:async()=>({ok:true,json:async()=>({concepts:[]})}),console,URL,Event,setTimeout:()=>1,clearTimeout(){},setInterval(){},queueMicrotask});
 return {data,stores,storage,started,async run(){await new Promise(setImmediate);const revision=window.__queue.rev(data.notes[0]);stores.jobs.set('job1',{key:'job1',scope:'test-account',sourceId:'n1',revision,state:'pending',attempts:0,at:'2026-11-12'});storage.set('psychdesk-studio:test-account:mode','"autopilot"');return window.__queue.run()},reply(message){reply({data:{jobId:message.jobId,result:{suggestion:{subjectId:'cog',confidence:.96}}}})}};
}
for(const change of ['edited','deleted'])test('worker result is stale when its source is '+change+' during analysis',async()=>{
 const env=setup();const task=env.run(),message=await env.started;
 if(change==='edited')env.data.notes[0].body='A different topic, unrelated to the previous text.';else env.data.notes=[];
 env.reply(message);await task;
 assert.equal(env.stores.jobs.get('job1').state,'stale');assert.equal(env.stores.artifacts.size,0);assert.equal(env.stores.activity.size,0);
 if(change==='edited')assert.equal(env.data.notes[0].subjectId,'');
});
test('unchanged source still receives reversible high-confidence organization',async()=>{
 const env=setup();const task=env.run(),message=await env.started;env.reply(message);await task;
 assert.equal(env.data.notes[0].subjectId,'cog');assert.equal(env.stores.jobs.get('job1').state,'complete');
 assert.equal(env.stores.artifacts.size,1);assert.equal([...env.stores.activity.values()][0].undo.oldSubjectId,'');
});
