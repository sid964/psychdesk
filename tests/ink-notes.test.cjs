const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=(name)=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
function setup(){
 const study={version:2,subjects:[{id:'cog',name:'Cognitive Psychology'}],tasks:[],cards:[],sessions:[],notes:[],inkNotes:[],preferences:{}};
 const saved=[],handlers={};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const core={esc,id:()=>String(saved.length+1)+'-id',getData:()=>study,save:()=>saved.push(JSON.stringify(study)),render:()=>{},toast:()=>{}};
 const document={addEventListener:(t,fn)=>handlers[t]=fn,querySelector:()=>null};
 const window={PsychDeskCore:core,addEventListener:(t,fn)=>handlers[t]=fn};
 const ctx={window,document,TextEncoder,Date,URL,Blob,setTimeout,clearTimeout,confirm:()=>true};
 vm.runInNewContext(source('ink-notes.js'),ctx,{timeout:2000});
 return {study,core,handlers,saved,ink:window.PsychDeskInk};
}
function click(env,action,id){
 let prevent=false;
 env.handlers.click({target:{closest:selector=>selector==='[data-ink]'?{dataset:{ink:action,id:id||''}}:null},preventDefault:()=>{prevent=true;}});
 return prevent;
}
test('ink note section creates account-backed vector pages with accessible tools',()=>{
 const s=setup();
 assert.match(s.ink.render(),/New ink page/);
 assert.ok(click(s,'new'));
 assert.equal(s.study.inkNotes.length,1);
 assert.equal(s.study.inkNotes[0].strokes.length,0);
 assert.ok(s.saved.length);
 const html=s.ink.render();
 for(const item of ['Ink Notes','Pen-first mode','Undo','Redo','Highlighter','Eraser','SVG','PNG','inkCanvas'])assert.match(html,new RegExp(item,'i'));
 assert.match(source('index.html'),/data-tab="ink"/);
 assert.match(source('index.html'),/ink-notes\.js/);
 assert.match(source('sw.js'),/ink-notes\.js/);
 assert.match(source('app.js'),/inkNotes/);
 assert.match(source('firebase-sync.js'),/inkNotes/);
});
test('pressure-bearing ink is exported as a safe vector path',()=>{
 const s=setup();click(s,'new');
 const note=s.study.inkNotes[0];
 note.title='Classical <conditioning> & test';
 note.strokes=[{kind:'pen',c:'#20252b',w:3.2,p:[[14,23,10],[26,38,95],[58,70,50]]}];
 const xml=s.ink.svgSource(note);
 assert.match(xml,/<svg/);
 assert.match(xml,/&lt;conditioning&gt; &amp; test/);
 assert.doesNotMatch(xml,/<conditioning>/);
 assert.match(xml,/stroke-width=/);
 assert.match(xml,/M 14 23 L 26 38/);
 assert.match(xml,/width="1200" height="1600"/);
});
test('eraser only removes nearest stroke and supports empty pages',()=>{
 const s=setup();
 const page={strokes:[{w:3,p:[[5,5,40],[40,5,40]]},{w:3,p:[[700,800,50],[800,850,50]]}]};
 assert.equal(s.ink.eraserHit(page,[15,6]),0);
 assert.equal(s.ink.eraserHit(page,[720,811]),1);
 assert.equal(s.ink.eraserHit(page,[400,400]),-1);
 assert.equal(s.ink.eraserHit({strokes:[]},[0,0]),-1);
});
test('storage budget rejects oversized strokes and rolls back without touching prior data',()=>{
 const s=setup();click(s,'new');
 const note=s.study.inkNotes[0],before=s.saved.length;
 note.strokes=[{kind:'pen',c:'#20252b',w:3,p:Array.from({length:20000},(_,i)=>[i%1200,Math.floor(i/1200),60])}];
 let rolledBack=false;
 const ok=s.ink.saveChange(note,()=>{rolledBack=true;note.strokes=[];});
 assert.equal(ok,false);assert.equal(rolledBack,true);
 assert.equal(s.saved.length,before);assert.equal(note.strokes.length,0);
});
test('missing ink data is optional in older backups and imports remain non-destructive',()=>{
 const s=source('app.js'),firebase=source('firebase-sync.js');
 assert.match(s,/inkNotes:Array\.isArray\(imported\.inkNotes\)\?imported\.inkNotes:\[\]/);
 assert.match(s,/inkNotes:?\[\]/);
 assert.match(firebase,/\['inkNotes','research'/);
 assert.match(firebase,/d\.inkNotes\?\.length/);
});
