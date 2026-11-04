/* Phase 5: chapter trail. Derived entirely from approved Phase 2 chapter outlines
   and their existing source-linked flashcards; no additional synced records. */
(()=>{'use strict';
const core=window.PsychDeskCore;if(!core)return;
const h=core.esc,d=()=>core.getData();
const sourceKey=s=>[String(s?.materialId||''),String(s?.originalName||''),Number(s?.pageStart)||0,Number(s?.pageEnd)||0].join('|');
const chapters=()=>{
 const data=d(),notes=Array.isArray(data.notes)?data.notes:[],cards=Array.isArray(data.cards)?data.cards:[];
 return notes.filter(n=>n?.id&&n.derivedKind==='prepared-chapter'&&n.sourceInfo?.kind==='chapter-preparation').map(n=>{
  const source=n.sourceInfo,key=sourceKey(source);
  const linked=cards.filter(c=>c?.sourceKind==='chapter-preparation'&&
    sourceKey({materialId:c.sourceMaterialId,originalName:c.sourceTitle,pageStart:c.sourcePageStart,pageEnd:c.sourcePageEnd})===key);
  const due=linked.filter(c=>!c.due||c.due<=core.today()).length;
  const material=(data.materials||[]).find(m=>m.id===source.materialId);
  return {note:n,source,linked:linked.length,due,material:material&&['pdf','markdown'].includes(material.kind)?material:null};
 }).sort((a,b)=>String(b.note.updatedAt||b.note.createdAt||'').localeCompare(String(a.note.updatedAt||a.note.createdAt||''))).slice(0,40);
};
function render(){
 const rows=chapters();
 return '<section class="p3-panel p5-panel"><div class="p5-intro"><strong>Your chapter trail</strong><p class="p3-muted">Continue from a chapter you prepared. Your original outlines, reading sources and flashcards stay in their existing locations.</p></div>'+
 (rows.length?'<div class="p5-list">'+rows.map(({note,source,linked,due,material})=>
 '<article class="p5-chapter"><div class="p5-chapter-info"><small>'+h(source.pageStart>0?'Pages '+source.pageStart+(source.pageEnd>=source.pageStart?'–'+source.pageEnd:''):'Prepared from text')+'</small>'+
 '<h3>'+h(source.originalName||note.title)+'</h3><p>'+linked+' source-linked flashcards · '+due+' ready for review</p></div>'+
 '<div class="p5-actions"><button type="button" data-p5="note" data-id="'+h(note.id)+'">Open outline</button>'+
 (material?'<button type="button" data-p5="reader" data-id="'+h(material.id)+'" data-page="'+(Number(source.pageStart)||1)+'">Return to reading</button>':'')+
 (linked?'<button type="button" data-p5="recall">Review cards</button>':'')+'</div></article>').join('')+'</div>':
 '<div class="p5-empty"><p>You have not saved a prepared chapter yet.</p><p class="p3-muted">Open a PDF or Markdown document in the reader and choose <strong>Prepare chapter</strong>. Nothing is added until you approve it.</p><button type="button" data-tab="materials">Open reading shelf →</button></div>')+
 '<p class="p3-muted">Chapter links use existing source metadata. If a document was removed, the saved outline and cards remain available.</p></section>';
}
document.addEventListener('click',e=>{
 const b=e.target.closest?.('[data-p5]');if(!b)return;e.preventDefault();
 const kind=b.dataset.p5;
 if(kind==='note'){
  const note=(d().notes||[]).find(n=>n.id===b.dataset.id);
  if(!note)return core.toast('That outline is no longer available.');
  core.setTab('notes');window.PsychDeskCloud?.noteEditor?.(note);
 }else if(kind==='reader'){
  const source=(d().materials||[]).find(m=>m.id===b.dataset.id&&['pdf','markdown'].includes(m.kind));
  if(!source)return core.toast('The original document is no longer available.');
  const page=Math.max(1,Math.min(100000,Number(b.dataset.page)||1));
  if(window.PsychDeskReader?.open)window.PsychDeskReader.open(source.id,page);
  else core.setTab('materials');
 }else if(kind==='recall')core.setTab('recall');
});
window.PsychDeskPhase5={render,chapters,sourceKey};
})();
