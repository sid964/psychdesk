/* Continuity regression: account isolation, navigation, missing content and safe markup. */
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const src=readFileSync(join(__dirname,'..','study-session.js'),'utf8');
function setup(){
 const map=new Map(),listeners=new Map(),clicks=[],calls=[],toasts=[];
 let owner='psychdesk-user-alpha',reading=false;
 const data={materials:[{id:'book-1',kind:'pdf',title:'Cognitive Psychology',driveId:'drive-1'}],notes:[{id:'note-1',title:'Piaget notes',body:'Private content'}]};
 const add=(name,fn)=>{if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn)};
 const fire=(name,details)=>{for(const fn of listeners.get(name)||[])fn(details||{})};
 const core={
  getStorageKey:()=>owner,getData:()=>data,esc:s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])),
  toast:s=>toasts.push(s),setTab:t=>{calls.push(['tab',t]);fire('psychdesk:tab-changed',{tab:t})}
 };
 const context={
  localStorage:{getItem:key=>map.get(key)||null,setItem:(key,v)=>map.set(key,v)},
  document:{querySelector:s=>s==='.reader-layout'&&reading?{}:null,addEventListener:(name,fn)=>{add('document:'+name,fn)}},
  window:{PsychDeskCore:core,addEventListener:add,
   PsychDeskReader:{open:(id,page)=>calls.push(['reader',id,page])},
   PsychDeskCloud:{noteEditor:note=>calls.push(['note',note.id])}}
 };
 vm.runInNewContext(src,context,{filename:'study-session.js'});
 return {api:context.window.PsychDeskSession,map,data,calls,clicks,toasts,fire,owner:value=>owner=value,reading:value=>reading=value};
}
test('reader resume keeps page and opens the original library material',()=>{
 const e=setup();
 e.api.readerOpened('book-1',1);
 e.api.readerPage(24);
 assert.equal(e.api.getResume().page,24);
 assert.equal(e.api.getResume().title,'Cognitive Psychology');
 e.api.resume();
 assert.deepEqual(e.calls,[['reader','book-1',24]]);
 assert.match(e.api.homeButton(),/Continue reading/);
 assert.doesNotMatch([...e.map.values()].join(''),'Private content');
});
test('remembering a note does not require rewriting account study data',()=>{
 const e=setup();
 e.api.noteOpened('note-1');
 assert.equal(e.api.getResume().noteId,'note-1');
 e.api.resume();
 assert.deepEqual(e.calls,[['tab','notes'],['note','note-1']]);
 assert.equal(e.data.notes[0].body,'Private content');
});
test('reader modal editing does not replace the last reading position',()=>{
 const e=setup();
 e.api.readerOpened('book-1',15);
 e.reading(true);
 e.api.noteOpened('note-1');
 assert.equal(e.api.getResume().tab,'reader');
 assert.equal(e.api.getResume().page,15);
});
test('account-scoped state is never shared across different accounts',()=>{
 const e=setup();
 e.api.readerOpened('book-1',7);
 e.owner('psychdesk-user-beta');
 assert.equal(e.api.getResume(),null);
 e.api.noteOpened('note-1');
 assert.equal(e.api.getResume().noteId,'note-1');
 e.owner('psychdesk-user-alpha');
 assert.equal(e.api.getResume().page,7);
});
test('deleted materials cannot be resumed',()=>{
 const e=setup();
 e.api.readerOpened('book-1',4);
 e.data.materials.length=0;
 assert.equal(e.api.getResume(),null);
 assert.equal(e.api.homeButton(),'');
 e.api.resume();
 assert.match(e.toasts[0],/no longer available/);
});
test('saved titles are escaped and never inserted as raw markup',()=>{
 const e=setup();
 e.data.materials[0].title='<img src=x onerror=alert(1)>';
 e.api.readerOpened('book-1',2);
 assert.doesNotMatch(e.api.homeDetail(),/<img/);
 assert.match(e.api.homeDetail(),/&lt;img/);
});
test('corrupt continuity state leaves the study record unaffected',()=>{
 const e=setup();
 e.map.set('psychdesk-session-v1:psychdesk-user-alpha','{broken-json');
 assert.equal(e.api.getResume(),null);
 assert.equal(e.data.notes.length,1);
});
