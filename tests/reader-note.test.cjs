/* Reader integration tests, using a local Markdown file (no Drive or PDF library). */
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const script=readFileSync(join(__dirname,'..','pdf-reader.js'),'utf8');
async function setup({failSave=false}={}){
 const data={materials:[],notes:[],pdfHighlights:[]},listeners=new Map(),storage=new Map(),messages=[];
 const nodes={
  '#readerNoteDraft':{value:''},
  '#readerLinkedNotes':{innerHTML:''},
  '#readerLinkedCount':{textContent:''}
 };
 let rendered='',commits=0;
 const on=(target,name,fn)=>listeners.set(target+':'+name,fn);
 const core={
  getData:()=>data,getStorageKey:()=> 'psychdesk-user-reader-a',
  esc:s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])),
  id:()=> 'note-'+(++commits),
  toast:m=>messages.push(m),
  setTab(){core.render()},
  render(){rendered=window.PsychDeskReader.render()},
  commitChange(fn){if(failSave)return false;fn(data);return true}
 };
 const window={PsychDeskCore:core,PsychDeskCloud:{},addEventListener:(n,fn)=>on('window',n,fn)};
 const document={querySelector:s=>nodes[s]||null,addEventListener:(n,fn)=>on('document',n,fn)};
 const sessionStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 vm.runInNewContext(script,{window,document,sessionStorage,localStorage:sessionStorage,URL});
 await window.PsychDeskReader.openLocal({name:'reading.md',size:100,text:async()=> 'Psychology chapter'});
 const click=reader=>{
  const b={dataset:{reader},closest:selector=>selector==='[data-reader]'?b:null};
  listeners.get('document:click')({target:b,preventDefault(){}});
 };
 return {data,nodes,storage,messages,click,rendered:()=>rendered,reader:window.PsychDeskReader};
}
test('local reader provides an integrated note editor without uploading document text',async()=>{
 const s=await setup();
 assert.match(s.rendered(),/My notes/);
 assert.match(s.rendered(),/Psychology chapter/);
 s.nodes['#readerNoteDraft'].value='Schemas organize knowledge.';
 s.click('saveReaderNote');
 assert.equal(s.data.notes.length,1);
 assert.equal(s.data.notes[0].body,'Schemas organize knowledge.');
 assert.equal(s.data.notes[0].sourceInfo.kind,'reader-note');
 assert.equal(s.data.notes[0].sourceInfo.materialId,'local:reading.md:100:0');
 assert.equal(s.data.notes[0].sourceInfo.page,1);
 assert.equal(s.nodes['#readerNoteDraft'].value,'');
 assert.match(s.nodes['#readerLinkedNotes'].innerHTML,/Schemas organize knowledge/);
});
test('reader leaves an unsaved note untouched when storage write fails',async()=>{
 const s=await setup({failSave:true});
 s.nodes['#readerNoteDraft'].value='A draft we must keep';
 s.click('saveReaderNote');
 assert.equal(s.data.notes.length,0);
 assert.equal(s.nodes['#readerNoteDraft'].value,'A draft we must keep');
 assert.match(s.messages.join(' '),/could not be saved/i);
});
test('reader note content escapes HTML before insertion into the linked-note list',async()=>{
 const s=await setup();
 s.nodes['#readerNoteDraft'].value='<img src=x onerror=alert(1)> Study note';
 s.click('saveReaderNote');
 assert.doesNotMatch(s.nodes['#readerLinkedNotes'].innerHTML,/<img/);
 assert.match(s.nodes['#readerLinkedNotes'].innerHTML,/&lt;img/);
});
