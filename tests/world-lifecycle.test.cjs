'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function lifecycle(){
 const source=fs.readFileSync('world/world.js','utf8');
 // Execute the real lifecycle block with GPU resources replaced by counters.
 // This isolates page-cache/disposal behavior; browser smoke covers the scene.
 const block=source.slice(source.indexOf(' function visibility(){'),source.lastIndexOf('}'));
 const events={},calls={geometry:0,material:0,texture:0,shadow:0,renderer:0,controls:0,resize:0},loops=[];
 const geometry={dispose:()=>calls.geometry++},texture={dispose:()=>calls.texture++};
 const material={map:texture,normalMap:texture,dispose:()=>calls.material++};
 const document={hidden:false,addEventListener:(name,fn)=>events[name]=fn};
 const animate=()=>{};
 vm.runInNewContext(block,{window:{addEventListener:(name,fn)=>events[name]=fn},document,
  renderer:{setAnimationLoop:fn=>loops.push(fn),dispose:()=>calls.renderer++},
  ro:{disconnect:()=>calls.resize++},controls:{dispose:()=>calls.controls++},
  scene:{traverse:fn=>{fn({geometry,material});fn({geometry,material:[material]})}},
  sun:{shadow:{dispose:()=>calls.shadow++}},status:{},night:false,reduced:false,
  performance:{now:()=>123},last:0,animate});
 return {events,calls,loops,animate,document};
}
test('World suspends hidden rendering and resumes on visibility',()=>{
 const env=lifecycle();assert.equal(env.loops.at(-1),env.animate);
 env.document.hidden=true;env.events.visibilitychange();assert.equal(env.loops.at(-1),null);
 env.document.hidden=false;env.events.visibilitychange();assert.equal(env.loops.at(-1),env.animate);
});
test('Back/Forward cache preserves resources and resumes the existing renderer',()=>{
 const env=lifecycle();env.events.pagehide({persisted:true});assert.equal(env.loops.at(-1),null);
 assert.ok(Object.values(env.calls).every(n=>n===0));env.events.pageshow();assert.equal(env.loops.at(-1),env.animate);
 env.events.pagehide({persisted:true});env.events.pageshow();assert.ok(Object.values(env.calls).every(n=>n===0));
});
test('final World exit disposes shared resources once, including shadow targets',()=>{
 const env=lifecycle();env.events.pagehide({persisted:false});
 for(const [name,count] of Object.entries(env.calls))assert.equal(count,1,name);
 assert.equal(env.loops.at(-1),null);
});
