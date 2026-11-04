/* PsychDesk Phase 2: temporary, local chapter preparation.
   Never sends source text to a server or places it in synced study records. */
(()=>{'use strict';
const core=window.PsychDeskCore;if(!core)return;
const $=s=>document.querySelector(s),h=core.esc;
let active=0,pending=null;
const MAX_TEXT=42000,MAX_OUTLINE=7000,MAX_CARDS=16,MAX_SNAPSHOT=710000;
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const uniqueTitle=s=>String(s||'Untitled chapter').slice(0,130);
function outlineFrom(result){
 const items=[...result.outline.slice(0,18).map(x=>'# '+x),...result.terms.slice(0,16).map(x=>'- Term: '+x),...result.questions.slice(0,12).map(x=>'- Question: '+x)];
 return [...new Set(items)].join('\n').slice(0,MAX_OUTLINE);
}
function sourceDetails(source){
 const a=Number(source.pageStart),b=Number(source.pageEnd);
 return a>0&&b>=a?'Pages '+a+'–'+b:'Text/Markdown';
}
async function prepare(source){
 const owner=core.getStorageKey(),ticket=++active;
 pending=null;
 const title=uniqueTitle(source?.title),text=String(source?.text||'').trim();
 if(!text){core.toast('There is no selectable chapter text to prepare.');return false;}
 if(text.length>MAX_TEXT)core.toast('Preparing the first '+MAX_TEXT.toLocaleString()+' characters of this selection.');
 const engine=window.PsychDeskAutopilot?.analyze;
 if(!engine){core.toast('Local chapter preparation is unavailable. Try refreshing PsychDesk.');return false;}
 try{
  const result=await engine({
   id:'manual:'+ticket,revision:'manual',title,text:text.slice(0,MAX_TEXT),
   subjects:(core.getData().subjects||[]).map(x=>({id:x.id,name:x.name}))
  });
  if(ticket!==active||core.getStorageKey()!==owner)return false;
  const outline=outlineFrom(result),cards=(result.cards||[]).slice(0,MAX_CARDS);
  const eligible=core.getData().subjects||[];
  const suggested=eligible.some(s=>s.id===result.suggestion?.subjectId)?result.suggestion.subjectId:'';
  const fixed=eligible.some(s=>s.id===source.subjectId)?source.subjectId:suggested;
  const metadata={
   title,materialId:typeof source.materialId==='string'?source.materialId.slice(0,180):'',
   pageStart:Number(source.pageStart)||0,pageEnd:Number(source.pageEnd)||0,
   origin:String(source.origin||'local-document').slice(0,36)
  };
  pending={ticket,owner,metadata,cards,outline,fixed};
  const description=h(sourceDetails(metadata));
  core.openModal('Prepare this chapter',
   '<div class="phase2-preparation"><p class="phase2-kicker">LOCAL · SOURCE-BASED STUDY PREPARATION</p>'+
   '<h3>'+h(title)+'</h3><p class="note">'+description+' · Source text stays in the browser. Nothing is saved until you approve it.</p>'+
   '<label for="phase2Subject">Save under subject (optional)</label><select id="phase2Subject">'+
   '<option value="">General / unassigned</option>'+eligible.map(s=>'<option value="'+h(s.id)+'"'+(s.id===fixed?' selected':'')+'>'+h(s.name)+'</option>').join('')+'</select>'+
   '<label for="phase2Outline">Editable chapter outline</label><textarea id="phase2Outline" rows="7" maxlength="'+MAX_OUTLINE+'" spellcheck="false" placeholder="No headings or questions were detected; write your own if useful.">'+h(outline)+'</textarea>'+
   '<div class="phase2-cards"><h4>Flashcards from explicit definitions <small>('+cards.length+')</small></h4>'+
   (cards.length?cards.map((c,i)=>'<label class="phase2-card"><input type="checkbox" data-phase2-card="'+i+'" checked><span><strong>'+h(c.question)+'</strong><small>'+h(c.answer)+'</small></span></label>').join(''):
    '<p class="note">No clear definition statements were found. No cards were invented.</p>')+'</div>'+
   '<p class="note">Only the outline and checked flashcards will be added to your existing synced study data. Review their accuracy before saving.</p>'+
   '<button type="button" class="primary phase2-save" data-phase2="approve">Save selected study material</button></div>');
  return true;
 }catch(err){
  if(ticket===active&&core.getStorageKey()===owner)core.toast('Could not prepare this chapter: '+String(err?.message||err).slice(0,90));
  return false;
 }
}
function approve(){
 const job=pending;
 if(!job||job.ticket!==active||job.owner!==core.getStorageKey()){
  core.toast('This preview is no longer valid. Prepare the chapter again.');return false;
 }
 const outline=String($('#phase2Outline')?.value||'').trim().slice(0,MAX_OUTLINE);
 const selected=[...document.querySelectorAll('[data-phase2-card]:checked')].map(x=>Number(x.dataset.phase2Card))
  .filter(i=>Number.isInteger(i)&&i>=0&&i<job.cards.length);
 if(!outline&&!selected.length){core.toast('Select at least one card or write an outline.');return false;}
 const subject=String($('#phase2Subject')?.value||'');
 if(subject&&!(core.getData().subjects||[]).some(x=>x.id===subject)){
  core.toast('The chosen subject is no longer available.');return false;
 }
 const existingNotes=core.getData().notes||[];
 const original=job.metadata;
 // Duplicate protection: the same source selection cannot silently create multiple outlines.
 const dup=existingNotes.some(x=>x.derivedKind==='prepared-chapter'&&
  x.sourceInfo?.origin===original.origin&&x.sourceInfo?.materialId===original.materialId&&
  x.sourceInfo?.originalName===original.title&&x.sourceInfo?.pageStart===original.pageStart&&x.sourceInfo?.pageEnd===original.pageEnd&&
  x.body===outline);
 let addedCards=0,addedOutline=0;
 const ok=core.commitChange(d=>{
  if(outline&&!dup){
   const now=new Date().toISOString();
   d.notes.unshift({id:core.id(),title:'Chapter outline · '+original.title,body:outline,subjectId:subject,tags:'study-outline',
    createdAt:now,updatedAt:now,derivedKind:'prepared-chapter',
    sourceInfo:{kind:'chapter-preparation',origin:original.origin,originalName:original.title,materialId:original.materialId,pageStart:original.pageStart,pageEnd:original.pageEnd}});
   addedOutline=1;
  }
  const questions=new Set((d.cards||[]).map(c=>clean(c.question).toLowerCase()));
  for(const i of selected){
   const c=job.cards[i],k=clean(c.question).toLowerCase();
   if(!c.question||!c.answer||questions.has(k))continue;
   questions.add(k);
   d.cards.push({id:core.id(),question:c.question.slice(0,500),answer:c.answer.slice(0,1500),subjectId:subject,
    due:core.today(),interval:0,reps:0,sourceKind:'chapter-preparation',sourceTitle:original.title,
    sourceMaterialId:original.materialId,sourcePageStart:original.pageStart,sourcePageEnd:original.pageEnd});
   addedCards++;
  }
  // Keep Firestore snapshots within the existing sync safety envelope.
  const bytes=new TextEncoder().encode(JSON.stringify(d)).byteLength;
  if(bytes>MAX_SNAPSHOT)throw Error('Your synced study record is nearing its size limit. Export your data or save fewer items.');
 });
 if(!ok){core.toast('Nothing was saved. Your original document and preview are unchanged.');return false;}
 pending=null;active++;core.closeModal();core.render();
 core.toast(addedOutline+' outline and '+addedCards+' flashcards saved.');
 return true;
}
document.addEventListener('click',e=>{
 if(e.target.closest('[data-phase2="approve"]')){e.preventDefault();approve();}
});
window.PsychDeskPreparation={prepare};
})();
