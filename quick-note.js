/* PsychDesk Quick Note — one calm writing field; save as a note or sticky. */
(()=>{'use strict';
const core=window.PsychDeskCore;if(!core)return;
const $=s=>document.querySelector(s),esc=core.esc,LIMIT=4500;
const uid=()=>window.PsychDeskFirebase?.getUserId?.()||'guest';
const draftKey=()=>'psychdesk-quick-note-draft-'+uid();
const lastingKey=()=>'psychdesk-quick-note-v2:'+core.getStorageKey();
const readDraft=()=>{
 try{const v=JSON.parse(localStorage.getItem(lastingKey())||'null');if(v&&typeof v==='object')return v;}catch{}
 try{const v=JSON.parse(sessionStorage.getItem(draftKey())||'null');return v&&typeof v==='object'?v:{};}catch{return {}}
};
function remember(){
 const text=$('#quickNoteText'),title=$('#quickNoteTitle'),subject=$('#quickNoteSubject');
 if(!text)return;
 const payload=JSON.stringify({text:text.value.slice(0,LIMIT),title:title?.value?.slice(0,140)||'',subjectId:subject?.value||''});
 let lasting=false,temporary=false;
 try{localStorage.setItem(lastingKey(),payload);lasting=true;}catch{}
 try{sessionStorage.setItem(draftKey(),payload);temporary=true;}catch{}
 const state=$('#quickDraftStatus');
 if(state)state.textContent=lasting?'Draft saved on this device until you save.':temporary?'Draft kept in this tab until saved.':'Draft storage is unavailable. Copy your writing before leaving.';
}
function open(){
 const draft=readDraft();
 const subjects=core.getData().subjects.map(s=>'<option value="'+esc(s.id)+'"'+(draft.subjectId===s.id?' selected':'')+'>'+esc(s.name)+'</option>').join('');
 const markup='<div class="quick-capture"><div class="quick-capture-heading"><span>JUST WRITE</span><p>One thought is enough. No titles, tags or setup required.</p></div>'+
 '<textarea id="quickNoteText" maxlength="'+LIMIT+'" rows="9" placeholder="What did you learn today? Type or paste anything here…" aria-label="Your quick note">'+esc(draft.text||'')+'</textarea><div id="quickNoteAssist" class="quick-note-assist" role="status" aria-live="polite" hidden></div>'+
 '<details class="quick-more"><summary>Optional details</summary><label>Title<input id="quickNoteTitle" maxlength="140" placeholder="We will create one for you" value="'+esc(draft.title||'')+'"></label>'+
 '<label>Subject<select id="quickNoteSubject"><option value="">General</option>'+subjects+'</select></label></details>'+
 '<p class="quick-draft-status" id="quickDraftStatus" role="status">Your draft stays on this device until you save.</p>'+
 '<div class="quick-choices"><button type="button" class="primary" data-quick="note">Save to Notebook</button><button type="button" class="secondary" data-quick="sticky">Make a Sticky</button></div>'+
 '<p class="quick-privacy">Your writing joins your existing study data when you save. No AI or additional setup.</p></div>';
 core.openModal('Quick note',markup);
 $('#quickNoteText')?.focus();refreshAssist();
}
function titleFrom(text){
 const line=text.trim().split(/\n/).find(v=>v.trim())||'Quick thought';
 const value=line.trim().replace(/^(?:[-*•]\s+)/,'');
 return value.length>72?value.slice(0,69).replace(/\s+\S*$/,'')+'…':value;
}
// On-device suggestions are opt-in; never move a note without the student's choice.
const wordSet=value=>new Set((String(value||'').toLowerCase().match(/[a-z]{4,}/g)||[]));
const weakWords=new Set(['psychology','psychological','studies','study','general','introduction','chapter','notes']);
const hints={
 cognitive:['memory','attention','perception','cognition','thinking','schema'],
 biological:['brain','neuron','synapse','hormone','neuroscience'],
 developmental:['piaget','vygotsky','childhood','adolescence','lifespan','attachment'],
 social:['conformity','prejudice','attitude','groupthink','persuasion'],
 research:['statistics','anova','sampling','regression','hypothesis','validity','reliability']
};
function suggestSubject(text,subjects=[],notes=[]){
 const words=wordSet(text);if(!words.size)return null;
 const scored=subjects.filter(s=>s?.id&&s?.name).map(subject=>{
  const nameWords=[...wordSet(subject.name)].filter(w=>!weakWords.has(w));
  let score=nameWords.reduce((n,w)=>n+(words.has(w)?4:0),0);
  const label=String(subject.name).toLowerCase();
  for(const [key,values] of Object.entries(hints))
   if(label.includes(key))score+=values.reduce((n,w)=>n+(words.has(w)?3:0),0);
  const candidates=notes.filter(n=>n.subjectId===subject.id).slice(-80);
  for(const note of candidates){
   const existing=wordSet(String(note.title||'')+' '+String(note.body||'').slice(0,800));
   let shared=0;for(const w of words)if(!weakWords.has(w)&&existing.has(w))shared++;
   if(shared>=2)score+=Math.min(shared,3);
  }
  return {subjectId:subject.id,name:subject.name,score};
 }).sort((a,b)=>b.score-a.score);
 return scored[0]?.score>=3?scored[0]:null;
}
function refreshAssist(){
 const panel=$('#quickNoteAssist'),editor=$('#quickNoteText');if(!panel||!editor)return;
 const text=editor.value.trim(),d=core.getData(),selected=$('#quickNoteSubject')?.value||'';
 const match=selected?null:suggestSubject(text,d.subjects||[],d.notes||[]);
 const duplicate=text.length>=40&&(d.notes||[]).some(n=>String(n.body||'').trim().toLowerCase()===text.toLowerCase());
 const parts=[];
 if(match)parts.push('<div><span>Possible subject: <strong>'+esc(match.name)+'</strong></span> <button type="button" data-quick-subject="'+esc(match.subjectId)+'">Use subject</button></div>');
 if(duplicate)parts.push('<p>A matching note is already in your notebook. You can still save this one.</p>');
 panel.innerHTML=parts.join('');panel.hidden=parts.length===0;
}
function submit(sticky){
 const text=String($('#quickNoteText')?.value||'').trim(),custom=String($('#quickNoteTitle')?.value||'').trim(),subjectId=String($('#quickNoteSubject')?.value||'');
 if(!text){core.toast('Write a thought first.');$('#quickNoteText')?.focus();return;}
 const title=custom||titleFrom(text),d=core.getData();
 const field=sticky?'stickies':'notes',previous=Array.isArray(d[field])?d[field].slice():[];
 if(sticky){
  const pages=window.PsychDeskStickies?.generate?.(text,title,subjectId,'cream',core.id(),[]);
  if(!pages?.length){core.toast('Could not create a sticky. Try again.');return;}
  d.stickies=[...previous,...pages];
 }else{
  const now=new Date().toISOString();
  d.notes=[{id:core.id(),title:title.slice(0,140),body:text,tags:'',subjectId,createdAt:now,updatedAt:now},...previous];
 }
 if(core.save()===false){
  d[field]=previous;remember();
  core.toast('Save failed. Your quick-note draft is still available here.');
  return;
 }
 try{sessionStorage.removeItem(draftKey())}catch{}
 try{localStorage.removeItem(lastingKey())}catch{}
 core.closeModal();core.render();core.toast(sticky?'Sticky saved to your wall':'Note saved to your notebook');
}
document.addEventListener('click',e=>{
 if(e.target.closest('#quickNoteBtn')){e.preventDefault();open();return;}
 const subjectChoice=e.target.closest('[data-quick-subject]');
 if(subjectChoice){e.preventDefault();const field=$('#quickNoteSubject');if(field&&(core.getData().subjects||[]).some(s=>s.id===subjectChoice.dataset.quickSubject)){field.value=subjectChoice.dataset.quickSubject;remember();refreshAssist();}return;}
 const action=e.target.closest('[data-quick]')?.dataset.quick;
 if(action==='note'){e.preventDefault();submit(false);}
 if(action==='sticky'){e.preventDefault();submit(true);}
});
document.addEventListener('input',e=>{if(['quickNoteText','quickNoteTitle'].includes(e.target.id))remember();if(e.target.id==='quickNoteText')refreshAssist();});
document.addEventListener('change',e=>{if(e.target.id==='quickNoteSubject'){remember();refreshAssist();}});
window.PsychDeskQuickNote={open,titleFrom,suggestSubject};
})();
