/* Phase 3: calm knowledge connections, theory comparison and quick memory review.
   Read-only derived views except explicit existing flashcard navigation and mind-map creation. */
(()=>{'use strict';
const core=window.PsychDeskCore;if(!core)return;
const h=core.esc,d=()=>core.getData(),lower=v=>String(v||'').toLocaleLowerCase();
const norm=v=>lower(v).replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const stop=new Set(['psychology','psychological','study','theory','notes','chapter','about','from','with','into','these','their','which','there','this','that','those','research','methods','general','introduction']);
const terms=s=>[...new Set(norm(s).split(' ').filter(x=>x.length>=5&&!stop.has(x)))];
const related=(a,b)=>{const A=new Set(terms(a)),B=new Set(terms(b));return [...A].filter(t=>B.has(t)).slice(0,6)};
const preview=s=>String(s||'').replace(/\s+/g,' ').slice(0,150);
const sourceList=()=>{
 const data=d();
 return [
 ...(data.notes||[]).map(x=>({id:x.id,kind:'note',title:x.title||'Untitled note',body:x.body||'',subjectId:x.subjectId||''})),
 ...(data.research||[]).map(x=>({id:x.id,kind:'reference',title:x.title||'Untitled reference',body:x.notes||'',subjectId:x.subjectId||''})),
 ...(data.mindMaps||[]).map(x=>({id:x.id,kind:'map',title:x.title||'Untitled concept map',body:(x.nodes||[]).map(n=>n.label).join(' '),subjectId:x.subjectId||''}))
 ].filter(x=>x.id&&x.title).slice(0,450);
};
let selected='',left='',right='',filter='all';
const itemText=x=>x.title+' '+x.body.slice(0,1800);
function links(){
 const sources=sourceList(),source=sources.find(x=>x.kind+':'+x.id===selected)||sources.find(x=>x.kind==='note')||sources[0];
 if(source&&!selected)selected=source.kind+':'+source.id;
 const matches=source?sources.filter(x=>x!==source).map(x=>({...x,shared:related(itemText(source),itemText(x))}))
 .filter(x=>x.shared.length>=2).sort((a,b)=>b.shared.length-a.shared.length).slice(0,10):[];
 return '<div class="p3-panel"><label for="p3Source">Find connections for</label><select id="p3Source">'+sources.map(x=>'<option value="'+h(x.kind+':'+x.id)+'"'+(source&&x.id===source.id&&x.kind===source.kind?' selected':'')+'>'+h(x.title)+' · '+h(x.kind)+'</option>').join('')+'</select>'+
 '<p class="p3-muted">Related material is suggested using overlapping keywords, not AI-generated claims. Check each connection yourself.</p>'+
 (matches.length?'<div class="p3-results">'+matches.map(x=>'<article class="p3-result"><small>'+h(x.kind)+'</small><strong>'+h(x.title)+'</strong><p>Shared terms: '+h(x.shared.join(', '))+'</p><button type="button" data-p3="open" data-kind="'+h(x.kind)+'" data-id="'+h(x.id)+'">Open source</button></article>').join('')+'</div>':
 '<p class="p3-empty">No strong matches yet. Save more notes or build a concept map to find related ideas.</p>')+'</div>';
}
function compare(){
 const notes=(d().notes||[]).filter(n=>n.id&&n.title&&n.body);
 const options='<option value="">Choose a saved note…</option>'+notes.map(n=>'<option value="'+h(n.id)+'">'+h(n.title)+'</option>').join('');
 const a=notes.find(n=>n.id===left),b=notes.find(n=>n.id===right);
 const common=a&&b&&a.id!==b.id?related(itemText({title:a.title,body:a.body}),itemText({title:b.title,body:b.body})):[];
 return '<div class="p3-panel"><p class="p3-muted">Choose two of your existing theory notes. Compare their original text side by side; PsychDesk does not invent differences or evidence.</p>'+
 '<div class="p3-pickers"><label>First theory<select id="p3Left">'+options.replace('value="'+h(left)+'"','value="'+h(left)+'" selected')+'</select></label>'+
 '<label>Second theory<select id="p3Right">'+options.replace('value="'+h(right)+'"','value="'+h(right)+'" selected')+'</select></label></div>'+
 (a&&b&&a.id!==b.id?'<div class="p3-compare"><article><h3>'+h(a.title)+'</h3><p>'+h(a.body.slice(0,3500))+'</p></article><article><h3>'+h(b.title)+'</h3><p>'+h(b.body.slice(0,3500))+'</p></article></div>'+
 '<div class="p3-similar"><strong>Overlapping concepts</strong><p>'+h(common.join(' · ')||'No clear shared keywords found.')+'</p><p class="p3-muted">Think through the assumptions, methods, supporting evidence and limitations using your own sources.</p></div>':
 '<p class="p3-empty">Select two different notes to compare.</p>')+'</div>';
}
function recall(){
 const cards=d().cards||[],now=core.today();
 const due=cards.filter(x=>!x.due||x.due<=now);
 const bySubject=new Map();
 for(const card of due){const key=card.subjectId||'',group=bySubject.get(key)||[];group.push(card);bySubject.set(key,group);}
 const subject=d().subjects||[];
 const groups=[...bySubject].map(([id,rows])=>({id,rows,title:subject.find(s=>s.id===id)?.name||'General'}))
 .sort((a,b)=>b.rows.length-a.rows.length);
 return '<div class="p3-panel"><div class="p3-recall"><strong>'+due.length+' cards ready</strong><p>Review a few at a time. Your existing flashcard scheduling and progress remain unchanged.</p>'+
 '<button type="button" class="primary" data-tab="recall">Start a short review →</button></div>'+
 (groups.length?'<div class="p3-results">'+groups.slice(0,8).map(x=>'<article class="p3-result"><strong>'+h(x.title)+'</strong><p>'+x.rows.length+' due cards</p><button type="button" data-p3="review" data-subject="'+h(x.id)+'">Review in flashcards</button></article>').join('')+'</div>':
 '<p class="p3-empty">You are caught up. Make one flashcard from a difficult concept when you are ready.</p>')+'</div>';
}
function render(){
 const tabs=[['links','Connected notes'],['compare','Compare theories'],['review','Memory review'],['chapters','Chapter trail']];
 return '<section class="hero p3-hero"><div class="eyebrow">UNDERSTAND · CONNECT · REMEMBER</div><h1>Connect your learning.</h1><p>Find related ideas, compare what you have written, and review without a crowded dashboard.</p></section>'+
 '<nav class="p3-tabs" aria-label="Knowledge workspace sections">'+tabs.map(([id,label])=>'<button type="button" data-p3="tab" data-mode="'+id+'" aria-pressed="'+(filter===id)+'" class="'+(filter===id?'active':'')+'">'+label+'</button>').join('')+'</nav>'+
 (filter==='compare'?compare():filter==='review'?recall():filter==='chapters'?(window.PsychDeskPhase5?.render?.()||'<p>Chapter trail unavailable.</p>'):links())+
 '<div class="p3-footer"><button type="button" data-tab="mindmap">Open interactive concept boards →</button><button type="button" data-tab="dictionary">Psychology dictionary →</button></div>';
}
function open(kind,id){
 if(kind==='note'){const note=(d().notes||[]).find(n=>n.id===id);if(!note)return;core.setTab('notes');window.PsychDeskCloud?.noteEditor?.(note);}
 else if(kind==='map'){core.setTab('mindmap');const el=document.querySelector('#mindMapSelect');if(el){el.value=id;el.dispatchEvent(new Event('change',{bubbles:true}));}}
 else if(kind==='reference'){core.setTab('research');core.toast('Open the matching reference in your research shelf.');}
}
document.addEventListener('change',e=>{
 if(e.target?.id==='p3Source'){selected=e.target.value;core.render();}
 if(e.target?.id==='p3Left'){left=e.target.value;core.render();}
 if(e.target?.id==='p3Right'){right=e.target.value;core.render();}
});
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-p3]');if(!b)return;e.preventDefault();
 if(b.dataset.p3==='tab'){filter=b.dataset.mode;core.render();}
 else if(b.dataset.p3==='open')open(b.dataset.kind,b.dataset.id);
 else if(b.dataset.p3==='review'){core.setTab('recall');core.toast('Flashcards opened. Choose the subject filter to focus your review.');}
});
window.addEventListener('psychdesk:session-reset',()=>{selected='';left='';right='';filter='links';});
window.PsychDeskPhase3={render,related,sourceList};
})();
