/* PsychDesk Quick Note — one calm writing field; save as a note or sticky. */
(()=>{'use strict';
const core=window.PsychDeskCore;if(!core)return;
const $=s=>document.querySelector(s),esc=core.esc,LIMIT=4500;
const uid=()=>window.PsychDeskFirebase?.getUserId?.()||'guest';
const draftKey=()=>'psychdesk-quick-note-draft-'+uid();
const readDraft=()=>{try{const v=JSON.parse(sessionStorage.getItem(draftKey())||'null');return v&&typeof v==='object'?v:{}}catch{return {}}};
function remember(){
 const text=$('#quickNoteText'),title=$('#quickNoteTitle'),subject=$('#quickNoteSubject');
 if(!text)return;
 try{sessionStorage.setItem(draftKey(),JSON.stringify({text:text.value.slice(0,LIMIT),title:title?.value?.slice(0,140)||'',subjectId:subject?.value||''}));}catch{}
 const state=$('#quickDraftStatus');if(state)state.textContent='Draft kept in this tab until saved.';
}
function open(){
 const draft=readDraft();
 const subjects=core.getData().subjects.map(s=>'<option value="'+esc(s.id)+'"'+(draft.subjectId===s.id?' selected':'')+'>'+esc(s.name)+'</option>').join('');
 const markup='<div class="quick-capture"><div class="quick-capture-heading"><span>JUST WRITE</span><p>One thought is enough. No titles, tags or setup required.</p></div>'+
 '<textarea id="quickNoteText" maxlength="'+LIMIT+'" rows="9" placeholder="What did you learn today? Type or paste anything here…" aria-label="Your quick note">'+esc(draft.text||'')+'</textarea>'+
 '<details class="quick-more"><summary>Optional details</summary><label>Title<input id="quickNoteTitle" maxlength="140" placeholder="We will create one for you" value="'+esc(draft.title||'')+'"></label>'+
 '<label>Subject<select id="quickNoteSubject"><option value="">General</option>'+subjects+'</select></label></details>'+
 '<p class="quick-draft-status" id="quickDraftStatus" role="status">Draft stays in this tab if you close the window.</p>'+
 '<div class="quick-choices"><button type="button" class="primary" data-quick="note">Save to Notebook</button><button type="button" class="secondary" data-quick="sticky">Make a Sticky</button></div>'+
 '<p class="quick-privacy">Your writing joins your existing study data when you save. No AI or additional setup.</p></div>';
 core.openModal('Quick note',markup);
 $('#quickNoteText')?.focus();
}
function titleFrom(text){
 const line=text.trim().split(/\n/).find(v=>v.trim())||'Quick thought';
 const value=line.trim().replace(/^(?:[-*•]\s+)/,'');
 return value.length>72?value.slice(0,69).replace(/\s+\S*$/,'')+'…':value;
}
function submit(sticky){
 const text=String($('#quickNoteText')?.value||'').trim(),custom=String($('#quickNoteTitle')?.value||'').trim(),subjectId=String($('#quickNoteSubject')?.value||'');
 if(!text){core.toast('Write a thought first.');$('#quickNoteText')?.focus();return;}
 const title=custom||titleFrom(text),d=core.getData();
 if(sticky){
  const pages=window.PsychDeskStickies?.generate?.(text,title,subjectId,'cream',core.id(),[]);
  if(!pages?.length){core.toast('Could not create a sticky. Try again.');return;}
  d.stickies ||= [];d.stickies.push(...pages);
 }else{
  d.notes ||= [];
  const now=new Date().toISOString();
  d.notes.unshift({id:core.id(),title:title.slice(0,140),body:text,tags:'',subjectId,createdAt:now,updatedAt:now});
 }
 core.save();
 try{sessionStorage.removeItem(draftKey())}catch{}
 core.closeModal();core.toast(sticky?'Sticky saved to your wall':'Note saved to your notebook');
}
document.addEventListener('click',e=>{
 if(e.target.closest('#quickNoteBtn')){e.preventDefault();open();return;}
 const action=e.target.closest('[data-quick]')?.dataset.quick;
 if(action==='note'){e.preventDefault();submit(false);}
 if(action==='sticky'){e.preventDefault();submit(true);}
});
document.addEventListener('input',e=>{if(['quickNoteText','quickNoteTitle'].includes(e.target.id))remember()});
document.addEventListener('change',e=>{if(e.target.id==='quickNoteSubject')remember()});
window.PsychDeskQuickNote={open,titleFrom};
})();