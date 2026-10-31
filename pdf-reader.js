/* PsychDesk book reader: PDF.js canvas + selectable text, real highlights & study conversions. */
(()=>{'use strict';
const core=window.PsychDeskCore,cloud=window.PsychDeskCloud;
if(!core)return;
const h=core.esc,$=s=>document.querySelector(s),getData=()=>core.getData();
const CDN='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/';
let libPromise=null,pdf=null,material=null,localFile=null,page=1,scale=1.1,generation=0,loading=false;
let selected={text:'',rects:[],page:1},readerError='',fileText='',searchQuery='',searchHits=[],lastSearchIndex=-1;
const allHighlights=()=>Array.isArray(getData().pdfHighlights)?getData().pdfHighlights:[];
const owned=()=>allHighlights().filter(x=>x.materialId===(material?.id||'local'));
const allowLink=u=>{try{const a=new URL(u);return /^https?:$/.test(a.protocol)?a.href:''}catch{return''}};
async function pdfLib(){
 if(!libPromise)libPromise=import(CDN+'pdf.min.mjs').then(mod=>{
  mod.GlobalWorkerOptions.workerSrc=CDN+'pdf.worker.min.mjs';
  return mod;
 }).catch(e=>{libPromise=null;throw Error('PDF rendering library could not load. Check internet access and try again. '+(e.message||''));});
 return libPromise;
}
function bookTitle(){return material?.title||localFile?.name||'Your book';}
function shelf(){
 const items=(getData().materials||[]).filter(m=>m.kind==='pdf'||m.kind==='markdown');
 return '<section class="hero"><div class="eyebrow">READ · MARK · REMEMBER</div><h1>Book reader.</h1><p>Read your books in PsychDesk and turn selected text into lasting study notes.</p></section>'+ (readerError?'<div class="reader-error" role="alert">'+h(readerError)+' <button data-reader="driveSettings">Check Drive connection</button>'+(material?.url&&allowLink(material.url)?' <a href="'+h(allowLink(material.url))+'" target="_blank" rel="noopener noreferrer">Open in Google Drive ↗</a>':'')+'</div>':'')+
 '<div class="study-panel"><div class="study-panel-heading"><h2>Choose your material</h2><span>PDF or Markdown</span></div>'+
 '<p>Books in your library are stored in your own Google Drive. Reconnect Drive if you are asked to. You can also open a local PDF for this session.</p>'+
 '<label class="reader-local-label">Open a PDF from this device <input id="localReaderFile" type="file" accept=".pdf,.md,.markdown,application/pdf,text/markdown"></label>'+
 '<div class="reader-shelf">'+(items.length?items.map(m=>'<button type="button" data-reader="openBook" data-id="'+h(m.id)+'"><span>▤</span><strong>'+h(m.title||m.fileName)+'</strong><small>'+h(m.kind.toUpperCase())+'</small></button>').join(''):'<div class="study-empty">No PDFs on this shelf yet. Add one through your Subject Library.</div>')+'</div></div>';
}
function annotationCard(x){
 return '<article class="reader-highlight-card"><span>PAGE '+h(x.page)+' · '+h(new Date(x.createdAt).toLocaleDateString())+'</span><blockquote>'+h(x.text)+'</blockquote>'+
 (x.note?'<p>'+h(x.note)+'</p>':'')+
 '<div class="reader-highlight-actions"><button data-reader="jump" data-page="'+h(x.page)+'">Go to page</button><button data-reader="stickyHighlight" data-id="'+h(x.id)+'">Make sticky</button><button data-reader="deleteHighlight" data-id="'+h(x.id)+'">Remove</button></div></article>';
}
function readerHTML(){
 if(!pdf&&!fileText)return shelf();
 const count=pdf?.numPages||1;
 return '<section class="hero reader-hero"><div class="eyebrow">YOUR READING ROOM</div><h1>'+h(bookTitle())+'</h1><p>Select text to highlight, save an excerpt or create study material.</p></section>'+
 '<div class="reader-toolbar"><button data-reader="back">← Bookshelf</button><button data-reader="prev">←</button><span>Page <input type="number" id="readerPage" min="1" max="'+count+'" value="'+page+'"> / '+count+'</span><button data-reader="next">→</button>'+
 '<button data-reader="zoomOut">−</button><span>'+Math.round(scale*100)+'%</span><button data-reader="zoomIn">+</button>'+
 '<button data-reader="search">Find in book</button></div>'+
 '<div class="reader-layout"><section class="reader-page-area"><div id="readerRenderStatus" role="status">'+(loading?'Loading page…':readerError?h(readerError):'')+'</div>'+
 (fileText?'<div id="readerMarkdown" class="reader-markdown" tabindex="0">'+h(fileText)+'</div>':'<div class="reader-canvas-scroll"><div id="readerPageSurface" class="reader-page-surface"><canvas id="readerCanvas"></canvas><div class="reader-text-layer" id="readerTextLayer"></div><div class="reader-mark-layer" id="readerMarkLayer"></div></div></div>')+
 '</section><aside class="reader-sidebar"><div class="study-panel-heading"><h2>Reading tools</h2><span id="readerSelectedCount">Select words on the page</span></div>'+
 '<div class="reader-selection" id="readerSelectedText">Highlight a definition, explanation or interesting passage.</div>'+
 '<div class="reader-side-actions"><button data-reader="mark" class="primary">Highlight selection</button><button data-reader="sticky">Make sticky</button><button data-reader="card">Create flashcards</button><button data-reader="note">Save as notebook note</button></div>'+
 '<div class="reader-highlight-list"><h3>Saved highlights <span id="readerHighlightCount">'+owned().length+'</span></h3><div id="readerHighlights">'+owned().slice().reverse().map(annotationCard).join('')+'</div></div>'+
 '<p class="study-legal">Highlights are stored with your study data; full PDF bytes stay in Drive or your selected local file. Scanned PDFs need selectable text/OCR for text extraction.</p></aside></div>';
}
async function openMaterial(id){
 const target=(getData().materials||[]).find(m=>m.id===id);
 if(!target||!['pdf','markdown'].includes(target.kind)){core.toast('Choose a PDF or Markdown book.');return;}
 generation++;const version=generation;
 material=target;localFile=null;pdf=null;fileText='';readerError='';selected={text:'',rects:[],page:1};page=1;scale=1.1;loading=true;
 core.setTab('reader');
 try{
  if(!target.driveId)throw Error('The library item has no Drive file ID. You can open it externally.');
  const blob=await cloud.fetchStudyMaterial(target.driveId);
  if(version!==generation)return;
  await processBlob(blob,target.kind,version);
 }catch(error){
  if(version!==generation)return;
  readerError=String(error.message||error);
  loading=false;core.render();
 }
}
async function processBlob(blob,kind,version){
 if(kind==='markdown'){fileText=(await blob.text()).slice(0,1000000);pdf=null;page=1;loading=false;if(version===generation)core.render();return;}
 const engine=await pdfLib();
 const bytes=await blob.arrayBuffer();
 if(version!==generation)return;
 const task=engine.getDocument({data:new Uint8Array(bytes),useSystemFonts:true});
 pdf=await task.promise;
 if(version!==generation){pdf.destroy();return;}
 fileText='';loading=false;core.render();await renderPage();
}
async function openLocal(file){
 if(!file)return;
 const ext=file.name.toLowerCase();
 if(!/\.(pdf|md|markdown)$/.test(ext)){core.toast('Choose a PDF or Markdown file.');return;}
 if(file.size>80*1024*1024){core.toast('The in-browser reader supports files up to 80 MB.');return;}
 generation++;const version=generation;
 material=null;localFile=file;pdf=null;fileText='';readerError='';page=1;loading=true;
 core.setTab('reader');
 try{await processBlob(file,/\.pdf$/.test(ext)?'pdf':'markdown',version);}
 catch(e){if(version===generation){readerError=String(e.message||e);loading=false;core.render();}}
}
function visibleMarks(){
 const container=$('#readerMarkLayer'),surface=$('#readerPageSurface');
 if(!container||!surface)return;
 container.innerHTML='';
 const w=surface.clientWidth,hgt=surface.clientHeight;
 for(const x of owned().filter(x=>x.page===page)){
  for(const box of x.rects||[]){
   if(!Array.isArray(box)||box.length!==4)continue;
   const div=document.createElement('div');div.className='reader-highlight-block';
   Object.assign(div.style,{left:(box[0]*w)+'px',top:(box[1]*hgt)+'px',width:(box[2]*w)+'px',height:(box[3]*hgt)+'px'});
   div.title=x.text;container.append(div);
  }
 }
}
async function renderPage(){
 if(!pdf)return;
 const version=generation,pageNum=page,surface=$('#readerPageSurface'),canvas=$('#readerCanvas'),layer=$('#readerTextLayer');
 if(!surface||!canvas||!layer)return;
 const status=$('#readerRenderStatus');if(status)status.textContent='Rendering page '+pageNum+'…';
 try{
  const engine=await pdfLib(),p=await pdf.getPage(pageNum);if(version!==generation||pageNum!==page)return;
  const viewport=p.getViewport({scale}),ratio=Math.min(window.devicePixelRatio||1,2);
  const ctx=canvas.getContext('2d',{alpha:false});
  canvas.width=Math.floor(viewport.width*ratio);canvas.height=Math.floor(viewport.height*ratio);
  canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';
  surface.style.width=viewport.width+'px';surface.style.height=viewport.height+'px';
  layer.style.width=viewport.width+'px';layer.style.height=viewport.height+'px';
  layer.style.setProperty('--scale-factor',String(viewport.scale));
  layer.replaceChildren();
  await p.render({canvasContext:ctx,viewport,transform:ratio!==1?[ratio,0,0,ratio,0,0]:null}).promise;
  if(version!==generation||pageNum!==page)return;
  const t=new engine.TextLayer({textContentSource:p.streamTextContent(),container:layer,viewport});
  await t.render();
  if(version!==generation||pageNum!==page)return;
  visibleMarks();if(status)status.textContent='';
 }catch(e){if(status)status.textContent='Could not render page: '+String(e.message||e);}
}
function capture(){
 const sel=window.getSelection?.(),layer=$('#readerTextLayer'),surface=$('#readerPageSurface');
 if(!sel||!sel.rangeCount||sel.isCollapsed)return;
 const range=sel.getRangeAt(0);
 if((!layer||!layer.contains(range.commonAncestorContainer))&&!$('#readerMarkdown')?.contains(range.commonAncestorContainer))return;
 if(fileText){selected={text:String(sel.toString()).trim().slice(0,3000),rects:[],page:1};updateSelection();return;}
 const text=String(sel.toString()).trim().slice(0,3000);
 if(!text)return;
 const bounds=surface.getBoundingClientRect();
 const rects=Array.from(range.getClientRects()).filter(r=>r.width>2&&r.height>2).slice(0,90).map(r=>
  [(r.left-bounds.left)/bounds.width,(r.top-bounds.top)/bounds.height,r.width/bounds.width,r.height/bounds.height]);
 selected={text,rects,page};
 updateSelection();
}
function updateSelection(){
 const el=$('#readerSelectedText');if(el)el.textContent=selected.text||'Select a passage in the current page to create a highlight or study note.';
 const status=$('#readerSelectedCount');if(status)status.textContent=selected.text?selected.text.length+' selected characters':'Select words on the page';
}
function addHighlight(){
 if(!selected.text){core.toast('Select text on the PDF page first.');return;}
 const note=prompt('Optional note about this highlight (you may leave this blank):','');
 if(note===null)return;
 const data=getData();
 if(!Array.isArray(data.pdfHighlights))data.pdfHighlights=[];
 data.pdfHighlights.push({id:core.id(),materialId:material?.id||'local',page:selected.page,text:selected.text.slice(0,3000),rects:selected.rects,
 note:String(note).slice(0,400),createdAt:new Date().toISOString()});
 core.save();const el=$('#readerHighlights');
 if(el)el.innerHTML=owned().slice().reverse().map(annotationCard).join('');
 const c=$('#readerHighlightCount');if(c)c.textContent=String(owned().length);
 visibleMarks();core.toast('Highlight saved');
}
function textToSticky(text,subject){
 if(!text.trim()){core.toast('Select or save a passage first.');return;}
 const pages=window.PsychDeskStickies?.generate?.(text,'From '+(bookTitle().slice(0,50)),subject||material?.subjectId||'','cream',core.id(),[]);
 if(!pages?.length){core.toast('Could not generate a sticky.');return;}
 getData().stickies.push(...pages);core.save();core.toast('Handwritten sticky saved to your wall.');
}
function textToCards(text,subject){
 const generated=window.PsychDeskExtras?.generateCards?.(text,subject||material?.subjectId||'',12)||[];
 if(!generated.length){core.toast('No “Term: definition” patterns found. Save the passage as a note or make flashcards manually.');return;}
 const questions=new Set((getData().cards||[]).map(c=>c.question.toLowerCase()));
 const unique=generated.filter(c=>!questions.has(c.question.toLowerCase()));
 if(!unique.length){core.toast('These flashcards already exist.');return;}
 if(!confirm('Add '+unique.length+' flashcards generated from the selected definitions? Review them for accuracy before studying.'))return;
 getData().cards.push(...unique);core.save();core.toast(unique.length+' flashcards created.');
}
function textToNote(text){
 if(!text.trim()){core.toast('Select a passage first.');return;}
 window.PsychDeskCloud?.noteEditor?.({id:'',title:'Reading highlight · '+bookTitle().slice(0,80),body:text,subjectId:material?.subjectId||'',tags:'pdf highlight'});
}
async function navigate(pageNumber){
 if(!pdf)return;
 const n=Math.min(Math.max(1,Number(pageNumber)||1),pdf.numPages);if(n===page)return;
 page=n;selected={text:'',rects:[],page};core.render();await renderPage();
}
async function zoom(step){
 if(!pdf)return;
 scale=Math.max(.6,Math.min(2.5,Math.round((scale+step)*10)/10));
 core.render();await renderPage();
}
async function findAll(){
 if(!pdf){core.toast('Open a PDF to search its pages.');return;}
 const term=prompt('Find a word or phrase in this PDF:',searchQuery);
 if(!term)return;
 searchQuery=term.toLowerCase().trim();searchHits=[];lastSearchIndex=-1;
 const max=Math.min(pdf.numPages,250),loadingEl=$('#readerRenderStatus');
 if(loadingEl)loadingEl.textContent='Searching '+max+' pages…';
 for(let i=1;i<=max;i++){
  const pg=await pdf.getPage(i),contents=await pg.getTextContent();
  const joined=contents.items.map(x=>x.str||'').join(' ').toLowerCase();
  if(joined.includes(searchQuery))searchHits.push(i);
  if(i%15===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 if(loadingEl)loadingEl.textContent=searchHits.length?searchHits.length+' matching pages':'No matches in first '+max+' pages';
 if(searchHits.length){lastSearchIndex=0;await navigate(searchHits[0]);}
}
function back(){generation++;pdf?.destroy?.();pdf=null;material=null;localFile=null;fileText='';selected={text:'',rects:[],page:1};core.setTab('reader');}
document.addEventListener('change',e=>{
 if(e.target.id==='localReaderFile'){openLocal(e.target.files?.[0]);}
 if(e.target.id==='readerPage')navigate(e.target.value);
});
document.addEventListener('pointerup',e=>{if(e.target.closest('#readerTextLayer,#readerMarkdown'))setTimeout(capture,0);});
document.addEventListener('keyup',e=>{if(e.target.closest?.('#readerTextLayer,#readerMarkdown'))setTimeout(capture,0);});
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-reader]');if(!b)return;e.preventDefault();
 switch(b.dataset.reader){
 case 'openBook':openMaterial(b.dataset.id);break;
 case 'driveSettings':cloud?.openSettings?.();break;
 case 'back':back();break;
 case 'prev':navigate(page-1);break;
 case 'next':navigate(page+1);break;
 case 'zoomOut':zoom(-.2);break;
 case 'zoomIn':zoom(.2);break;
 case 'search':findAll();break;
 case 'mark':addHighlight();break;
 case 'sticky':textToSticky(selected.text);break;
 case 'card':textToCards(selected.text);break;
 case 'note':textToNote(selected.text);break;
 case 'jump':navigate(Number(b.dataset.page));break;
 case 'stickyHighlight':{const item=owned().find(x=>x.id===b.dataset.id);if(item)textToSticky(item.text);break;}
 case 'deleteHighlight':if(confirm('Remove this highlight?')){getData().pdfHighlights=allHighlights().filter(x=>x.id!==b.dataset.id);core.save();
  const list=$('#readerHighlights');if(list)list.innerHTML=owned().slice().reverse().map(annotationCard).join('');
  const count=$('#readerHighlightCount');if(count)count.textContent=String(owned().length);visibleMarks();}break;
 }
});
window.addEventListener('psychdesk:session-reset',()=>{generation++;pdf?.destroy?.();pdf=null;material=null;localFile=null;fileText='';selected={text:'',rects:[],page:1};});
window.PsychDeskReader={render:readerHTML,open:openMaterial,openLocal,capture,annotationCard};
})();