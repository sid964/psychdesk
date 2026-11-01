const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
function harness({canSave=true,confirmResult=true}={}){
 const study={version:2,subjects:[{id:'bio',name:'Biological Psychology'}],notes:[],inkNotes:[],tasks:[],cards:[],sessions:[],preferences:{}};
 const events={},saved=[];
 const core={
  getData:()=>study,save:()=>{if(canSave){saved.push(JSON.stringify(study));return true}return false},
  esc:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  id:()=>String(saved.length+1)+'-id',toast:()=>{},setTab:()=>{},render:()=>{}
 };
 const ink={getActive:()=>study.inkNotes[0]||null,saveChange(note,rollback){
  if(canSave){saved.push(JSON.stringify(study));return true}
  rollback();return false;
 },drawStroke:()=>{}};
 const ctx={
  window:{PsychDeskCore:core,PsychDeskInk:ink,PsychDeskFirebase:{getUserId:()=> 'student'} ,addEventListener:(name,fn)=>{events[name]=fn}},
  document:{addEventListener:(name,fn)=>{events[name]=fn},getElementById:()=>null,querySelector:()=>null},
  TextEncoder,URL,Blob,setTimeout,clearTimeout,confirm:()=>confirmResult,
 };
 vm.runInNewContext(read('ink-convert.js'),ctx,{timeout:1500});
 const note={id:'ink-1',title:'Cognitive dissonance',subjectId:'bio',strokes:[],createdAt:'2026-11-01T10:00:00Z',updatedAt:'2026-11-01T10:00:00Z'};
 study.inkNotes.push(note);
 return {api:ctx.window.PsychDeskInkConvert,study,note,saved,ctx};
}
const stroke=(y,x=10)=>({kind:'pen',c:'#20252b',w:3.2,p:[[x,y,55],[x+20,y+6,70],[x+40,y+1,80]]});
test('The optional UI preserves original ink and requires review before saving',()=>{
 const h=harness();
 let markup=h.api.panel(h.note);
 assert.match(markup,/Make it neat/);
 assert.match(markup,/Save as study note/);
 assert.match(markup,/Review the text/);
 assert.match(markup,/not uploaded/);
 assert.match(markup,/inkConvertReview" hidden/);
 assert.equal(h.note.neatText,undefined);
 assert.equal(h.study.notes.length,0);
 h.note.neatText='<script>alert(1)</script>\nCognitive dissonance';
 markup=h.api.panel(h.note);
 assert.doesNotMatch(markup,/<script>/);
 assert.match(markup,/&lt;script&gt;/);
 assert.match(markup,/Neat handwritten preview/);
});
test('Group handwritten pen strokes into approximate writing lines, ignoring highlights',()=>{
 const h=harness();
 const groups=h.api.groupLines([stroke(25),stroke(31,70),stroke(190),{kind:'highlighter',p:[[0,500,50],[10,550,50]]}].filter(x=>x.kind==='pen'));
 assert.equal(groups.length,2);
 assert.equal(groups[0].length,2);
 assert.equal(groups[1].length,1);
 assert.deepEqual(Array.from(h.api.safePoints({p:[['x',0,0],[-9,1800,120],[30,40,50]]})).map(a=>Array.from(a)),
  [[0,1600,100],[30,40,50]]);
});
test('Browser-native handwriting recognition uses pen strokes and releases its recognizer',async()=>{
 const h=harness();
 const calls={strokes:[],cleared:false,finished:false};
 class InkStroke{constructor(){this.points=[]}addPoint(p){this.points.push(p)}}
 const nav={
  async createHandwritingRecognizer(opts){assert.equal(opts.languages[0],'en');return{
   startDrawing:opts=>{assert.equal(opts.recognitionType,'text');return{
    addStroke:x=>calls.strokes.push(x),
    getPrediction:async()=>[{text:'  cognitive dissonance is discomfort  '}],
    clear(){calls.cleared=true}
   }},
   finish(){calls.finished=true}
  }}
 };
 const output=await h.api.recognizeNative([stroke(35),stroke(55)],nav,InkStroke);
 assert.equal(output,'cognitive dissonance is discomfort');
 assert.equal(calls.strokes.length,2);
 assert.equal(calls.strokes[0].points.length,3);
 assert.ok(calls.cleared&&calls.finished);
 assert.equal(await h.api.recognizeNative([stroke(35)],{},InkStroke),null);
});
test('Optional TrOCR runs its model over local image data, not an upload endpoint',async()=>{
 const h=harness();let called=0,loaded=0,images=[],updates=[];
 const context={fillRect(){},save(){},scale(){},translate(){},restore(){}};
 const document={createElement:()=>({width:0,height:0,getContext:()=>context,toDataURL:()=> 'data:image/png;base64,AAA'})};
 const result=await h.api.localTrOCR([stroke(26),stroke(34,100),stroke(210)],s=>updates.push(s),{
  document,
  load:async()=>{loaded++;return{pipeline:async(task,id,opts)=>{
   assert.equal(task,'image-to-text');assert.equal(id,h.api.MODEL_ID);
   assert.equal(opts.device,'wasm');
   return async(img,generate)=>{images.push(img);called++;assert.equal(generate.max_new_tokens,160);
    return [{generated_text:called===1?'working memory':'and attention'}]}}
  }}
 });
 assert.equal(result,'working memory\nand attention');
 assert.equal(loaded,1);assert.equal(called,2);
 assert.ok(images.every(im=>im.startsWith('data:image/png;')));
 assert.ok(updates.some(s=>s.includes('on this device')));
 assert.match(read('ink-convert.js'),/https:\/\/cdn\.jsdelivr\.net/);
 assert.doesNotMatch(read('ink-convert.js'),/api\.openai\.com|generativelanguage\.googleapis\.com|api\.ocr\.space/);
});
test('Neat version is only saved by explicit action; loss of storage rolls it back',()=>{
 const h=harness();const before=h.note.strokes;
 const result=h.api.saveNeatText(h.note,'Cognitive dissonance\nis discomfort');
 assert.equal(result.ok,true);
 assert.equal(h.note.neatText,'Cognitive dissonance\nis discomfort');
 assert.strictEqual(h.note.strokes,before);
 const bad=harness({canSave:false});bad.note.neatText='Prior version';
 const fail=bad.api.saveNeatText(bad.note,'Unverified OCR');
 assert.equal(fail.ok,false);
 assert.equal(bad.note.neatText,'Prior version');
});
test('Converting reviewed writing produces existing editable note shape and source linkage',()=>{
 const h=harness();h.note.strokes.push(stroke(30));
 const result=h.api.toStudyNote(h.note,'Cognitive dissonance is discomfort.\nFestinger, 1957.');
 assert.equal(result.ok,true);
 assert.equal(result.updated,false);
 assert.equal(h.study.notes.length,1);
 assert.equal(h.study.notes[0].inkSourceId,h.note.id);
 assert.equal(h.study.notes[0].title,'Cognitive dissonance');
 assert.equal(h.study.notes[0].subjectId,'bio');
 assert.match(h.study.notes[0].body,/Festinger/);
 assert.equal(h.note.strokes.length,1);
});
test('Converting again avoids duplicate notes and asks before overwriting edits',()=>{
 const h=harness();
 assert.equal(h.api.toStudyNote(h.note,'First reviewed version').ok,true);
 const first=h.study.notes[0];first.tags='assignment';
 const result=h.api.toStudyNote(h.note,'Updated reviewed version');
 assert.equal(result.ok,true);assert.equal(result.updated,true);
 assert.equal(h.study.notes.length,1);
 assert.equal(h.study.notes[0].id,first.id);
 assert.equal(h.study.notes[0].tags,'assignment');
 const denied=harness({confirmResult:false});
 denied.api.toStudyNote(denied.note,'Keep this');
 const outcome=denied.api.toStudyNote(denied.note,'Overwrite');
 assert.equal(outcome.ok,false);
 assert.equal(denied.study.notes[0].body,'Keep this');
});
test('No notes are created when storage budget or browser storage denies a conversion',()=>{
 const h=harness();h.study.notes.push({id:'large',title:'Already here',body:'x'.repeat(690000)});
 const fail=h.api.toStudyNote(h.note,'Psychology notes');
 assert.equal(fail.ok,false);
 assert.equal(h.study.notes.length,1);
 const offline=harness({canSave:false});const denied=offline.api.toStudyNote(offline.note,'Please stay');
 assert.equal(denied.ok,false);assert.equal(offline.study.notes.length,0);
});
test('Polishing and converted notes are included in existing app shell without paid services',()=>{
 const html=read('index.html'),sw=read('sw.js'),ink=read('ink-notes.js');
 for(const item of ['ink-convert.js','ink-convert.css']){assert.ok(html.includes(item));assert.ok(sw.includes(item))}
 assert.match(ink,/inkSmooth/);assert.match(ink,/quadraticCurveTo/);
 assert.match(ink,/PsychDeskInkConvert\?\.panel\(note\)/);
 assert.match(read('cloud.js'),/noteEditor/);
 assert.ok(html.indexOf('ink-notes.js')<html.indexOf('ink-convert.js'));
});
