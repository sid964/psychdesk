const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const load=name=>fs.readFileSync(path.join(root,name),'utf8');

function book(id,subject) {
 return {id,title:id,author:'Test author',edition:'Test edition',subject,pdfOffset:3,chapters:[{
  id:'chapter-one',title:'Chapter one',sections:[1,2].map(number=>({
   id:'part-'+number,title:'Part '+number,page:number,blocks:[
    {id:'opening',type:'paragraph',text:'A <sample> opening line.'},
    {id:'second',type:'paragraph',text:'More sample practice.'}
   ]
  }))
 }]};
}
const samples=[book('sample-memory','Cognitive Psychology'),book('sample-methods','Research Methods')];

function harness({fixture=true,hash=''}={}) {
 const account=new Map(), docEvents={}, windowEvents={}, elements=new Map();
 let owner='guest', tab='today', markup='', dialog='', animation, selection, scrollTarget='';
 const data=()=> {
  if(!account.has(owner))account.set(owner,{notes:[],cards:[],subjects:[]});
  return account.get(owner);
 };
 const element=selector=>{
  if(!elements.has(selector))elements.set(selector,{
   addEventListener(name,fn){this[name]=fn},setAttribute(){},focus(){},
   scrollIntoView(){scrollTarget=selector}
  });
  return elements.get(selector);
 };
 const document={
  addEventListener(name,fn){docEvents[name]=fn},
  querySelector(selector){return element(selector)},
  createRange(){return {selectNodeContents(){},setEnd(){},toString:()=>''}}
 };
 const location={hash,pathname:'/psychdesk/',search:''};
 const history={pushState(_,__,hash){location.hash=hash.startsWith('#')?hash:''}};
 let id=0;
 const window={
  addEventListener(name,fn){windowEvents[name]=fn},
  getSelection:()=>selection,
  PsychDeskReader:{openLocal(file,page){window.source={file,page}}},
  PsychDeskCore:{
   esc:v=>String(v).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c])),
   getStorageKey:()=>owner,getData:data,commitChange(fn){fn(data());return true},
   setTab(value){tab=value;window.PsychDeskCore.render();windowEvents['psychdesk:tab-changed']({tab})},
   render(){markup=tab==='books'?window.PsychDeskBooks.render():'';window.PsychDeskBooks.afterRender(tab)},
   openModal(_,html){dialog=html},closeModal(){dialog=''},toast(){},subjectOptions:()=>'<option value="">General</option>',
   id:()=>String(++id),today:()=>'2026-11-20'
  }
 };
 const context={document,window,location,history,console,Node:{ELEMENT_NODE:1},
  FormData:class {constructor(form){this.form=form} get(name){return this.form[name]}},
  setTimeout(){return 1},clearTimeout(){},cancelAnimationFrame(){animation=null},
  requestAnimationFrame(fn){animation=fn;return 1}
 };
 vm.createContext(context);
 vm.runInContext(load('book-catalog.js'),context);
 if(fixture)window.PsychDeskBookCatalog=samples;
 vm.runInContext(load('book-reader.js'),context);
 const click=(action,extra={})=>{
  const target={dataset:{bookAction:action,...extra},matches:()=>false};
  docEvents.click({target:{closest:()=>target}});
 };
 return {api:window.PsychDeskBooks,data,element,click,location,window,windowEvents,
  setOwner(value){owner=value;window.PsychDeskCore.render()},markup:()=>markup,dialog:()=>dialog,
  animate(){animation?.()},scrollTarget:()=>scrollTarget,
  select(quote='A <sample>'){
   const block={dataset:{bookBlock:'opening'}};
   const node={nodeType:1,closest:()=>block};
   selection={rangeCount:1,getRangeAt:()=>({startContainer:node,endContainer:node,startOffset:0,toString:()=>quote})};
   docEvents.selectionchange();
  }
 };
}

test('the Bookshelf links the approved companions without reviving the old summary catalog',()=>{
 const app=harness({fixture:false});
 assert.equal(app.window.PsychDeskBookCatalog.length,0);
 const html=app.api.render();
 assert.match(html,/Biological Psychology/);
 assert.match(html,/Psychopathology/);
 assert.match(html,/\.\/psychopathology-9e\.html/);
 assert.match(html,/Academic verification in progress/);
 const shell=load('index.html'),worker=load('sw.js');
 for(const name of ['book-catalog.js','book-reader.js','book-reader.css']){
  assert.ok(shell.includes(name));
  assert.ok(worker.includes("'./"+name+"'"));
 }
 assert.ok(worker.includes("'./psychopathology-9e.html'"));
 assert.ok(worker.includes("'./psychopathology-assets/extra-diagrams.js'"));
});

test('chapter status begins in progress on visit and counts only explicit completion',()=>{
 const app=harness();
 app.api.open('sample-memory');
 assert.match(app.markup(),/Chapter 1 of 1 · In progress/);
 assert.match(app.markup(),/Mark chapter as read/);
 assert.match(app.markup(),/Mark this part read/);
 assert.deepEqual(Array.from(app.data().bookReading[0].visitedParts),['part-1']);
 app.click('chapterComplete');
 assert.match(app.markup(),/Chapter 1 of 1 · Read/);
 assert.match(app.markup(),/Undo chapter completion/);
 assert.deepEqual(Array.from(app.data().bookReading[0].completedChapters),['chapter-one']);
 app.click('shelf');
 assert.match(app.markup(),/Bookshelf/);
 assert.match(app.markup(),/Biological Psychology/);
 app.api.open('sample-memory');
 app.click('chapterComplete');
 assert.match(app.markup(),/Chapter 1 of 1 · In progress/);
 assert.equal(app.data().bookReading[0].completedChapters.length,0);
});

test('different subjects and editions use one reader with separate progress and bookmarks',()=>{
 const app=harness();
 assert.equal(app.api.validateCatalog(samples).length,2);
 assert.deepEqual(samples.map(book=>book.subject),['Cognitive Psychology','Research Methods']);
 app.api.open('sample-memory');
 assert.match(app.markup(),/A &lt;sample&gt; opening/);
 app.click('next');
 app.click('bookmark');
 app.click('complete');
 assert.match(app.markup(),/50% marked read/);
 app.api.open('sample-methods');
 assert.match(app.location.hash,/sample-methods\/part-1$/);
 assert.equal(app.data().bookReading[1].bookmarks,undefined);
 app.api.open('sample-memory');
 assert.match(app.location.hash,/sample-memory\/part-2$/);
 assert.match(app.markup(),/Bookmarked/);
 app.setOwner('signed-in');
 assert.doesNotMatch(app.markup(),/Bookmarked/);
 app.api.open('sample-memory');
 assert.match(app.location.hash,/sample-memory\/part-1$/);
 app.setOwner('guest');
 app.api.open('sample-memory');
 assert.match(app.location.hash,/sample-memory\/part-2$/);
});

test('reading links, confirmable study items, highlights, and PDF page handoff work',()=>{
 const app=harness({hash:'#books/sample-memory/part-1/second'});
 app.animate();
 assert.match(app.scrollTarget(),/second/);
 app.select();
 app.click('highlight');
 assert.match(app.markup(),/<mark>A &lt;sample&gt;<\/mark>/);
 app.select();
 app.click('note');
 assert.equal(app.data().notes.length,0);
 app.element('#bk-draft').submit({preventDefault(){},currentTarget:{title:'My note',body:'Editable draft',subject:''}});
 const source=app.data().notes[0].sourceInfo;
 assert.match(app.api.sourceLink(source),/#books\/sample-memory\/part-1\/opening/);
 app.click('card');
 app.element('#bk-draft').submit({preventDefault(){},currentTarget:{title:'My question',body:'My answer',subject:''}});
 assert.equal(app.data().cards[0].sourceInfo.sectionId,'part-1');
 app.click('pdf');
 app.element('#bk-pdf').change({target:{files:[{name:'test.pdf'}]}});
 assert.equal(app.window.source.page,4);
});

test('invalid IDs, duplicate editions, and invalid PDF references are rejected',()=>{
 const {api}=harness();
 assert.throws(()=>api.validateCatalog([samples[0],samples[0]]),/duplicate/);
 assert.throws(()=>api.validateCatalog([{...samples[0],id:'"><script>'}]),/Invalid book metadata/);
 assert.throws(()=>api.validateCatalog([{...samples[0],pdfOffset:-5}]),/Invalid reading section/);
});
