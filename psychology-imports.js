/* Indexed, device-local dictionary packs. Never put bulk reference data in Firebase snapshots. */
(()=>{'use strict';
const core=window.PsychDeskCore;
if(!core)return;
const DB_NAME='psychdesk-dictionary-packs-v1', STORE='terms', PAGE_SIZE=40;
const CATEGORIES=['Learning','Cognition','Biological','Development','Social','Research','Clinical','Other'];
const el=id=>document.getElementById(id);
const esc=value=>core.esc(String(value??''));
const normalize=s=>String(s||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();
let dbPromise=null, mounted=false, searchSequence=0, searchTimer=0, selectedImport=null, importing=false;
const knownCurated=new Set((window.PSYCHDESK_PSYCHOLOGY_REFERENCE?.definitions||[]).map(t=>normalize(t.term)));
function openDB(){
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  if(!window.indexedDB){reject(Error('This browser does not support IndexedDB.'));return;}
  const request=indexedDB.open(DB_NAME,1);
  request.onupgradeneeded=()=>{
   const db=request.result;
   if(!db.objectStoreNames.contains(STORE)){
    const store=db.createObjectStore(STORE,{keyPath:'id'});
    store.createIndex('termLower','termLower');
    store.createIndex('categoryTerm',['category','termLower']);
   }
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||Error('Could not open local dictionary.'));
 });
 return dbPromise;
}
function readCount(db){
 return new Promise((resolve,reject)=>{
  const request=db.transaction(STORE,'readonly').objectStore(STORE).count();
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 });
}
function rangeFor(prefix,category){
 if(category!=='All')return IDBKeyRange.bound([category,prefix],[category,prefix+'\uffff']);
 return prefix?IDBKeyRange.bound(prefix,prefix+'\uffff'):null;
}
function searchIndex(db,prefix,category){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),store=tx.objectStore(STORE);
  const index=store.index(category==='All'?'termLower':'categoryTerm');
  const range=rangeFor(prefix,category),countRequest=range?index.count(range):index.count(),cursorRequest=range?index.openCursor(range):index.openCursor();
  const entries=[];let count=0;
  countRequest.onsuccess=()=>{count=countRequest.result;};
  cursorRequest.onsuccess=()=>{
   const cursor=cursorRequest.result;
   if(cursor&&entries.length<PAGE_SIZE){entries.push(cursor.value);cursor.continue();}
  };
  tx.oncomplete=()=>resolve({count,entries});
  tx.onerror=()=>reject(tx.error||Error('Dictionary search failed.'));
 });
}
function markedRows(db,prefix,category){
 const ids=(core.getData().dictionaryBookmarks||[]).filter(v=>typeof v==='string'&&v.startsWith('pack:'));
 if(!ids.length)return Promise.resolve({count:0,entries:[]});
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),store=tx.objectStore(STORE),rows=[];
  ids.forEach(id=>{
   const req=store.get(id);
   req.onsuccess=()=>{
    const item=req.result;
    if(item&&(category==='All'||item.category===category)&&(!prefix||item.termLower.startsWith(prefix)))rows.push(item);
   };
  });
  tx.oncomplete=()=>{
   rows.sort((a,b)=>a.term.localeCompare(b.term));
   resolve({count:rows.length,entries:rows.slice(0,PAGE_SIZE)});
  };
  tx.onerror=()=>reject(tx.error);
 });
}
function activeCategory(){
 return document.querySelector('.psy-tabs [data-psy="category"].active')?.dataset.value||'All';
}
function bookmarkedOnly(){
 return Boolean(document.querySelector('[data-psy="toggleSaved"].selected'));
}
function sectionMarkup(){
 return '<div id="psyPackUtility" class="psy-pack-utility"><div class="psy-pack-summary"><strong>Extended dictionary</strong>'+
 '<small>Fast indexed searches. Imported references stay on this device, separate from your account-synced study data.</small></div>'+
 '<div class="psy-pack-controls"><span id="psyPackTotal" aria-live="polite">Loading terms…</span>'+
 '<button type="button" id="psyPackImportBtn" class="secondary">Import term collection</button>'+
 '<input type="file" id="psyPackFile" accept=".jsonl,.ndjson,.csv,text/csv,application/x-ndjson" hidden></div></div>'+
 '<p id="psyPackStatus" class="psy-pack-status" aria-live="polite">Import CSV or JSONL with term and definition fields. Include category, example and source where available. Only import material you have permission to use.</p>';
}
async function mount(){
 const host=document.querySelector('.psy-info-strip');
 if(!host)return;
 if(!el('psyPackUtility'))host.insertAdjacentHTML('afterend',sectionMarkup());
 mounted=true;
 try{
  const db=await openDB();
  const count=await readCount(db);
  if(el('psyPackTotal'))el('psyPackTotal').textContent=count.toLocaleString()+' imported terms';
 }catch(e){if(el('psyPackTotal'))el('psyPackTotal').textContent='Local imports unavailable';status(e.message,true);}
 scheduleSearch(0);
}
function status(message,isError=false){
 const node=el('psyPackStatus');
 if(node){node.textContent=message;node.classList.toggle('psy-pack-error',isError);}
}
function scheduleSearch(delay=130){
 clearTimeout(searchTimer);const sequence=++searchSequence;
 searchTimer=setTimeout(()=>void updateResults(sequence),delay);
}
async function updateResults(sequence){
 const container=el('psyDictionaryResults');
 if(!container)return;
 const query=normalize(el('psyDictionaryQuery')?.value),category=activeCategory();
 let result;
 try{
  const db=await openDB();
  result=bookmarkedOnly()?await markedRows(db,query,category):await searchIndex(db,query,category);
 }catch(e){status('Indexed search unavailable: '+e.message,true);return;}
 if(sequence!==searchSequence||!el('psyDictionaryResults'))return;
 el('psyDictionaryImportedResults')?.remove();
 const nativeEntries=window.PsychDeskKnowledge?.findTerms?.()||[];
 const empty=container.querySelector(':scope > .psy-empty');
 if(empty)empty.hidden=result.count>0;
 const area=document.createElement('div');
 area.id='psyDictionaryImportedResults';
 area.className='psy-imported-results';
 area.innerHTML='<div class="psy-pack-results-label">IMPORTED REFERENCES · '+result.count.toLocaleString()+' MATCHING TERMS'+
 (query?' · starts with “'+esc(query)+'”':'')+'</div>'+
 (result.entries.length?result.entries.map(entry=>
  '<button type="button" class="psy-entry psy-pack-entry" data-pack-id="'+esc(entry.id)+'"><span><strong>'+
  esc(entry.term)+'</strong><small>'+esc(entry.category)+' · Imported reference</small></span><span class="psy-chevron">›</span></button>').join(''):
  '<p class="psy-pack-hint">No imported terms match. Try the beginning of a concept name or import a glossary.</p>')+
 (result.count>PAGE_SIZE?'<p class="psy-pack-hint">Showing the first '+PAGE_SIZE+' results. Keep typing to narrow your search.</p>':'');
 container.appendChild(area);
 const countNode=el('psyDictionaryCount');
 if(countNode)countNode.textContent=nativeEntries.length.toLocaleString()+' curated/personal · '+result.count.toLocaleString()+' imported matches';
}
function validSource(raw){
 try{const url=new URL(String(raw||''));return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return'';}
}
function parseCsvRow(line){
 const values=[];let value='',quoted=false;
 for(let i=0;i<line.length;i++){
  const c=line[i];
  if(c==='"'){if(quoted&&line[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
  else if(c===','&&!quoted){values.push(value);value='';}
  else value+=c;
 }
 values.push(value);return values;
}
function splitRecords(buffer,csv,final=false){
 const records=[];let start=0,quoted=false;
 for(let i=0;i<buffer.length;i++){
  if(csv&&buffer[i]==='"'){
   if(quoted&&buffer[i+1]==='"'){i++;continue;}
   quoted=!quoted;
  }else if(buffer[i]==='\n'&&!quoted){records.push(buffer.slice(start,i).replace(/\r$/,''));start=i+1;}
 }
 const remaining=buffer.slice(start);
 if(remaining.length>2*1024*1024)throw Error('A glossary row is too large (maximum 2 MB).');
 if(final&&quoted)throw Error('A CSV field has an unclosed quotation mark.');
 if(final&&remaining.trim())records.push(remaining.replace(/\r$/,''));
 return {records,remaining:final?'':remaining};
}
function makeRecord(row){
 const term=String(row.term||row.name||'').trim().slice(0,140);
 const definition=String(row.definition||row.meaning||'').trim().slice(0,1300);
 const termLower=normalize(term);
 if(termLower.length<2||definition.length<5||knownCurated.has(termLower))return null;
 const requestedCategory=String(row.category||'Other').trim();
 const category=CATEGORIES.find(c=>c.toLowerCase()===requestedCategory.toLowerCase())||'Other';
 return {id:'pack:'+termLower,term,termLower,category,definition,
  example:String(row.example||'').trim().slice(0,700),
  source:validSource(row.source||row.url||'')};
}
function commitBatch(db,rows){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
  rows.forEach(row=>store.put(row));
  tx.oncomplete=resolve;
  tx.onerror=()=>reject(tx.error||Error('Could not save imported terms.'));
  tx.onabort=()=>reject(tx.error||Error('Import was interrupted.'));
 });
}
async function importFile(file){
 if(importing)return;
 if(!file)return;
 const csv=/\.csv$/i.test(file.name);
 if(!csv&&!/\.(jsonl|ndjson)$/i.test(file.name)){status('Choose a .csv, .jsonl, or .ndjson file.',true);return;}
 if(file.size>100*1024*1024&&!confirm('This large glossary may need substantial device storage and take time to import. Continue?'))return;
 importing=true;
 const button=el('psyPackImportBtn');if(button)button.disabled=true;
 let parsed=0,skipped=0,headers=null,buffer='',offset=0,batched=[];
 try{
  const db=await openDB(),decoder=new TextDecoder('utf-8'),chunkSize=1024*1024;
  const processLine=line=>{
   if(!line.trim())return;
   try{
    let raw;
    if(csv){
     const parts=parseCsvRow(line);
     if(!headers){
      const names=parts.map(h=>normalize(h.replace(/^\ufeff/,'')));
      if(!names.includes('term')||!names.includes('definition'))throw Error('CSV headers must contain term and definition.');
      headers=names;
      return;
     }
     raw={};headers.forEach((key,i)=>raw[key]=parts[i]||'');
    }else raw=JSON.parse(line.replace(/^\ufeff/,''));
    const record=makeRecord(raw);
    if(record){batched.push(record);parsed++;}else skipped++;
   }catch(error){
    if(csv&&!headers)throw error;
    skipped++;
   }
  };
  while(offset<file.size){
   const bytes=await file.slice(offset,offset+chunkSize).arrayBuffer();
   offset+=bytes.byteLength;
   buffer+=decoder.decode(bytes,{stream:true});
   const split=splitRecords(buffer,csv);buffer=split.remaining;
   for(const line of split.records){
    processLine(line);
    if(batched.length>=400){await commitBatch(db,batched);batched=[];}
   }
   status('Importing '+file.name+' · '+Math.round(100*offset/file.size)+'% read · '+parsed.toLocaleString()+' valid rows');
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  buffer+=decoder.decode();
  for(const line of splitRecords(buffer,csv,true).records)processLine(line);
  if(batched.length)await commitBatch(db,batched);
  const count=await readCount(db);
  if(el('psyPackTotal'))el('psyPackTotal').textContent=count.toLocaleString()+' imported terms';
  status('Imported '+parsed.toLocaleString()+' valid rows; '+skipped.toLocaleString()+' skipped. '+count.toLocaleString()+' unique imported terms are indexed on this device. Repeated terms update an existing entry.');
  scheduleSearch(0);
 }catch(e){
  status('Import stopped: '+e.message+'. Previously saved batches are still on this device.',true);
 }finally{
  importing=false;if(button)button.disabled=false;
  if(el('psyPackFile'))el('psyPackFile').value='';
 }
}
function selectedDetails(entry){
 selectedImport=entry;
 const marked=(core.getData().dictionaryBookmarks||[]).includes(entry.id);
 const action=(name,label)=>'<button type="button" data-pack-action="'+name+'">'+label+'</button>';
 const detail=el('psyDefinitionDetail');
 if(!detail)return;
 detail.innerHTML='<article class="psy-detail"><div class="psy-detail-overline">'+esc(entry.category)+' / IMPORTED REFERENCE</div>'+
 '<h2>'+esc(entry.term)+'</h2><h3>What it means</h3><p class="psy-definition">'+esc(entry.definition)+'</p>'+
 (entry.example?'<h3>Example in practice</h3><p>'+esc(entry.example)+'</p>':'')+
 (entry.source?'<a class="psy-source" target="_blank" rel="noopener noreferrer" href="'+esc(entry.source)+'">Open original source ↗</a>':'')+
 (entry.source.startsWith('https://en.wikipedia.org/wiki/')?'<p class="psy-pack-hint">Text: Wikipedia contributors, <a target="_blank" rel="noopener noreferrer" href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>.</p>':'')+
 '<p class="psy-pack-hint">Imported wording is not independently verified by PsychDesk. Confirm important facts against your textbook or original source.</p>'+
 '<div class="psy-detail-actions">'+action('bookmark',marked?'✦ Bookmarked':'☆ Bookmark')+
 action('note','Save to notebook')+action('flash','Make flashcard')+action('copy','Copy definition')+'</div></article>';
}
function actionOnSelected(action){
 const e=selectedImport;if(!e)return;
 const d=core.getData();
 if(action==='copy'){Promise.resolve().then(()=>{if(!navigator.clipboard)throw Error('unavailable');return navigator.clipboard.writeText(e.term+': '+e.definition)}).then(()=>core.toast('Definition copied')).catch(()=>core.toast('Could not copy. Select the definition and copy it manually.'));return;}
 if(action==='bookmark'){
  const marks=new Set(Array.isArray(d.dictionaryBookmarks)?d.dictionaryBookmarks:[]);
  if(marks.has(e.id))marks.delete(e.id);else marks.add(e.id);
  const before=d.dictionaryBookmarks;d.dictionaryBookmarks=[...marks];if(core.save()===false){d.dictionaryBookmarks=before;return;}selectedDetails(e);scheduleSearch(0);return;
 }
 if(action==='note'){
  d.notes=Array.isArray(d.notes)?d.notes:[];
  const before=d.notes.slice(),stamp=new Date().toISOString();
  d.notes.unshift({id:core.id(),title:e.term,body:e.definition+(e.source?'\n\nSource: '+e.source:''),tags:'psychology-dictionary',subjectId:'',createdAt:stamp,updatedAt:stamp});
  if(core.save()===false){d.notes=before;return;}core.toast('Saved to notebook.');return;
 }
 if(action==='flash'){
  d.cards=Array.isArray(d.cards)?d.cards:[];
  const question='Define '+e.term+'.';
  if(d.cards.some(c=>c.question?.toLowerCase()===question.toLowerCase())){core.toast('Already in your flashcards.');return;}
  const before=d.cards.slice();d.cards.push({id:core.id(),question,answer:e.definition.slice(0,1500),subjectId:'',due:core.today(),interval:0,reps:0});
  if(core.save()===false){d.cards=before;return;}core.toast('Flashcard saved.');
 }
}
document.addEventListener('input',event=>{
 if(event.target?.id==='psyDictionaryQuery')scheduleSearch();
});
document.addEventListener('change',event=>{
 if(event.target?.id==='psyPackFile')void importFile(event.target.files?.[0]);
});
document.addEventListener('click',event=>{
 const importButton=event.target.closest('#psyPackImportBtn');
 if(importButton){el('psyPackFile')?.click();return;}
 const item=event.target.closest('[data-pack-id]');
 if(item){
  event.preventDefault();
  const id=item.dataset.packId;
  void openDB().then(db=>new Promise((resolve,reject)=>{
   const request=db.transaction(STORE,'readonly').objectStore(STORE).get(id);
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error);
  })).then(entry=>{if(entry&&el('psyDefinitionDetail'))selectedDetails(entry);}).catch(e=>status(e.message,true));
  return;
 }
 const action=event.target.closest('[data-pack-action]');
 if(action){event.preventDefault();actionOnSelected(action.dataset.packAction);return;}
 if(event.target.closest('[data-psy]'))setTimeout(()=>{if(el('psyPackUtility'))scheduleSearch(0);else if(document.querySelector('.psy-info-strip'))void mount();},0);
});
window.addEventListener('psychdesk:tab-changed',()=>setTimeout(()=>{if(document.querySelector('.psy-info-strip')&&el('psyDictionaryResults'))void mount();},0));
async function saveTerm(row){
 const entry=makeRecord(row);
 if(!entry){
  const known=knownCurated.has(normalize(row?.term));
  return {saved:false,reason:known?'already-curated':'invalid'};
 }
 const db=await openDB();
 await commitBatch(db,[entry]);
 return {saved:true,id:entry.id,count:await readCount(db)};
}
window.PsychDeskDictionaryPacks={mount,saveTerm,search:async(q,category='All')=>searchIndex(await openDB(),normalize(q),category),count:async()=>readCount(await openDB())};
})();
