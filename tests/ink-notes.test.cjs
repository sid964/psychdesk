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
 // Imported JSON is untrusted: never embed raw attacker-controlled SVG coordinates.
 note.strokes=[{kind:'pen',c:'#20252b',w:2,p:[['0" onload="alert(1)',11,55],[30,42,70]]}];
 const sanitized=s.ink.svgSource(note);
 assert.doesNotMatch(sanitized,/onload|alert\(/);
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

test('storage failure rolls back the unsaved stroke rather than reporting success',()=>{
 const s=setup();click(s,'new');
 const page=s.study.inkNotes[0],old=page.updatedAt;
 page.strokes.push({kind:'pen',c:'#20252b',w:3,p:[[10,10,50],[20,20,60]]});
 s.core.save=()=>false;
 let rolledBack=false;
 const success=s.ink.saveChange(page,()=>{rolledBack=true;page.strokes.pop();});
 assert.equal(success,false);
 assert.equal(rolledBack,true);
 assert.equal(page.strokes.length,0);
 assert.equal(page.updatedAt,old);
});


test('removing handwriting conversion preserves legacy handwritten pages and existing typed study notes',()=>{
 const s=setup();
 const legacy={
  id:'ink-original',title:'Learning theories',subjectId:'cog',
  strokes:[{kind:'pen',c:'#20252b',w:3.2,p:[[12,19,52],[27,38,78]]}],
  neatText:'Previously polished handwriting',createdAt:'2026-11-01T10:00:00Z',
  updatedAt:'2026-11-01T10:30:00Z'
 };
 const typed={
  id:'saved-conversion',title:'Learning theories',body:'Previously converted note text',
  inkSourceId:'ink-original',subjectId:'cog',tags:'handwriting, ink notes'
 };
 s.study.inkNotes.push(legacy);s.study.notes.push(typed);
 const previous=JSON.stringify(s.study);
 assert.ok(click(s,'open',legacy.id));
 const editor=s.ink.render();
 assert.match(editor,/inkCanvas/);
 assert.match(editor,/Pen-first mode/);
 assert.doesNotMatch(editor,/Polish.{0,10}Notes|Make it neat|Save as study note|inkConvertPanel|Smooth pen strokes|inkSmooth|data-ink-convert/);
 assert.equal(JSON.stringify(s.study),previous,'existing handwritten and typed data must remain untouched');
 assert.equal(s.ink.svgSource(legacy).includes('<svg'),true);
 assert.equal(s.study.notes[0].body,'Previously converted note text');
 assert.equal(s.study.inkNotes[0].neatText,'Previously polished handwriting');
 const html=source('index.html'),worker=source('sw.js'),cloud=source('cloud.js');
 for(const item of [html,worker,s.ink.render(),source('ink-notes.js'),cloud]){
  assert.doesNotMatch(item,/ink-convert\.(js|css)|PsychDeskInkConvert|data-ink-convert|inkConvertPanel/);
 }
 for(const filename of ['ink-convert.js','ink-convert.css','tests/ink-convert.test.cjs']){
  assert.equal(fs.existsSync(path.join(__dirname,'..',filename)),false);
 }
});
