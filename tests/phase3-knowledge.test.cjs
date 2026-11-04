const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {readFileSync}=require('node:fs'),{join}=require('node:path');
const source=readFileSync(join(__dirname,'..','phase3-knowledge.js'),'utf8');
function setup(){
 const handlers={},calls=[],data={
 notes:[
  {id:'n1',title:'Working memory and attention',body:'Working memory processes attention and information in cognition.'},
  {id:'n2',title:'Attention and working memory',body:'Attention influences working memory and cognitive processing.'},
  {id:'n3',title:'Developmental theory',body:'Piaget describes stages of development.'}
 ],
 research:[{id:'r1',title:'Working memory evidence',notes:'Evidence for working memory and attention.'}],
 mindMaps:[{id:'m1',title:'Memory concept board',nodes:[{label:'Working memory'},{label:'Attention'}]}],
 subjects:[{id:'cog',name:'Cognitive Psychology'}],
 cards:[{id:'c1',question:'What is attention?',answer:'Selective processing',subjectId:'cog',due:'2026-01-01'}]
 };
 const core={getData:()=>data,today:()=> '2026-11-05',esc:v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x])),
 setTab:t=>calls.push(t),toast:()=>{},render:()=>{},closeModal:()=>{}};
 const window={PsychDeskCore:core,addEventListener:(name,fn)=>handlers['window:'+name]=fn,PsychDeskCloud:{noteEditor:()=>{}}};
 const document={addEventListener:(name,fn)=>handlers['document:'+name]=fn,querySelector:()=>null};
 vm.runInNewContext(source,{window,document,Event:class{constructor(type){this.type=type}}});
 return {api:window.PsychDeskPhase3,data,calls,handlers};
}
test('phase 3 suggests existing sources without changing any records',()=>{
 const e=setup(),before=JSON.stringify(e.data);
 assert.match(e.api.render(),/Just one next step/); // Overview defaults to a single calm action.
 e.api.setSection('connect');
 const html=e.api.render();
 assert.match(html,/Connected notes/);
 assert.match(html,/Working memory/);
 assert.match(html,/Attention and working memory/);
 assert.equal(JSON.stringify(e.data),before);
});
test('comparison uses meaningful overlapping keywords',()=>{
 const e=setup();
 const terms=e.api.related('Working memory and attention','Attention and working memory');
 assert.ok(terms.includes('working'));assert.ok(terms.includes('memory'));
 assert.deepEqual(e.api.related('Piaget stages','Conditioning reinforcement').length,0);
});
test('untrusted note titles and bodies are escaped in the view',()=>{
 const e=setup();e.data.notes[0].title='<img src=x onerror=1>';
 e.api.setSection('connect');
 const html=e.api.render();
 assert.doesNotMatch(html,/<img src=x/);
 assert.match(html,/&lt;img/);
});
test('source opening uses existing notebook rather than duplicating a note',()=>{
 const e=setup(),before=JSON.stringify(e.data);
 const button={dataset:{p3:'open',kind:'note',id:'n1'}};
 e.handlers['document:click']({target:{closest:()=>button},preventDefault(){}});
 assert.equal(e.calls[0],'notes');assert.equal(JSON.stringify(e.data),before);
});
