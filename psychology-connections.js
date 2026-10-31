/* Non-destructive links inferred from the student's own existing study content. */
(()=>{'use strict';
const core=window.PsychDeskCore;if(!core)return;
const h=core.esc, data=()=>core.getData();
const safe=v=>h(String(v??''));
const lower=v=>String(v||'').toLocaleLowerCase().replace(/\s+/g,' ').trim();
const contains=(text,term)=>{
 const t=lower(term),s=lower(text);
 if(t.length<4||!s.includes(t))return false;
 const i=s.indexOf(t);
 return i>=0 && (!i||!/[a-z0-9]/i.test(s[i-1])) && (i+t.length===s.length||!/[a-z0-9]/i.test(s[i+t.length]));
};
function matchesFor(term){
 const d=data(),limit=6;
 const notes=(d.notes||[]).filter(n=>contains((n.title||'')+' '+(n.body||''),term)).slice(0,limit);
 const references=(d.research||[]).filter(r=>contains((r.title||'')+' '+(r.notes||'')+' '+(r.keywords||''),term)).slice(0,limit);
 const timeline=window.PsychDeskKnowledge?.history?.().filter(e=>contains(e.title+' '+e.description,term)).slice(0,limit)||[];
 const maps=(d.mindMaps||[]).filter(m=>contains(m.title+' '+(m.nodes||[]).map(n=>n.label||'').join(' '),term)).slice(0,limit);
 return {notes,references,timeline,maps};
}
function pills(label,items,kind,text){
 if(!items.length)return '';
 return '<div class="psy-link-group"><span>'+safe(label)+'</span><div class="psy-link-pills">'+items.map(v=>
  '<button type="button" data-connection="'+kind+'" data-id="'+safe(v.id)+'">'+safe(text(v))+'</button>'
 ).join('')+'</div></div>';
}
function forConcept(entry){
 if(!entry)return '';
 const m=matchesFor(entry.term);
 const body=pills('Your notes',m.notes,'note',n=>n.title||'Untitled note')+
  pills('Saved research',m.references,'reference',r=>r.title||'Untitled reference')+
  pills('Timeline events',m.timeline,'event',e=>e.title)+
  pills('Your mind maps',m.maps,'map',m=>m.title||'Untitled map');
 return '<section class="psy-linked-section"><h3>Connected in your PsychDesk</h3>'+
  (body||'<p class="psy-links-empty">No linked notes or research yet. Connections appear automatically when the same concept is mentioned.</p>')+
  '</section>';
}
function relatedTerms(input,limit=9){
 const text=String(input||'').slice(0,16000),entries=window.PsychDeskKnowledge?.glossary?.()||[];
 const seen=new Set();
 return entries.filter(term=>{
  if(seen.has(lower(term.term))||!contains(text,term.term))return false;
  seen.add(lower(term.term));return true;
 }).sort((a,b)=>b.term.length-a.term.length).slice(0,limit);
}
function forNote(note){
 const related=relatedTerms((note?.title||'')+' '+(note?.body||''));
 return '<section class="psy-note-connections"><strong>Concepts found in this note</strong><div class="psy-link-pills">'+
 (related.length?related.map(e=>'<button type="button" data-connection="term" data-id="'+safe(e.id)+'">'+safe(e.term)+'</button>').join(''):
 '<span class="psy-links-empty">Write about a concept to see matching dictionary entries.</span>')+
 '</div></section>';
}
let timer;
document.addEventListener('input',event=>{
 if(event.target?.closest('#noteForm')&&['body','title'].includes(event.target.name)){
  clearTimeout(timer);
  const form=event.target.closest('#noteForm');
  timer=setTimeout(()=>{
   if(!form.isConnected)return;
   const area=document.getElementById('noteConceptLinks');if(!area)return;
   area.innerHTML=forNote({title:form.elements.title.value,body:form.elements.body.value});
  },450);
 }
});
document.addEventListener('click',event=>{
 const item=event.target.closest('[data-connection]');if(!item)return;
 event.preventDefault();
 const kind=item.dataset.connection,id=item.dataset.id;
 if(kind==='term'){window.PsychDeskKnowledge?.openTerm?.(id);core.closeModal();return;}
 if(kind==='event'){window.PsychDeskKnowledge?.openEvent?.(id);core.closeModal();return;}
 if(kind==='note'){
  const note=(data().notes||[]).find(n=>n.id===id);
  if(note){core.closeModal();core.setTab('notes');window.PsychDeskCloud?.noteEditor?.(note);}
  return;
 }
 if(kind==='reference'){core.closeModal();core.setTab('research');core.toast('Research Shelf opened. Find the linked paper by title.');return;}
 if(kind==='map'){
  const selector=document.getElementById('mindMapSelect');
  core.closeModal();core.setTab('mindmap');
  const target=document.getElementById('mindMapSelect');
  if(target){target.value=id;target.dispatchEvent(new Event('change',{bubbles:true}));}
 }
});
window.PsychDeskConnections={forConcept,forNote,relatedTerms,matchesFor,contains};
})();