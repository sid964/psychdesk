/* Academic research discovery: deliberate requests only, no background crawling. */
(()=>{'use strict';
const core=window.PsychDeskCore;if(!core)return;
const h=v=>core.esc(String(v??'')),byId=id=>document.getElementById(id);
const toText=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const queryText=s=>String(s||'').normalize('NFKC').trim().replace(/\s+/g,' ').slice(0,120);
const doiValue=s=>String(s||'').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'').trim().slice(0,190);
const safeLink=(link)=>{try{const u=new URL(link);return u.protocol==='https:'?u.href:'';}catch{return''}};
let controller=null,sequence=0,records=[],lastQuery='',working=false;
async function getJSON(url,signal,fetchImpl=fetch){
 const response=await fetchImpl(url,{signal,credentials:'omit'});
 if(!response.ok)throw Error('HTTP '+response.status);
 return response.json();
}
async function europePMC(query,{signal,fetchImpl=fetch}={}){
 const url=new URL('https://www.ebi.ac.uk/europepmc/webservices/rest/search');
 for(const [k,v] of Object.entries({query,format:'json',resultType:'core',pageSize:'5'}))url.searchParams.set(k,v);
 const data=await getJSON(url.toString(),signal,fetchImpl);
 return (data?.resultList?.result||[]).map(p=>{
  const id=String(p.id||'');
  const doi=doiValue(p.doi);
  const headings=(p.meshHeadingList?.meshHeading||[]).slice(0,6).map(x=>toText(x.descriptorName||x.descriptor?.descriptorName||'')).filter(Boolean);
  return {
   id:'europe:'+String(p.source||'')+':'+id,
   title:toText(p.title).slice(0,250),authors:toText(p.authorString).slice(0,260),
   year:Number(p.pubYear)||null,doi,journal:toText(p.journalTitle||p.journalInfo?.journal?.title).slice(0,180),
   abstract:toText(p.abstractText).slice(0,420),meshHeadings:headings,provider:'Europe PMC',
   url:doi?safeLink('https://doi.org/'+encodeURIComponent(doi)):safeLink('https://europepmc.org/article/'+encodeURIComponent(p.source||'MED')+'/'+encodeURIComponent(id))
  };
 }).filter(r=>r.title&&r.url);
}
async function openAlex(query,{signal,fetchImpl=fetch}={}){
 const url=new URL('https://api.openalex.org/works');
 url.searchParams.set('search',query);
 url.searchParams.set('per_page','5');
 // Public unauthenticated access is rate-limited. Europe PMC remains available if it fails.
 const data=await getJSON(url.toString(),signal,fetchImpl);
 return (data?.results||[]).map(p=>{
  const doi=doiValue(p.doi),authors=(p.authorships||[]).slice(0,6).map(a=>a.author?.display_name).filter(Boolean).join(', ');
  const publisher=safeLink(String(p.id||''));
  return {
   id:'openalex:'+String(p.id||''),
   title:toText(p.display_name||p.title).slice(0,250),
   authors:toText(authors).slice(0,260),year:Number(p.publication_year)||null,doi,
   journal:toText(p.primary_location?.source?.display_name).slice(0,180),abstract:'',
   provider:'OpenAlex',url:doi?safeLink('https://doi.org/'+encodeURIComponent(doi)):publisher
  };
 }).filter(r=>r.title&&r.url);
}
function dedupe(rows){
 const set=new Set();
 return rows.filter(row=>{
  const key=row.doi?'doi:'+row.doi.toLowerCase():'title:'+row.title.toLocaleLowerCase();
  if(set.has(key))return false;
  set.add(key);return true;
 }).slice(0,10);
}
function html(){
 return '<section class="psy-academic-panel" id="psyAcademicPanel">'+
 '<div class="psy-academic-head"><div><strong>ACADEMIC RESEARCH</strong><p>Find published studies related to a concept. No setup required.</p></div>'+
 '<button type="button" id="psyAcademicSearch" class="secondary">Find research</button></div>'+
 '<p class="psy-academic-small">Searches Europe PMC and OpenAlex when you tap. Results are papers, not verified definitions. Search phrases go to these public services.</p>'+
 '<div id="psyAcademicResults" aria-live="polite"></div></section>';
}
function mount(){
 const target=byId('psyDictionaryResults');
 if(target&&!byId('psyAcademicPanel'))target.insertAdjacentHTML('afterend',html());
}
function render(items){
 const area=byId('psyAcademicResults');if(!area)return;
 if(!items.length){area.innerHTML='<p class="psy-academic-small">No papers found. Try a broader psychological concept.</p>';return;}
 area.innerHTML='<div class="psy-academic-count">'+items.length+' source-linked papers</div>'+
 items.map((r,i)=>'<article class="psy-academic-paper">'+
  '<small>'+h(r.provider)+' · '+h(r.year||'Date unknown')+(r.journal?' · '+h(r.journal):'')+'</small>'+
  '<strong>'+h(r.title)+'</strong>'+
  (r.authors?'<p>'+h(r.authors)+'</p>':'')+
  (r.abstract?'<p class="psy-academic-abstract">'+h(r.abstract)+(r.abstract.length===420?'…':'')+'</p>':'')+
  (r.meshHeadings?.length?'<small>Indexed MeSH topics: '+h(r.meshHeadings.join(', '))+'</small>':'')+
  '<div class="psy-academic-actions"><a href="'+h(r.url)+'" target="_blank" rel="noopener noreferrer">Open paper ↗</a>'+
  '<button type="button" data-academic-save="'+i+'">Save to Reference Manager</button></div></article>'
 ).join('');
}
async function search(){
 const input=byId('psyDictionaryQuery'),area=byId('psyAcademicResults');
 if(!input||!area)return;
 const q=queryText(input.value);
 if(q.length<3){area.textContent='Enter a concept with at least three characters first.';return;}
 if(controller)controller.abort();
 controller=new AbortController();const signal=controller.signal,version=++sequence;
 const timeout=setTimeout(()=>controller?.abort(),10000);
 records=[];lastQuery=q;working=true;
 area.textContent='Searching academic publications for “'+q+'”…';
 const button=byId('psyAcademicSearch');if(button)button.disabled=true;
 try{
  const responses=await Promise.allSettled([europePMC(q,{signal}),openAlex(q,{signal})]);
  if(sequence!==version||!byId('psyAcademicResults'))return;
  records=dedupe(responses.filter(r=>r.status==='fulfilled').flatMap(r=>r.value));
  render(records);
  if(!records.length&&responses.every(r=>r.status==='rejected')){
   area.textContent='Academic services are unavailable right now. Try again later. Your saved study data is unaffected.';
  }
 }finally{
  clearTimeout(timeout);
  if(sequence===version){working=false;controller=null;const btn=byId('psyAcademicSearch');if(btn)btn.disabled=false;}
 }
}
function save(index){
 const record=records[index];if(!record)return;
 const q=queryText(byId('psyDictionaryQuery')?.value);
 if(q!==lastQuery){core.toast('Search again for the current concept first.');return;}
 const data=core.getData();
 data.research=Array.isArray(data.research)?data.research:[];
 if(data.research.some(r=>(record.doi&&doiValue(r.doi).toLowerCase()===record.doi.toLowerCase())||String(r.title||'').trim().toLowerCase()===record.title.trim().toLowerCase())){
  core.toast('That reference is already in your Research Shelf.');return;
 }
 const now=new Date().toISOString();
 data.research.push({id:core.id(),title:record.title,authors:record.authors,year:record.year,
  journal:record.journal,doi:record.doi,url:record.url,notes:'Source: '+record.provider+'. Review the original article before citing.',
  type:'journal',subjectId:'',createdAt:now,updatedAt:now});
 core.save();core.toast('Paper saved to Reference Manager.');
}
document.addEventListener('click',event=>{
 if(event.target.closest('#psyAcademicSearch')){event.preventDefault();void search();return;}
 const saveButton=event.target.closest('[data-academic-save]');
 if(saveButton){event.preventDefault();save(Number(saveButton.dataset.academicSave));}
});
document.addEventListener('input',event=>{
 if(event.target?.id!=='psyDictionaryQuery')return;
 if(controller){controller.abort();controller=null;++sequence;working=false;const btn=byId('psyAcademicSearch');if(btn)btn.disabled=false;}
 const area=byId('psyAcademicResults');
 if(area&&lastQuery&&queryText(event.target.value)!==lastQuery){area.textContent='Tap Find research to search for the new concept.';records=[];}
});
window.addEventListener('psychdesk:tab-changed',()=>setTimeout(mount,0));
window.PsychDeskAcademic={mount,europePMC,openAlex,dedupe,doiValue,queryText};
})();