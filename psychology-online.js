/* PsychDesk: request a short, attributable reference preview only when the student searches.
   The built-in dictionary still works without internet. No external credentials or server.
   Wikipedia is a general reference, NOT a verified academic or clinical dictionary. */
(()=>{'use strict';
const core=window.PsychDeskCore;
if(!core)return;
const byId=id=>document.getElementById(id);
const safe=value=>core.esc(String(value??''));
const WIKIPEDIA_API='https://en.wikipedia.org/w/api.php';
const LICENSE='https://creativecommons.org/licenses/by-sa/4.0/';
const CACHE_TTL=10*60*1000;
const MAX_CACHED=15;
const cache=new Map();
let currentQuery='', active=null, lookupTimer=0, controller=null, requestNumber=0, selected=null, saveBusy=false, statusText='', pending=false;

function cleanQuery(value){return String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').slice(0,100);}
function articleURL(title){
 return 'https://en.wikipedia.org/wiki/'+encodeURIComponent(String(title).trim().replace(/ /g,'_'));
}
function parseResults(payload){
 const pages=payload?.query?.pages;
 if(!pages)return [];
 const results=Array.isArray(pages)?pages:Object.values(pages);
 const ids=new Set();
 return results
  .filter(page=>Number.isInteger(page?.pageid)&&page.pageid>0&&typeof page.title==='string'&&typeof page.extract==='string')
  .sort((a,b)=>(a.index??999)-(b.index??999))
  .map(page=>({
   id:page.pageid,
   term:page.title.slice(0,160),
   definition:page.extract.replace(/\s+/g,' ').trim().slice(0,1300),
   source:articleURL(page.title),
   provider:'Wikipedia contributors'
  }))
  .filter(page=>{
   if(ids.has(page.id)||page.definition.length<18)return false;
   ids.add(page.id);return true;
  }).slice(0,8);
}
async function searchWikipedia(query,{signal,fetchImpl=fetch}={}){
 const clean=cleanQuery(query);
 if(clean.length<2)return [];
 const url=new URL(WIKIPEDIA_API);
 const params={
  action:'query',generator:'search',gsrsearch:clean,gsrlimit:'8',gsrnamespace:'0',
  prop:'extracts',exintro:'1',explaintext:'1',exsentences:'3',
  redirects:'1',format:'json',formatversion:'2',origin:'*',maxlag:'5'
 };
 Object.entries(params).forEach(([key,value])=>url.searchParams.set(key,value));
 const response=await fetchImpl(url.toString(),{signal,credentials:'omit'});
 if(!response.ok)throw Error('Online source unavailable (HTTP '+response.status+').');
 const body=await response.json();
 if(body?.error)throw Error('The online source could not complete this lookup.');
 return parseResults(body);
}
function isDictionary(){return Boolean(byId('psyDictionaryQuery'));}
function bookmarkedFilter(){return Boolean(document.querySelector('[data-psy="toggleSaved"].selected'));}
function html(){
 return '<section id="psyOnlineBlock" class="psy-online-block" aria-label="Online concept lookup" hidden>'+
 '<div class="psy-online-heading"><strong>MORE CONCEPTS ONLINE</strong><span>Wikipedia · General reference</span></div>'+
 '<div id="psyOnlineResults" aria-live="polite"></div>'+
 '<p class="psy-online-disclaimer">Online summaries are not textbook-reviewed or clinical advice. Verify definitions with your course material. Searching requires internet; no accounts or API keys.</p></section>';
}
function mount(){
 if(!isDictionary())return;
 const results=byId('psyDictionaryResults');
 if(!results)return;
 if(!byId('psyOnlineBlock'))results.insertAdjacentHTML('afterend',html());
 syncQuery();
}
function show(message){
 const el=byId('psyOnlineResults');
 if(el)el.innerHTML='<div class="psy-online-message">'+safe(message)+'</div>';
}
function renderResults(results){
 const node=byId('psyOnlineResults');if(!node)return;
 if(!results.length){
  node.innerHTML='<div class="psy-online-message">No encyclopedia matches found for this search. Try a different spelling or a broader phrase.</div>';
  return;
 }
 node.innerHTML=results.map(row=>
  '<button type="button" data-online-id="'+row.id+'" class="psy-entry psy-online-result">'+
  '<span><strong>'+safe(row.term)+'</strong><small>'+safe(row.definition.slice(0,110))+(row.definition.length>110?'…':'')+'</small></span>'+
  '<span class="psy-chevron" aria-hidden="true">›</span></button>'
 ).join('');
}
function cached(query){
 const entry=cache.get(query.toLocaleLowerCase());
 if(!entry||Date.now()-entry.time>CACHE_TTL){cache.delete(query.toLocaleLowerCase());return null;}
 return entry.results;
}
function remember(query,results){
 const key=query.toLocaleLowerCase();
 cache.delete(key);cache.set(key,{time:Date.now(),results});
 if(cache.size>MAX_CACHED)cache.delete(cache.keys().next().value);
}
function cancelLookup(){
 clearTimeout(lookupTimer);
 if(controller){controller.abort();controller=null;}
 ++requestNumber;pending=false;
}
async function lookup(query,version){
 const stop=new AbortController();controller=stop;pending=true;
 const timeout=setTimeout(()=>stop.abort(),9000);
 try{
  const results=await searchWikipedia(query,{signal:stop.signal});
  if(version!==requestNumber||!isDictionary()||cleanQuery(byId('psyDictionaryQuery').value)!==query)return;
  pending=false;active=results;statusText='';remember(query,results);renderResults(results);
 }catch(error){
  if(version!==requestNumber||!isDictionary())return;
  pending=false;
  if(error?.name==='AbortError'&&cleanQuery(byId('psyDictionaryQuery').value)!==query)return;
  statusText=error?.name==='AbortError'?'Search timed out. Check your connection and try again.':error.message||'Online lookup failed.';
  const node=byId('psyOnlineResults');
  if(node)node.innerHTML='<div class="psy-online-message">'+safe(statusText)+'</div><button type="button" class="psy-online-retry" id="psyOnlineRetry">Try again</button>';
 }finally{
  clearTimeout(timeout);
  if(controller===stop)controller=null;
 }
}
function syncQuery(force=false){
 const block=byId('psyOnlineBlock'),input=byId('psyDictionaryQuery');
 if(!block||!input)return;
 const q=cleanQuery(input.value);
 if(bookmarkedFilter()||q.length<2){
  block.hidden=true;currentQuery='';active=null;statusText='';
  cancelLookup();return;
 }
 block.hidden=false;
 if(!force&&q===currentQuery){
  if(active)renderResults(active);
  else if(pending)show('Searching Wikipedia for “'+q+'”…');
  else if(statusText)show(statusText);
  return;
 }
 currentQuery=q;active=null;statusText='';
 cancelLookup();
 const stored=!force?cached(q):null;
 if(stored){active=stored;renderResults(stored);return;}
 show('Searching Wikipedia for “'+q+'”…');
 const version=requestNumber;
 lookupTimer=setTimeout(()=>{if(version===requestNumber)void lookup(q,version);},force?0:550);
}
function openResult(id){
 const row=active?.find(v=>v.id===id);if(!row)return;
 selected=row;
 const detail=byId('psyDefinitionDetail');if(!detail)return;
 detail.innerHTML='<article class="psy-detail psy-online-detail">'+
  '<div class="psy-detail-overline">ONLINE LOOKUP / WIKIPEDIA</div>'+
  '<h2>'+safe(row.term)+'</h2>'+
  '<h3>Reference summary</h3><p class="psy-definition">'+safe(row.definition)+'</p>'+
  '<a class="psy-source" href="'+safe(row.source)+'" target="_blank" rel="noopener noreferrer">Read original article ↗</a>'+
  '<p class="psy-online-credit">Source: Wikipedia contributors. Text shared under <a href="'+LICENSE+'" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>. Verify important definitions against academic sources.</p>'+
  '<div class="psy-detail-actions">'+
  '<button type="button" data-online-action="save">Save to dictionary</button>'+
  '<button type="button" data-online-action="note">Save as note</button>'+
  '<button type="button" data-online-action="flashcard">Make flashcard</button>'+
  '</div><p class="psy-online-storage">Dictionary saves stay on this device. Notes and flashcards use your existing account sync.</p></article>';
}
function saveNote(row){
 const d=core.getData(),stamp=new Date().toISOString();
 d.notes=Array.isArray(d.notes)?d.notes:[];
 d.notes.unshift({
  id:core.id(),title:row.term,
  body:row.definition+'\n\nSource: '+row.source+'\nAttribution: Wikipedia contributors (CC BY-SA 4.0)',
  tags:'psychology-dictionary',subjectId:'',createdAt:stamp,updatedAt:stamp
 });
 core.save();core.toast('Saved to your notebook.');
}
function saveFlashcard(row){
 const d=core.getData(),question='Define '+row.term+'.';
 d.cards=Array.isArray(d.cards)?d.cards:[];
 if(d.cards.some(card=>card.question?.toLocaleLowerCase()===question.toLocaleLowerCase())){
  core.toast('Already in your flashcards.');return;
 }
 d.cards.push({
  id:core.id(),question,
  answer:(row.definition+'\nSource: '+row.source).slice(0,1500),
  subjectId:'',due:core.today(),interval:0,reps:0
 });
 core.save();core.toast('Flashcard saved for review.');
}
async function action(name){
 const row=selected;
 if(!row||saveBusy)return;
 if(name==='note'){saveNote(row);return;}
 if(name==='flashcard'){saveFlashcard(row);return;}
 if(name!=='save')return;
 if(!window.PsychDeskDictionaryPacks?.saveTerm){
  core.toast('Local dictionary storage is unavailable.');return;
 }
 saveBusy=true;
 try{
  const result=await window.PsychDeskDictionaryPacks.saveTerm({
   term:row.term,definition:row.definition,category:'Other',source:row.source,example:''
  });
  if(result.reason==='already-curated')core.toast('Already in your built-in dictionary.');
  else{
   core.toast('Saved to your device dictionary.');
   void window.PsychDeskDictionaryPacks.mount?.();
  }
 }catch(error){core.toast('Could not save: '+(error.message||'Storage error'));}
 finally{saveBusy=false;}
}
document.addEventListener('input',event=>{
 if(event.target?.id==='psyDictionaryQuery')syncQuery();
});
document.addEventListener('click',event=>{
 const item=event.target.closest('[data-online-id]');
 if(item){event.preventDefault();openResult(Number(item.dataset.onlineId));return;}
 const btn=event.target.closest('[data-online-action]');
 if(btn){event.preventDefault();void action(btn.dataset.onlineAction);return;}
 if(event.target.closest('#psyOnlineRetry')){event.preventDefault();syncQuery(true);return;}
 // The original dictionary recreates its DOM for category and bookmark filters.
 if(event.target.closest('[data-psy="category"],[data-psy="toggleSaved"],[data-psy="deleteTerm"],[data-psy="addTerm"]')){
  setTimeout(mount,0);
 }
});
window.addEventListener('psychdesk:tab-changed',()=>setTimeout(mount,0));
window.PsychDeskOnDemand={searchWikipedia,parseResults,articleURL,mount,cleanQuery};
})();