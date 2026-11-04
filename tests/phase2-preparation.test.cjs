/* Phase 2 approval flow regression checks: no automatic uploads or accidental source copies. */
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const fs=require('node:fs'),src=fs.readFileSync('autopilot/preparation.js','utf8');
function setup({analyze,saveFails=false}={}){
 let owner='psychdesk-user-alice',modal='',saved=0,closed=0,n=0;
 const toasts=[],listeners={},data={notes:[],cards:[],subjects:[{id:'cog',name:'Cognitive Psychology'}]};
 const elements={
  '#phase2Subject':{value:'cog'},
  '#phase2Outline':{value:'# Chapter 2\n- Term: Memory'}
 };
 const window={addEventListener(){},PsychDeskAutopilot:{
  analyze:analyze|| (async()=>({outline:['Chapter 2'],terms:['Memory'],questions:[],cards:[
   {question:'What is memory?',answer:'A storage and retrieval process.'}],suggestion:{subjectId:'cog',confidence:.85}}))
 }};
 const core={
  getStorageKey:()=>owner,getData:()=>data,today:()=> '2026-11-04',id:()=> 'record-'+(++n),
  esc:s=>String(s??'').replace(/[&<>"']/g,v=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&quot;'}[v])),
  toast:s=>toasts.push(s),
  openModal:(_title,html)=>{modal=html},closeModal:()=>closed++,render(){},
  commitChange:fn=>{if(saveFails)return false;fn(data);saved++;return true;}
 };
 window.PsychDeskCore=core;
 const document={querySelector:s=>elements[s]||null,querySelectorAll:sel=>sel==='[data-phase2-card]:checked'?[{dataset:{phase2Card:'0'}}]:[],
  addEventListener:(n,fn)=>listeners[n]=fn};
 vm.runInNewContext(src,{window,document,TextEncoder,console});
 return {api:window.PsychDeskPreparation,data,toasts,modal:()=>modal,saved:()=>saved,closed:()=>closed,owner:x=>owner=x,
  approve:()=>listeners.click({target:{closest:s=>s==='[data-phase2="approve"]'?{}:null},preventDefault(){}}),elements};
}
const source={title:'Psychology chapter',text:'Memory: A storage and retrieval process.',origin:'drive-library',materialId:'book-a',pageStart:4,pageEnd:9};
test('preparing displays a review preview but does not change account data',async()=>{
 const e=setup(),ok=await e.api.prepare(source);
 assert.equal(ok,true);
 assert.equal(e.data.notes.length,0);assert.equal(e.data.cards.length,0);
 assert.match(e.modal(),/Chapter 2/);
 assert.match(e.modal(),/What is memory/);
 assert.doesNotMatch(e.modal(),/A storage and retrieval process\.\s+Memory:/);
});
test('approval saves compact outline and selected card with source provenance',async()=>{
 const e=setup();await e.api.prepare(source);e.approve();
 assert.equal(e.data.notes.length,1);assert.equal(e.data.cards.length,1);
 assert.equal(e.data.notes[0].sourceInfo.materialId,'book-a');
 assert.equal(e.data.notes[0].sourceInfo.pageStart,4);
 assert.equal(e.data.notes[0].derivedKind,'prepared-chapter');
 assert.equal(e.data.cards[0].sourcePageEnd,9);
 assert.equal(e.data.cards[0].sourceTitle,'Psychology chapter');
 assert.equal(e.closed(),1);
});
test('preparation never saves source body unless explicitly copied to outline',async()=>{
 const e=setup();await e.api.prepare({...source,text:'Confidential passage not for sync.'});e.approve();
 assert.doesNotMatch(JSON.stringify(e.data),/Confidential passage/);
});
test('existing flashcards and identical outlines are not duplicated on repeat approval',async()=>{
 const e=setup();await e.api.prepare(source);e.approve();
 await e.api.prepare(source);e.approve();
 assert.equal(e.data.cards.length,1);assert.equal(e.data.notes.length,1);
});
test('account switching during asynchronous analysis discards the preview',async()=>{
 let finish;const e=setup({analyze:()=>new Promise(r=>{finish=r})});
 const task=e.api.prepare(source);e.owner('psychdesk-user-bob');
 finish({outline:[],terms:[],questions:[],cards:[],suggestion:{subjectId:'',confidence:0}});
 assert.equal(await task,false);assert.equal(e.modal(),'');assert.equal(e.data.notes.length,0);
});
test('failed study data save preserves preview and does not clear it',async()=>{
 const e=setup({saveFails:true});await e.api.prepare(source);e.approve();
 assert.equal(e.saved(),0);assert.equal(e.closed(),0);assert.match(e.modal(),/Save selected/);
});
test('preview safely escapes hostile imported text in extracted headings and cards',async()=>{
 const e=setup({analyze:async()=>({outline:['<img src=x onerror=1>'],terms:[],questions:[],cards:[{question:'<svg onload=1>',answer:'answer'}],suggestion:{subjectId:'',confidence:0}})});
 await e.api.prepare({...source,title:'<script>alert(1)</script>'});
 assert.doesNotMatch(e.modal(),/<script>/);assert.doesNotMatch(e.modal(),/<svg onload/);
 assert.match(e.modal(),/&lt;svg/);
});
