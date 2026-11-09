/* PsychDesk Quiet Studio + local-first deterministic Autopilot.
   No AI calls, no new accounts, no private material in GitHub Actions. */
(()=>{'use strict';
const core=window.PsychDeskCore;if(!core)return;
const h=core.esc, $=s=>document.querySelector(s);
const SCHEMA='psychdesk-autopilot-v1';
let discoveries=[],tab='today',working=false,scanTimer=0,scrollTimer=0,worker=null,pendingOutline=null;
const handlers=new Map();
const on=(name,fn)=>{const list=handlers.get(name)||[];list.push(fn);handlers.set(name,list)};
const emit=(name,payload={})=>{for(const fn of handlers.get(name)||[])try{fn(payload)}catch(e){console.warn('Autopilot event',name,e)}};
const scope=()=>core.getStorageKey();
const key=(part)=>'psychdesk-studio:'+scope()+':'+part;
const read=(part,def)=>{try{const raw=localStorage.getItem(key(part));return raw==null?def:JSON.parse(raw)}catch{return def}};
const write=(part,val)=>{try{localStorage.setItem(key(part),JSON.stringify(val));return true}catch{return false}};
const mode=()=>['calm','assisted','autopilot'].includes(read('mode','assisted'))?read('mode','assisted'):'assisted';
const date=(value=new Date())=>{const d=new Date(value);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const weeklyId=()=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7)-7);return date(d)};
const hash=s=>{let n=2166136261;for(let i=0;i<s.length;i++)n=Math.imul(n^s.charCodeAt(i),16777619);return (n>>>0).toString(36)};
const rev=n=>hash(String(n.updatedAt||'')+'|'+String(n.title||'')+'|'+String(n.body||''));
const safeLink=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:'#'}catch{return '#'}};
const safeSaved=()=>read('saved',[]).filter(x=>x&&typeof x.id==='string').slice(0,300);
const discovery=()=>{if(!discoveries.length)return null;const start=new Date(2026,0,1).getTime(),index=Math.floor((new Date(date()+'T12:00:00').getTime()-start)/86400000);return discoveries[((index%discoveries.length)+discoveries.length)%discoveries.length]};
const info=()=>core.getData();

function welcome(){
 const hour=new Date().getHours();
 return hour<11?'Start with a concept, a note, or a task.':hour<17?'Pick up a subject or review your notes.':hour<21?'Continue reading or review a concept.':'Review a concept before you finish studying.';
}
function discoveryMarkup(){
 const c=discovery();
 if(!c)return '<div class="studio-discovery-loading"><span class="studio-kicker">A PSYCHOLOGY IDEA</span><h2>Finding a psychology concept.</h2><p>Concepts are selected from reviewed psychology sources.</p></div>';
 const saved=safeSaved().some(x=>x.id===c.id);
 return '<div class="studio-feature-top"><span class="studio-kicker">FEATURED PSYCHOLOGY CONCEPT</span><span class="garden-story-mark" aria-hidden="true">✳</span></div>'+
 '<div class="studio-feature-body"><p class="studio-concept">'+h(c.category)+' · '+h(c.term)+'</p><h2>'+h(c.title)+'</h2><p class="studio-feature-definition">'+h(c.definition)+'</p></div>'+
 '<div class="studio-feature-footer"><span class="studio-feature-credit">Source: '+h(c.source?.publisher||'a psychology source')+'</span>'+
 '<div class="studio-actions"><button type="button" class="studio-explore" data-auto="explore">Read more ↗</button><button type="button" class="studio-save" data-auto="save" aria-label="'+(saved?'Concept already saved':'Save this psychology concept')+'">'+(saved?'Saved ✓':'Save')+'</button></div></div>';
}

function postcard(){
 const old=safeSaved().find(x=>x.savedAt&&Date.now()-Date.parse(x.savedAt)>2*86400000);
 const c=old&&discoveries.find(v=>v.id===old.id);
 return c?'<section class="studio-postcard"><div><span class="studio-kicker">AN IDEA FROM YOUR COLLECTION</span><h3>Remember '+h(c.term)+'?</h3><p>See what comes to mind before looking it up.</p></div><button data-auto="postcard" data-id="'+h(c.id)+'" class="secondary">Revisit idea ↗</button></section>':'';
}
function renderHome(){
 const d=info(),recent=(d.notes||[]).slice().sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')))[0];
 const saved=safeSaved().length,subject=recent?(d.subjects||[]).find(v=>v.id===recent.subjectId):null;
 const excerpt=recent?String(recent.body||'').replace(/\s+/g,' ').trim().slice(0,145):'';
 const continuation=recent?
 '<div class="garden-notebook-copy"><span class="studio-kicker">YOUR LAST NOTE</span><h3>'+h(recent.title||'Untitled note')+'</h3><p>'+h(excerpt||'Continue reading or editing this note.')+'</p></div>'+
 '<div class="garden-book-actions"><span>'+h(subject?.name||'Your notebook')+'</span><button type="button" class="garden-text-btn" data-cloud="editNote" data-id="'+h(recent.id)+'">Open note ↗</button></div>':
 '<div class="garden-notebook-copy"><span class="studio-kicker">NOTES</span><h3>Your notebook is ready.</h3><p>Write a thought, lecture note, or question.</p></div>'+
 '<div class="garden-book-actions"><span>NOTEBOOK</span><button type="button" class="garden-text-btn" data-auto="capture">New note ↗</button></div>';
 const scene=window.PsychDeskGarden?.scene(safeSaved(),discoveries)||'';
 const firstAction=window.PsychDeskSession?.homeButton?.()||(recent?'<button class="garden-main-btn" type="button" data-cloud="editNote" data-id="'+h(recent.id)+'">Continue note <span aria-hidden="true">↗</span></button>':'<button class="garden-main-btn" type="button" data-auto="capture">New note <span aria-hidden="true">↗</span></button>');
 const lastSession=window.PsychDeskSession?.homeDetail?.();
 const hasHistory=Boolean(recent||window.PsychDeskSession?.getResume?.());
 const heading=hasHistory?'Continue where<br><em>you left off.</em>':'Your psychology<br><em>study space.</em>';
 const introduction=hasHistory?'Your latest work is ready. Resume studying or choose a short focus session.':'Write, read, and connect ideas in one place. Start with a single note.';
 return '<div class="studio-home studio-home-v2 garden-home">'+
 '<section class="garden-landing" aria-label="Psychology study homepage">'+
 '<div class="garden-ambient" aria-hidden="true"></div>'+
 '<div class="garden-heading"><span class="studio-kicker">PSYCHOLOGY · STUDY DESK</span><h1>'+heading+'</h1><p>'+introduction+'</p>'+
 '<div class="garden-entry">'+firstAction+'<button class="garden-soft-btn" type="button" data-tab="focus">Focus</button></div></div>'+
 '<div class="garden-art-wrap">'+scene+'</div>'+
 '<div class="garden-scene-footer"><span>Touch a tree or pond</span><span>LIVING GARDEN</span></div>'+
 '</section>'+
 '<div class="garden-path-marker" aria-hidden="true"><span></span>ON YOUR DESK<span></span></div>'+
 '<div class="garden-stories">'+
 '<section class="garden-notebook" aria-label="Resume your notebook"><div class="garden-book-icon" aria-hidden="true"><span>✧</span></div>'+(lastSession||continuation)+'</section>'+ 
 '<section class="studio-discovery garden-seed" id="studio-discovery" aria-label="A daily psychology concept">'+discoveryMarkup()+'</section></div>'+
 (window.PsychDeskPhase6?.homeCard?.()||'')+
 '<section class="garden-bloom-line"><div><span class="studio-kicker">SAVED IDEAS</span><h3>Your saved concepts</h3><p>'+saved+' '+(saved===1?'concept':'concepts')+' saved.</p></div><button type="button" data-auto="garden">Open collection <span aria-hidden="true">↗</span></button></section>'+
 '<details class="studio-quiet-tools garden-tool-drawer"><summary>Other tools <span aria-hidden="true">⌄</span></summary><div><button type="button" data-tab="notes">Notebooks</button><button type="button" data-tab="ink">Ink notes</button><button type="button" data-tab="materials">Reading shelf</button><button type="button" data-tab="dictionary">Psychology dictionary</button><button type="button" data-tab="recall">Flashcards</button><button type="button" data-tab="connections">Study Flow</button><button type="button" data-auto="inbox">Organize notes</button><button type="button" data-auto="import">Import a document</button><button type="button" data-auto="letter">Weekly letter</button><button type="button" data-tab="tools">All tools</button></div></details>'+
 '</div>';
}

function refreshHome(){
 const node=$('#studio-discovery');if(node)node.innerHTML=discoveryMarkup();
 const art=$('.garden-art-wrap');if(art&&window.PsychDeskGarden)art.innerHTML=window.PsychDeskGarden.scene(safeSaved(),discoveries);
 const line=$('.garden-bloom-line p');if(line){const count=safeSaved().length;line.textContent=count+' '+(count===1?'concept':'concepts')+' saved.';}
}

fetch('./automation/data/curated-concepts.json?v=1',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('No curated discovery file');return r.json()}).then(j=>{discoveries=(j.concepts||[]).filter(x=>x.id&&x.title&&x.source?.url&&x.verification==='editor-reviewed');refreshHome()}).catch(()=>{const t=$('#studio-discovery');if(t)t.innerHTML='<span class="studio-kicker">PSYCHOLOGY CONCEPT</span><h2>Discoveries are temporarily unavailable.</h2><p>Your notes and other study tools still work.</p>'});
function explore(id){
 const c=discoveries.find(x=>x.id===(id||discovery()?.id));if(!c){core.toast('Discovery is not available yet');return;}
 const related=c.related.map(x=>discoveries.find(v=>v.id===x)).filter(Boolean);
 core.openModal(c.term,'<div class="studio-discovery-detail"><span class="studio-kicker">'+h(c.category)+' · REFERENCE-LINKED</span><h3>'+h(c.title)+'</h3><p>'+h(c.explanation)+'</p><h3>In everyday life</h3><p>'+h(c.example)+'</p><h3>Related concepts</h3><div class="studio-tags">'+(related.length?related.map(v=>'<button type="button" data-auto="related" data-id="'+h(v.id)+'">'+h(v.term)+'</button>').join(''):'<p>Connections are being curated.</p>')+'</div><p class="studio-source"><a href="'+h(safeLink(c.source.url))+'" target="_blank" rel="noopener noreferrer">Read the academic source — '+h(c.source.title)+'</a></p><div class="studio-actions"><button class="secondary" data-auto="save" data-id="'+h(c.id)+'">Save discovery</button><button class="secondary" data-auto="card" data-id="'+h(c.id)+'">Make flashcard</button></div></div>');
}
function saveDiscovery(id){
 const c=discoveries.find(x=>x.id===(id||discovery()?.id));if(!c)return;
 const saved=safeSaved();if(saved.some(x=>x.id===c.id)){core.toast('Concept already saved');return;}
 if(!write('saved',[...saved,{id:c.id,savedAt:new Date().toISOString()}])){core.toast('Could not save this discovery on this device.');return;}
 core.toast('Concept saved');refreshHome();
}
function makeDiscoveryCard(id){
 const c=discoveries.find(v=>v.id===id);if(!c)return;
 const newCard={id:core.id(),question:'What does '+c.term+' mean?',answer:c.definition,subjectId:'',due:core.today(),interval:0,reps:0,sourceKind:'curated-discovery',sourceId:id};
 const ok=core.commitChange(d=>{if(!d.cards.some(x=>x.question.toLowerCase()===newCard.question.toLowerCase()))d.cards.push(newCard)});
 if(ok)core.toast('Flashcard saved to your existing deck');
}
function garden(){
 const saved=safeSaved(),items=saved.map(x=>discoveries.find(c=>c.id===x.id)).filter(Boolean);
 core.openModal('Saved concepts','<div class="studio-garden garden-collection"><p>Review and open the psychology concepts you saved.</p><div class="garden-modal-illustration">'+(window.PsychDeskGarden?.scene(saved,discoveries)||'')+'</div><h3>Saved concepts</h3>'+(items.length?items.map((c,i)=>'<button class="studio-garden-item" data-auto="related" data-id="'+h(c.id)+'"><span>✿</span><strong>'+h(c.term)+'</strong><small>'+h(c.category)+'</small></button>').join(''):'<p>Save a featured concept to build a review collection.</p>')+'</div>');
}
function getDb(){
 if(!('indexedDB' in window))return Promise.reject(Error('IndexedDB unavailable'));
 if(!getDb.promise)getDb.promise=new Promise((resolve,reject)=>{
  const r=indexedDB.open(SCHEMA,1);
  r.onupgradeneeded=()=>{const db=r.result;for(const name of ['jobs','artifacts','activity'])if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:'key'});};
  r.onsuccess=()=>resolve(r.result);
  r.onerror=()=>reject(r.error||Error('Could not open automation database'));
 });
 return getDb.promise;
}
async function operate(name,verb,value){
 const db=await getDb();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(name,verb==='get'||verb==='all'?'readonly':'readwrite');
  const store=tx.objectStore(name),req=verb==='get'?store.get(value):verb==='all'?store.getAll():store.put(value);
  let result;
  req.onsuccess=()=>{result=req.result};
  tx.oncomplete=()=>resolve(result);
  tx.onerror=()=>reject(tx.error||req.error||Error('Autopilot storage error'));
  tx.onabort=()=>reject(tx.error||Error('Autopilot storage aborted'));
 });
}
const log=async(title)=>{try{const a=await operate('activity','all');if(a.length>=60){const db=await getDb();const old=a.sort((x,y)=>String(x.at).localeCompare(String(y.at))).slice(0,a.length-59);for(const x of old){await new Promise((resolve,reject)=>{const t=db.transaction('activity','readwrite'),q=t.objectStore('activity').delete(x.key);q.onsuccess=resolve;q.onerror=reject})}}await operate('activity','put',{key:scope()+':'+Date.now()+':'+Math.random().toString(36).slice(2),scope:scope(),at:new Date().toISOString(),title})}catch{}};
async function scan(){
 if(mode()==='calm')return;
 const current=scope(),notes=(info().notes||[]).slice().sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''))).slice(0,350);
 try{
  const jobs=await operate('jobs','all'),existing=new Set(jobs.map(j=>j.key));
  let created=0;
  for(const n of notes){
   if(!n?.id||!n?.body||n.body.trim().length<35)continue;
   const revision=rev(n),jobKey=current+':note:'+n.id+':'+revision;
   if(existing.has(jobKey))continue;
   if(created>=25)break;
   await operate('jobs','put',{key:jobKey,scope:current,sourceId:n.id,revision,state:'pending',attempts:0,at:new Date().toISOString()});created++;
  }
  if(created)await log('Prepared '+created+' local source'+(created===1?'':'s')+' for analysis');
  run();
 }catch(error){console.warn('Autopilot disabled: ',error);}
}
function scanSoon(){clearTimeout(scanTimer);scanTimer=setTimeout(scan,700)}
on('note.saved',scanSoon);on('note.updated',scanSoon);on('material.imported',scanSoon);
async function recoverJobs(){
 try{const current=scope(),jobs=await operate('jobs','all');for(const j of jobs){if(j.scope===current&&j.state==='working'){j.state='pending';j.retryAt=0;await operate('jobs','put',j)}}}catch(e){console.warn('Autopilot recovery:',e)}
}
function analyze(source){
 return new Promise((resolve,reject)=>{
  try{
   if(!worker)worker=new Worker('./autopilot/worker.js?v=phase2-1');
   const jobId=Math.random().toString(36).slice(2),timer=setTimeout(()=>{worker?.terminate();worker=null;reject(Error('Worker timeout'))},10000);
   const onMessage=e=>{if(e.data?.jobId!==jobId)return;clearTimeout(timer);worker.removeEventListener('message',onMessage);if(e.data.error)reject(Error(e.data.error));else resolve(e.data.result)};
   worker.addEventListener('message',onMessage);worker.postMessage({jobId,source});
  }catch(e){reject(e)}
 });
}
async function run(){
 if(working||mode()==='calm')return;working=true;
 try{
  const all=await operate('jobs','all'),now=Date.now(),current=scope();
  for(const job of all.filter(x=>x.scope===current&&['pending','retry'].includes(x.state)&&(!x.retryAt||x.retryAt<=now)).sort((a,b)=>a.at.localeCompare(b.at)).slice(0,12)){
   if(scope()!==current)break;
   const n=(info().notes||[]).find(v=>v.id===job.sourceId);
   if(!n||rev(n)!==job.revision){job.state='stale';await operate('jobs','put',job);continue;}
   job.state='working';await operate('jobs','put',job);
   try{
    const result=await analyze({id:n.id,title:n.title,text:n.body,revision:job.revision,subjects:info().subjects.map(s=>({id:s.id,name:s.name}))});
    if(scope()!==current)break;
    await operate('artifacts','put',{key:job.key,scope:current,sourceId:n.id,revision:job.revision,result,createdAt:new Date().toISOString()});
    job.state='complete';await operate('jobs','put',job);
    if(mode()==='autopilot'&&result.suggestion.confidence>=.95&&!n.subjectId){
     const exists=info().subjects.find(s=>s.id===result.suggestion.subjectId);
     if(exists&&core.commitChange(d=>{const v=d.notes.find(x=>x.id===n.id);if(v&&!v.subjectId)v.subjectId=exists.id})){
      await operate('activity','put',{key:current+':organize:'+job.key,scope:current,at:new Date().toISOString(),title:'Organized '+(n.title||'Untitled note'),undo:{noteId:n.id,oldSubjectId:'',newSubjectId:exists.id}});
     }
    }
   }catch(error){
    job.attempts++;
    job.state=job.attempts>=3?'failed':'retry';
    job.retryAt=Date.now()+Math.min(3600000,5000*Math.pow(2,job.attempts));
    job.error=String(error?.message||error).slice(0,130);await operate('jobs','put',job);
   }
  }
 }catch(error){console.warn('PsychDesk Autopilot queue:',error)}
 finally{working=false;}
}
async function inbox(){
 let artifacts=[];
 try{artifacts=(await operate('artifacts','all')).filter(x=>x.scope===scope()&&(info().notes||[]).some(n=>n.id===x.sourceId&&rev(n)===x.revision)).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,20);}
 catch(e){core.openModal('Prepared notes','<p>Automatic preparation needs IndexedDB, which is unavailable here. Your original notes remain safe.</p>');return;}
 const bodies=artifacts.map(a=>{
  const note=info().notes.find(n=>n.id===a.sourceId),r=a.result,possible=info().subjects.find(x=>x.id===r.suggestion.subjectId);
  const mentioned=discoveries.filter(c=>{const words=(' '+String(note?.title||'')+' '+String(note?.body||'')+' ').toLowerCase().replace(/[^a-z0-9]+/g,' ');const term=String(c.term||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();return term&&(' '+words.trim()+' ').includes(' '+term+' ')}).slice(0,5);
  return '<details class="studio-result"><summary>'+h(note?.title||'Untitled note')+' <small>'+r.cards.length+' draft cards</small></summary>'+(note?.subjectId?'<p class="note">Already filed under '+h(info().subjects.find(s=>s.id===note.subjectId)?.name||'a subject')+'.</p>':possible&&r.suggestion.confidence>=.65?'<p>Suggested subject: <strong>'+h(possible.name)+'</strong> · '+Math.round(r.suggestion.confidence*100)+'% keyword match'+(r.suggestion.matched?.length?' ('+h(r.suggestion.matched.join(', '))+')':'')+'</p><button type="button" class="secondary" data-auto="organize" data-key="'+h(a.key)+'">File under '+h(possible.name)+'</button>':'<p class="note">No reliable subject match. Note stays unassigned.</p>')+(r.outline.length?'<h4>Extracted headings</h4><ol>'+r.outline.slice(0,12).map(x=>'<li>'+h(x)+'</li>').join('')+'</ol><button type="button" class="secondary" data-auto="outline" data-key="'+h(a.key)+'">Review editable outline</button>':'')+(mentioned.length?'<p>Known concepts mentioned: '+mentioned.map(c=>'<button class="link-btn" data-auto="related" data-id="'+h(c.id)+'">'+h(c.term)+'</button>').join(' ')+'</p>':'')+(r.researchers.length?'<p>Names mentioned: '+h(r.researchers.join(', '))+'</p>':'')+(r.dois.length?'<p>Research DOIs: '+r.dois.slice(0,5).map(doi=>'<button type="button" class="link-btn" data-auto="reference" data-doi="'+h(doi)+'">'+h(doi)+' · find reference ↗</button>').join(' ')+'</p>':'')+(r.cards.length?'<h4>Draft flashcards</h4>'+r.cards.slice(0,5).map(x=>'<p><strong>'+h(x.question)+'</strong> — '+h(x.answer)+'</p>').join('')+'<button type="button" class="primary" data-auto="approve" data-key="'+h(a.key)+'">Add reviewed cards to deck</button>':'<p>No explicit definition statements were found. Nothing was invented.</p>')+'</details>';
 }).join('');
 core.openModal('Prepared study material','<div class="studio-prepared"><p>Local, deterministic suggestions. Your original notes are unchanged. Flashcards are drafts until you approve them.</p>'+(artifacts.length?bodies:'<p>Nothing prepared yet. Save or edit a note containing a clear definition, such as “Operant conditioning: learning through consequences.”</p>')+'<button class="secondary" data-auto="rescan">Check notes again</button></div>');
}
async function applyOrganization(keyValue){
 const owner=scope(),artifact=await operate('artifacts','get',keyValue).catch(()=>null);
 if(owner!==scope()||!artifact||artifact.scope!==owner){core.toast('Suggestion is no longer available.');return;}
 const note=info().notes.find(n=>n.id===artifact.sourceId);
 const guess=artifact.result?.suggestion;
 if(!note||rev(note)!==artifact.revision||note.subjectId||!guess||guess.confidence<.65){
  core.toast('This note changed or no longer needs organizing.');return;
 }
 const target=info().subjects.find(s=>s.id===guess.subjectId);
 if(!target){core.toast('Suggested subject was removed.');return;}
 const ok=core.commitChange(d=>{
  const current=d.notes.find(n=>n.id===note.id);
  if(!current||current.subjectId||rev(current)!==artifact.revision)throw Error('The note changed. No subject was assigned.');
  current.subjectId=target.id;
 });
 if(!ok){core.toast('Could not assign this note. Your original is unchanged.');return;}
 await operate('activity','put',{key:owner+':organize:'+Date.now()+':'+note.id,scope:owner,at:new Date().toISOString(),
  title:'Filed '+String(note.title||'Untitled note').slice(0,70)+' under '+target.name,
  undo:{noteId:note.id,oldSubjectId:'',newSubjectId:target.id}}).catch(()=>{});
 core.toast('Note filed under '+target.name+'. Undo is available in Recent activity.');inbox();
}
async function draftOutline(keyValue){
 const a=await operate('artifacts','get',keyValue).catch(()=>null);
 if(!a||a.scope!==scope())return;
 const note=info().notes.find(n=>n.id===a.sourceId);
 if(!note||rev(note)!==a.revision){core.toast('Source changed; check notes again');return;}
 const r=a.result;
 const body=[...r.outline.map(x=>'# '+x),...r.terms.map(x=>'- Term: '+x),...r.questions.map(x=>'- Question: '+x)].join('\n').slice(0,12500);
 if(!body){core.toast('No explicit outline items found');return;}
 pendingOutline={sourceId:note.id,revision:a.revision,title:'Study outline · '+String(note.title||'Untitled').slice(0,100)};
 core.openModal('Review extracted outline','<div class="studio-outline-editor"><p>Only headings, key terms and questions detected in your source. Edit freely; no new scientific explanations are supplied.</p><textarea id="studioOutlineText" rows="15" maxlength="15000">'+h(body)+'</textarea><div class="studio-actions"><button type="button" class="primary" data-auto="saveOutline">Save as a separate note</button></div></div>');
}
function saveOutline(){
 const draft=pendingOutline;const text=String($('#studioOutlineText')?.value||'').trim();
 if(!draft||!text)return;
 const original=info().notes.find(n=>n.id===draft.sourceId);
 if(!original||rev(original)!==draft.revision){core.toast('Source has changed; reopen the outline');return;}
 if(info().notes.some(n=>n.derivedKind==='study-outline'&&n.sourceNoteId===draft.sourceId&&n.sourceRevision===draft.revision)){core.toast('This version already has an outline');return;}
 const item={id:core.id(),title:draft.title,body:text,subjectId:original.subjectId||'',tags:'study-outline',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),derivedKind:'study-outline',sourceNoteId:original.id,sourceRevision:draft.revision};
 if(core.commitChange(d=>d.notes.unshift(item))){pendingOutline=null;core.closeModal();core.toast('Separate study outline saved');}
}
function sendReference(doi){
 if(!/^10\.\d{4,9}\/[-._;()/:a-z0-9]+$/i.test(doi||''))return;
 core.closeModal();core.setTab('research');const field=$('#refLookupInput');if(field){field.value=doi;field.focus();core.toast('DOI is ready. Select Find DOI to review metadata.');}
}
async function approve(keyValue){
 const artifact=await operate('artifacts','get',keyValue).catch(()=>null);
 if(!artifact||artifact.scope!==scope()){core.toast('This preview is no longer available');return;}
 const note=info().notes.find(n=>n.id===artifact.sourceId);if(!note||rev(note)!==artifact.revision){core.toast('Source changed; prepare a fresh preview first');return;}
 const cards=artifact.result.cards||[];
 if(!cards.length)return;
 let added=0;
 const ok=core.commitChange(d=>{const existing=new Set(d.cards.map(c=>c.question.trim().toLowerCase()));for(const draft of cards){
  const k=draft.question.trim().toLowerCase();
  if(existing.has(k))continue;existing.add(k);
  d.cards.push({id:core.id(),question:draft.question.slice(0,500),answer:draft.answer.slice(0,1500),subjectId:note.subjectId||'',due:core.today(),interval:0,reps:0,sourceNoteId:note.id});added++;
 }});
 if(ok){await log('Approved '+added+' flashcard'+(added===1?'':'s')+' from a note');core.closeModal();core.toast(added?added+' cards added to your existing deck':'These cards already exist');}else core.toast('Could not save cards; source preserved');
}
function letter(){
 const d=info(),todayDate=new Date(),begin=new Date(todayDate);begin.setHours(0,0,0,0);begin.setDate(begin.getDate()-((begin.getDay()+6)%7)-7);
 const end=new Date(begin);end.setDate(end.getDate()+7);
 const inWeek=s=>s&&new Date(s)>=begin&&new Date(s)<end;
 const notes=(d.notes||[]).filter(x=>inWeek(x.createdAt||x.updatedAt));
 const saved=safeSaved().filter(x=>inWeek(x.savedAt));
 const subjects=[...new Set(notes.map(x=>(d.subjects||[]).find(s=>s.id===x.subjectId)?.name).filter(Boolean))];
 const hard={};
 (d.reviews||[]).filter(x=>x.rating==='again'||x.rating==='hard').forEach(x=>{hard[x.cardId]=(hard[x.cardId]||0)+1});
 const revisit=(d.cards||[]).filter(c=>(hard[c.id]||0)>=2).slice(0,3);
 core.openModal('Your weekly learning letter','<div class="studio-letter"><span class="studio-kicker">THE WEEK BEGINNING '+h(date(begin))+'</span><h3>Weekly overview.</h3><p>You captured '+notes.length+' note'+(notes.length===1?'':'s')+' and kept '+saved.length+(saved.length===1?' discovery':' discoveries')+' last week.</p>'+(subjects.length?'<p>Topics you visited: '+h(subjects.join(', '))+'.</p>':'<p>No subject was assigned to your saved notes, and that’s okay.</p>')+(revisit.length?'<h4>A gentle revisit</h4>'+revisit.map(c=>'<p>'+h(c.question)+'</p>').join(''):'<p>Nothing needs a special revisit based on repeated hard recalls.</p>')+'<p>There is no score to improve. Pick up any thread that interests you.</p></div>');
}
function compare(){
 const source='https://openstax.org/books/psychology-2e/pages/';
 core.openModal('Compare two learning theories','<div class="studio-comparison"><p>This comparison is curated, not generated from incomplete notes.</p><div><article><h3>Classical conditioning</h3><p>Association between stimuli; often involves reflexive responses.</p><p>Example: a cue comes to predict food.</p></article><article><h3>Operant conditioning</h3><p>Association between a behaviour and its consequences.</p><p>Example: reinforcement increases a behaviour.</p></article></div><p><a href="'+source+'6-2-classical-conditioning" target="_blank" rel="noopener">Source: OpenStax classical conditioning</a> · <a href="'+source+'6-3-operant-conditioning" target="_blank" rel="noopener">Operant conditioning</a></p></div>');
}
function atmosphere(){const hour=new Date().getHours();document.documentElement.dataset.studioTime=hour<11?'morning':hour<17?'afternoon':hour<21?'evening':'night';}
function quiet(set){document.body.classList.toggle('psychdesk-quiet',set);write('quiet',set);const exit=$('#quietExit');if(exit)exit.hidden=!set;const b=$('[data-auto="quiet"]');if(b)b.textContent=set?'Leave Quiet Room':'Enter Quiet Room';}
function settings(){
 const modal=$('#modalRoot .modal');if(!modal||modal.querySelector('#studioAutopilotSettings'))return;
 const wrap=document.createElement('section');wrap.id='studioAutopilotSettings';wrap.className='settings-section studio-auto-settings';
 wrap.innerHTML='<h3>Study preparation</h3><p class="note">Private, AI-free preparation. Derived suggestions stay on this device unless you approve them into your synced notes or flashcards.</p><div class="studio-mode-group" role="group" aria-label="Autopilot mode">'+[['calm','Manual'],['assisted','Assisted'],['autopilot','Autopilot']].map(([v,label])=>'<button type="button" data-auto="mode" data-mode="'+v+'" aria-pressed="'+(mode()===v)+'">'+label+'</button>').join('')+'</div><p class="note" id="studioModeHelp">'+h(mode()==='calm'?'Only continuity and daily discoveries.':mode()==='assisted'?'Safe preparation with approval before adding cards.':'Safe preparation, with reversible high-confidence notebook suggestions.')+'</p><div class="studio-settings-actions"><button type="button" class="secondary" data-auto="inbox">See prepared material</button><button type="button" class="secondary" data-auto="history">Recent activity</button><button type="button" class="secondary" data-auto="compare">Compare learning theories</button></div>';
 const footer=modal.querySelector('.settings-section:last-of-type');if(footer)footer.before(wrap);else modal.append(wrap);
}
async function history(){
 const rows=(await operate('activity','all').catch(()=>[])).filter(x=>x.scope===scope()).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,15);
 core.openModal('Recent Autopilot activity','<div class="studio-history">'+(rows.length?rows.map(x=>'<div><span>'+h(new Date(x.at).toLocaleDateString())+'</span> '+h(x.title)+(x.undo?'<button type="button" class="secondary" data-auto="undo" data-key="'+h(x.key)+'">Undo</button>':'')+'</div>').join(''):'<p>No background actions have been recorded yet.</p>')+'</div>');
}
async function undo(keyValue){
 const x=await operate('activity','get',keyValue).catch(()=>null);
 if(!x||x.scope!==scope()||!x.undo)return;
 const {noteId,newSubjectId,oldSubjectId}=x.undo;
 const n=info().notes.find(n=>n.id===noteId);
 if(!n||n.subjectId!==newSubjectId){core.toast('Notebook changed since this suggestion; no change made');return;}
 const ok=core.commitChange(d=>{const note=d.notes.find(v=>v.id===noteId);if(note&&note.subjectId===newSubjectId)note.subjectId=oldSubjectId});
 if(ok){x.undo=null;await operate('activity','put',x);core.toast('Notebook suggestion undone');history();}
}
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-auto]');if(!b)return;
 event.preventDefault();const a=b.dataset.auto,id=b.dataset.id;
 if(a==='capture')window.PsychDeskQuickNote?.open();
 else if(a==='explore'||a==='related'||a==='postcard')explore(id);
 else if(a==='save')saveDiscovery(id);
 else if(a==='card')makeDiscoveryCard(id);
 else if(a==='garden')garden();
 else if(a==='quiet')quiet(!document.body.classList.contains('psychdesk-quiet'));
 else if(a==='inbox')inbox(); else if(a==='import')window.PsychDeskImport?.open();
 else if(a==='approve')approve(b.dataset.key);
 else if(a==='organize')applyOrganization(b.dataset.key);
 else if(a==='outline')draftOutline(b.dataset.key);
 else if(a==='saveOutline')saveOutline();
 else if(a==='reference')sendReference(b.dataset.doi);
 else if(a==='letter')letter();
 else if(a==='compare')compare();
 else if(a==='rescan'){scanSoon();core.toast('Local check queued. Open prepared material shortly.');}
 else if(a==='history')history();
 else if(a==='undo')undo(b.dataset.key);
 else if(a==='mode'){write('mode',b.dataset.mode);settings();document.querySelectorAll('[data-auto="mode"]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.mode===b.dataset.mode)));const hint=$('#studioModeHelp');if(hint)hint.textContent=b.dataset.mode==='calm'?'Only continuity and daily discoveries.':b.dataset.mode==='assisted'?'Safe preparation with approval before adding cards.':'Safe preparation, with reversible high-confidence notebook suggestions.';if(b.dataset.mode!=='calm')scanSoon();}
});
document.addEventListener('click',e=>{if(e.target.closest('#settingsBtn'))queueMicrotask(settings)});
let knownNotes=new Map((info().notes||[]).map(n=>[n.id,rev(n)]));
function observeNotes(){
 const current=new Map((info().notes||[]).map(n=>[n.id,rev(n)]));let changed=0;
 for(const [id,revision] of current){if(knownNotes.get(id)!==revision){emit(knownNotes.has(id)?'note.updated':'note.saved',{noteId:id});changed++;}}
 knownNotes=current;
 if(!changed)scanSoon();
}
window.addEventListener('psychdesk:changed',observeNotes);
window.addEventListener('psychdesk:data-replaced',()=>{knownNotes=new Map((info().notes||[]).map(n=>[n.id,rev(n)]));recoverJobs().then(scanSoon);refreshHome()});
window.addEventListener('psychdesk:account-ready',()=>{knownNotes=new Map((info().notes||[]).map(n=>[n.id,rev(n)]));recoverJobs().then(scanSoon)});
window.addEventListener('psychdesk:tab-changed',e=>{
 const next=e.tab||'today';if(tab==='focus'&&next!=='focus')emit('study.ended',{from:tab});tab=next;emit('study.resumed',{tab});
 const last=read('positions',{}),position=Number(last[tab]||0);
 if(position>80&&tab!=='today')setTimeout(()=>{if(!$('#modalRoot .modal'))window.scrollTo({top:Math.max(0,Math.min(position,document.documentElement.scrollHeight-innerHeight)),behavior:'instant'})},100);
});
window.addEventListener('scroll',()=>{
 if(tab==='today'||$('#modalRoot .modal'))return;
 clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{const positions=read('positions',{});positions[tab]=Math.round(window.scrollY);write('positions',positions)},500);
},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){atmosphere();run();}});
window.addEventListener('online',run);
atmosphere();setInterval(atmosphere,3600000);
const exit=document.createElement('button');exit.type='button';exit.id='quietExit';exit.className='studio-quiet-exit';exit.textContent='↙ Leave Quiet Room';exit.addEventListener('click',()=>quiet(false));document.body.append(exit);
quiet(read('quiet',false));
window.PsychDeskAutopilot={renderHome,scan,emit,on,openPrepared:inbox,getMode:mode,analyze};
core.render();
recoverJobs().then(scanSoon);
})();