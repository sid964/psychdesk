/* Phase 7: transparent knowledge gaps from existing flashcard review history.
   Read-only. No new AI, storage schema, or automated review changes. */
(()=>{'use strict';
const core=window.PsychDeskCore;if(!core)return;
const h=core.esc,d=()=>core.getData();
const weak=()=>{
 const data=d(),cards=Array.isArray(data.cards)?data.cards:[],reviews=Array.isArray(data.reviews)?data.reviews:[];
 const subjects=Array.isArray(data.subjects)?data.subjects:[];
 const byCard=new Map();
 for(const r of reviews){
  if(!r?.cardId||!['again','hard','good','easy'].includes(r.rating))continue;
  const a=byCard.get(r.cardId)||[];a.push(r);byCard.set(r.cardId,a);
 }
 return cards.filter(c=>c?.id&&c.question).map(card=>{
  const history=byCard.get(card.id)||[],recent=history.slice(-5),difficulty=recent.filter(r=>r.rating==='again'||r.rating==='hard').length;
  const last=recent[recent.length-1],due=!card.due||card.due<=core.today();
  return {card,history:history.length,difficulty,latest:last?.rating||'',due,
   subject:subjects.find(s=>s.id===card.subjectId)?.name||'General'};
 }).filter(x=>x.difficulty>0).sort((a,b)=>b.difficulty-a.difficulty||Number(b.due)-Number(a.due)||b.history-a.history).slice(0,20);
};
function render(){
 const items=weak();
 return '<section class="p3-panel p7-panel"><div class="p7-intro"><span class="focus-room-overline">REVISIT WITH CARE</span><h2>Concepts worth another look.</h2><p class="p3-muted">These are flashcards you previously marked Again or Hard. This is a study suggestion, not a judgment about your understanding.</p></div>'+
 (items.length?'<div class="p7-list">'+items.map(({card,subject,difficulty,due,history})=>
 '<article class="p7-item"><div><small>'+h(subject)+' · '+difficulty+' difficult rating'+(difficulty===1?'':'s')+' in recent reviews</small>'+
 '<h3>'+h(card.question)+'</h3><p>'+h(due?'Ready for scheduled review':'Next scheduled review: '+String(card.due||'Not set'))+' · '+history+' review'+(history===1?'':'s')+' recorded</p></div>'+
 '<button type="button" data-p7="review">Open flashcards</button></article>').join('')+'</div>':
 '<div class="p7-empty"><p>No difficult flashcard ratings recorded yet.</p><p class="p3-muted">As you review cards and choose Again or Hard, PsychDesk can highlight concepts to revisit.</p><button type="button" data-p7="review">Open flashcards →</button></div>')+
 '<p class="p3-muted">Only the five most recent ratings per card are considered. Your spaced-repetition schedule is not changed.</p></section>';
}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-p7="review"]');if(!b)return;e.preventDefault();core.setTab('recall');});
window.PsychDeskPhase7={render,weak};
})();
