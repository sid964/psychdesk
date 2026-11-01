import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../quick-note.js',import.meta.url),'utf8');
function setup(){
 const handlers={},session=new Map(),data={subjects:[{id:'cog',name:'Cognitive Psychology'}],notes:[],stickies:[]};
 const nodes={
  '#quickNoteText':{value:'Classical conditioning\nAn association forms between stimuli.',focus(){}},
  '#quickNoteTitle':{value:''},
  '#quickNoteSubject':{value:'cog'},
  '#quickDraftStatus':{textContent:''}
 };
 let markup='',saveCount=0,closed=0,tip='',id=0,saveWorks=true;
 const core={esc:s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),
  getData:()=>data,id:()=>String(++id),openModal:(_title,html)=>{markup=html},closeModal:()=>{closed++},save:()=>{saveCount++;return saveWorks;},toast:s=>{tip=s}};
 const window={PsychDeskCore:core,PsychDeskFirebase:{getUserId:()=> 'alice'},
  PsychDeskStickies:{generate:(text,title,subject,color,group)=>[{id:++id,groupId:group,title,lines:[text],subjectId:subject,color}]}};
 const doc={querySelector:s=>nodes[s]||null,addEventListener:(type,cb)=>{handlers[type]=cb}};
 const sessionStorage={getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)};
 vm.runInNewContext(code,{window,document:doc,sessionStorage,Date});
 const click=action=>handlers.click({target:{closest:selector=>selector==='[data-quick]'?{dataset:{quick:action}}:null},preventDefault(){}});
 return {window,handlers,session,data,nodes,click,get markup(){return markup},get saved(){return saveCount},get closed(){return closed},get tip(){return tip},setSaveWorks(v){saveWorks=v}};
}
test('one-field quick capture auto-titles plain notes and preserves original wording',()=>{
 const h=setup();h.click('note');
 assert.equal(h.saved,1);
 assert.equal(h.data.notes.length,1);
 assert.match(h.data.notes[0].title,/Classical conditioning/);
 assert.equal(h.data.notes[0].body,h.nodes['#quickNoteText'].value);
 assert.equal(h.data.notes[0].subjectId,'cog');
 assert.equal(h.closed,1);
});
test('quick capture can make a handwritten sticky without modifying notebook notes',()=>{
 const h=setup();h.click('sticky');
 assert.equal(h.data.notes.length,0);
 assert.equal(h.data.stickies.length,1);
 assert.equal(h.data.stickies[0].color,'cream');
 assert.equal(h.data.stickies[0].subjectId,'cog');
 assert.equal(h.saved,1);
});
test('quick capture exposes an uncomplicated editor and keeps unfinished drafts in tab scope',()=>{
 const h=setup();
 h.handlers.click({target:{closest:selector=>selector==='#quickNoteBtn'?{}:null},preventDefault(){}});
 assert.match(h.markup,/JUST WRITE/);
 assert.match(h.markup,/Save to Notebook/);
 assert.match(h.markup,/Optional details/);
 h.handlers.input({target:{id:'quickNoteText'}});
 assert.match(h.session.get('psychdesk-quick-note-draft-alice')||'',/Classical conditioning/);
});

test('quick-note save failure preserves draft and does not pretend the note was saved',()=>{
 const h=setup();
 h.setSaveWorks(false);
 h.click('note');
 assert.equal(h.data.notes.length,0);
 assert.equal(h.closed,0);
 assert.match(h.session.get('psychdesk-quick-note-draft-alice')||'',/Classical conditioning/);
 assert.match(h.tip,/draft/i);
 h.setSaveWorks(true);
 h.click('note');
 assert.equal(h.data.notes.length,1);
 assert.equal(h.closed,1);
});
test('sticky quick capture also rolls back on a failed storage write',()=>{
 const h=setup();
 h.setSaveWorks(false);h.click('sticky');
 assert.equal(h.data.stickies.length,0);
 assert.equal(h.closed,0);
 assert.match(h.session.get('psychdesk-quick-note-draft-alice')||'',/Classical conditioning/);
});
