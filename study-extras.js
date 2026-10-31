/* PsychDesk Study Tools: search, research, speech notes, flashcard generation, focus and analytics. */
(()=>{'use strict';
const core=window.PsychDeskCore;
if(!core)return;
const h=core.esc,$=s=>document.querySelector(s),data=()=>core.getData();
const items=(key)=>Array.isArray(data()[key])?data()[key]:[];
const safeUrl=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return''}};
const subjectOptions=selected=>'<option value="">General / unassigned</option>'+data().subjects.map(x=>'<option value="'+h(x.id)+'"'+(selected===x.id?' selected':'')+'>'+h(x.name)+'</option>').join('');
const subj=id=>data().subjects.find(s=>s.id===id)?.name||'General';
const dateToday=()=>core.today();
const timestamp=()=>new Date().toISOString();
const clip=(s,n)=>String(s||'').slice(0,n);
let query='',searchType='all',researchFilter='all',voiceMode='idle',recognition=null,voiceText='',voiceInterim='',voiceTitle='',voiceSubject='',lastCards=[],ambient=null,ambientMode='off';
const categories=[['notes','Notes'],['stickies','Stickies'],['cards','Flashcards'],['tasks','Study plan'],['materials','Books & PDFs'],['pdfHighlights','PDF highlights'],['research','Research']];
function searchItems(q=query,type=searchType){
 const term=String(q).toLocaleLowerCase().trim();
 const sources=[
  ['notes',items('notes'),v=>v.title+' '+v.body+' '+(v.tags||''),v=>v.title||'Untitled note',v=>'notes'],
  ['stickies',items('stickies'),v=>v.title+' '+(v.lines||[]).join(' '),v=>v.title,v=>'stickies'],
  ['cards',items('cards'),v=>v.question+' '+v.answer,v=>v.question,v=>'recall'],
  ['tasks',items('tasks'),v=>v.title,v=>v.title,v=>'planner'],
  ['materials',items('materials'),v=>v.title+' '+(v.fileName||''),v=>v.title,v=>'materials'],
  ['pdfHighlights',items('pdfHighlights'),v=>v.text+' '+(v.note||''),v=>clip(v.text,85),v=>'materials'],
  ['research',items('research'),v=>v.title+' '+(v.authors||'')+' '+(v.doi||'')+' '+(v.notes||''),v=>v.title,v=>'research']
 ];
 return sources.filter(a=>type==='all'||type===a[0]).flatMap(([kind,arr,content,label,tab])=>
  arr.filter(x=>term&&String(content(x)).toLocaleLowerCase().includes(term)).map(x=>({kind,title:label(x),excerpt:clip(String(content(x)),185),id:x.id||'',tab:tab(x)}))).slice(0,100);
}
function renderSearch(){
 const list=searchItems();
 return '<section class="hero"><div class="eyebrow">FIND ANY IDEA</div><h1>Search your desk.</h1><p>One place for your notebook, stickies, books, research and study cards.</p></section>'+
 '<div class="study-search-bar"><span aria-hidden="true">⌕</span><input id="studySearchInput" type="search" autocomplete="off" placeholder="Search theories, researchers, concepts…" value="'+h(query)+'" aria-label="Search PsychDesk" autofocus><span class="study-key-hint">Ctrl K</span></div>'+
 '<div class="study-filter-row">'+[['all','Everything'],...categories].map(([id,label])=>'<button type="button" data-extras="filterSearch" data-value="'+id+'" class="'+(searchType===id?'active':'')+'">'+label+'</button>').join('')+'</div>'+
 '<div id="searchResults" class="study-search-results">'+searchResults(list)+'</div>';
}
function searchResults(list=searchItems()){
 if(!query.trim())return '<div class="study-empty">Start typing to search your entire PsychDesk workspace.</div>';
 if(!list.length)return '<div class="study-empty">No matching study content. Try a different keyword or filter.</div>';
 return '<div class="study-result-count">'+list.length+' results found (up to 100)</div>'+list.map(x=>
  '<button class="study-search-hit" data-extras="openSearch" data-tab="'+h(x.tab)+'" data-kind="'+h(x.kind)+'" data-id="'+h(x.id)+'"><span class="study-kind">'+h(categories.find(c=>c[0]===x.kind)?.[1]||x.kind)+'</span><strong>'+h(x.title)+'</strong><small>'+h(x.excerpt)+'</small></button>').join('');
}
function lookupDOI(raw){
 return String(raw||'').trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'').replace(/^doi:\s*/i,'');
}
function validDOI(s){return /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i.test(s)&&s.length<190}
function renderResearch(){
 const rows=items('research').filter(x=>researchFilter==='all'||x.subjectId===researchFilter).slice().sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
 return '<section class="hero"><div class="eyebrow">YOUR RESEARCH SHELF</div><h1>References & reading.</h1><p>Collect papers, DOIs, and notes on the studies that inform your understanding.</p></section>'+
 '<div class="study-panel"><div class="study-panel-heading"><h2>Add a paper</h2><span>Crossref metadata lookup · editable</span></div>'+
 '<form id="researchForm" class="study-form-grid"><label>DOI (optional)<input name="doi" maxlength="190" placeholder="10.1037/…"></label><label>Title<input name="title" maxlength="230" placeholder="Paper or chapter title"></label>'+
 '<label>Authors<input name="authors" maxlength="260" placeholder="Author names"></label><label>Year<input name="year" type="number" min="1800" max="2100" placeholder="2024"></label>'+
 '<label>Subject<select name="subjectId">'+subjectOptions('')+'</select></label><label>Link (optional)<input name="url" type="url" maxlength="500" placeholder="https://…"></label>'+
 '<label class="span2">Research notes<textarea name="notes" maxlength="3000" rows="3" placeholder="Key findings, limitations, citation notes…"></textarea></label>'+
 '<div class="study-form-actions"><button type="button" data-extras="lookupDOI" class="secondary">Look up DOI</button><button type="submit" class="primary">Save reference</button><span id="doiStatus" role="status"></span></div></form></div>'+
 '<div class="section-row"><h2>Saved references</h2><select id="researchFilter" aria-label="Filter research by subject"><option value="all">All subjects</option>'+data().subjects.map(s=>'<option value="'+h(s.id)+'"'+(researchFilter===s.id?' selected':'')+'>'+h(s.name)+'</option>').join('')+'</select></div>'+
 '<div id="researchItems" class="study-reference-grid">'+(rows.length?rows.map(refCard).join(''):'<div class="study-empty">Your research library is ready. Add a DOI or save a manual reference.</div>')+'</div>';
}
function refCard(p){
 const link=safeUrl(p.url)|| (validDOI(p.doi)?'https://doi.org/'+encodeURI(p.doi):'');
 return '<article class="study-reference"><div class="study-reference-label">'+h(subj(p.subjectId))+' · '+h(p.year||'Year unknown')+'</div><h3>'+h(p.title)+'</h3><p>'+h(p.authors||'Authors not listed')+'</p><small>'+h(p.doi||'')+'</small>'+
 (p.notes?'<p class="study-reference-notes">'+h(p.notes)+'</p>':'')+
 '<div class="study-ref-actions">'+(link?'<a href="'+h(link)+'" target="_blank" rel="noopener noreferrer">Open paper ↗</a>':'')+
 '<button data-extras="cite" data-id="'+h(p.id)+'">Copy reference</button><button data-extras="removeResearch" data-id="'+h(p.id)+'">Remove</button></div></article>';
}
async function lookup(){
 const form=$('#researchForm');if(!form)return;
 const doi=lookupDOI(form.elements.doi.value),state=$('#doiStatus');
 if(!validDOI(doi)){state.textContent='Enter a valid DOI such as 10.1037/example.';return;}
 state.textContent='Finding metadata…';
 try{
  const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),13000);
  let response;
  try{response=await fetch('https://api.crossref.org/works/'+encodeURIComponent(doi),{signal:ctrl.signal,headers:{Accept:'application/json'}});}
  finally{clearTimeout(timeout);}
  if(!response.ok)throw Error('No metadata found. Enter details manually.');
  const msg=(await response.json()).message||{};
  form.elements.title.value=clip(Array.isArray(msg.title)?msg.title[0]:msg.title,230);
  form.elements.authors.value=clip((msg.author||[]).map(p=>(p.given||'')+' '+(p.family||'')).join(', '),260);
  form.elements.year.value=msg.published?.['date-parts']?.[0]?.[0]||msg.issued?.['date-parts']?.[0]?.[0]||'';
  form.elements.doi.value=doi;form.elements.url.value=clip(safeUrl(msg.URL)||'https://doi.org/'+doi,500);
  state.textContent='Metadata found. Review and save.';
 }catch(e){state.textContent='Lookup unavailable. You can add this reference manually.';}
}
function saveResearch(e){
 e.preventDefault();const f=e.currentTarget,doi=lookupDOI(f.elements.doi.value),title=f.elements.title.value.trim(),year=String(f.elements.year.value||'').trim();
 if(!title){core.toast('Enter a paper title.');return;}
 if(doi&&!validDOI(doi)){core.toast('Check the DOI format.');return;}
 const row={id:core.id(),title:clip(title,230),authors:clip(f.elements.authors.value.trim(),260),year:year?Number(year):null,doi,subjectId:f.elements.subjectId.value,
  url:safeUrl(f.elements.url.value),notes:clip(f.elements.notes.value.trim(),3000),createdAt:timestamp()};
 data().research=items('research').concat(row);core.save();core.render();core.toast('Research reference saved');
}
function citation(p){
 const authors=p.authors||'Unknown author',year=p.year||'n.d.';
 return authors+' ('+year+'). '+p.title+'. '+(p.doi?'https://doi.org/'+p.doi:safeUrl(p.url));
}
function fromPdf(doi,title){core.setTab('research');const f=$('#researchForm');if(f){f.elements.doi.value=doi||'';f.elements.title.value=title||'';}}
function renderVoice(){
 const recordings=items('notes').filter(n=>String(n.tags||'').split(',').some(x=>x.trim()==='voice-transcript')).slice().reverse();
 const available=Boolean(window.SpeechRecognition||window.webkitSpeechRecognition);
 return '<section class="hero"><div class="eyebrow">THINK IT. SAY IT. KEEP IT.</div><h1>Voice notes.</h1><p>Speak a lecture insight, review the transcription and save it as an editable study note.</p></section>'+
 '<div class="study-panel"><div class="study-voice-controls"><span id="voiceIndicator" class="'+(voiceMode==='listening'?'on':'')+'">● '+(voiceMode==='listening'?'Listening':'Ready')+'</span><p>Speech transcription uses your browser\'s recognition service and may send speech to its provider. Do not dictate confidential counselling-client information.</p></div>'+
 '<label class="study-voice-label">Note title<input id="voiceTitle" maxlength="140" value="'+h(voiceTitle)+'" placeholder="e.g. Clinical psychology lecture"></label>'+
 '<label class="study-voice-label">Subject<select id="voiceSubject">'+subjectOptions(voiceSubject)+'</select></label>'+
 '<label class="study-voice-label">Transcript (editable)<textarea id="voiceTranscript" maxlength="10000" rows="8" placeholder="Start recording or type your notes…">'+h(voiceText)+'</textarea></label>'+
 '<div class="study-voice-buttons"><button data-extras="startVoice" class="primary" '+(!available||voiceMode==='listening'?'disabled':'')+'>🎙 Start dictation</button><button data-extras="stopVoice" class="secondary" '+(voiceMode!=='listening'?'disabled':'')+'>Stop</button><button data-extras="saveVoice" class="secondary">Save as study note</button></div>'+
 (!available?'<p class="study-warning">Speech recognition is unavailable in this browser. Try Chrome on Android or desktop. You can still type and save a voice-style note.</p>':'')+
 '<p id="voiceHelp" role="status" class="study-voice-help">'+(voiceMode==='listening'?'Speak naturally. Stop when finished.':'Audio is not stored by PsychDesk; only the reviewed transcript is saved.')+'</p></div>'+
 '<div class="section-row"><h2>Saved voice transcripts</h2></div><div class="study-reference-grid">'+(recordings.length?recordings.map(n=>'<button class="study-search-hit" data-extras="openVoiceNote" data-id="'+h(n.id)+'"><strong>'+h(n.title)+'</strong><small>'+h(clip(n.body,180))+'</small></button>').join(''):'<div class="study-empty">No saved transcripts yet.</div>')+'</div>';
}
function updateVoiceButtons(){const start=$('[data-extras="startVoice"]'),stop=$('[data-extras="stopVoice"]');if(start)start.disabled=voiceMode==='listening';if(stop)stop.disabled=voiceMode!=='listening';}
function stopVoice(){try{recognition?.stop();}catch{}recognition=null;voiceMode='idle';const i=$('#voiceIndicator');if(i){i.classList.remove('on');i.textContent='● Ready';}const el=$('#voiceHelp');if(el)el.textContent='Dictation stopped. Review the transcript before saving.';updateVoiceButtons();}
function startVoice(){
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Recognition){core.toast('Voice recognition is not supported in this browser.');return;}
 if(voiceMode==='listening')return;
 const r=new Recognition();recognition=r;
 r.lang=navigator.language||'en-IN';r.continuous=true;r.interimResults=true;
 updateVoiceButtons();
 let committed=voiceText.trim();voiceMode='listening';
 const indicator=$('#voiceIndicator');if(indicator){indicator.classList.add('on');indicator.textContent='● Listening';}updateVoiceButtons();
 r.onresult=e=>{let final='',partial='';
  for(let i=e.resultIndex;i<e.results.length;i++){
   const t=e.results[i][0]?.transcript||'';
   if(e.results[i].isFinal)final+=' '+t;else partial+=' '+t;
  }
  if(final)committed=(committed+' '+final).trim();
  voiceText=committed;voiceInterim=partial;
  const t=$('#voiceTranscript');if(t)t.value=committed+(partial?' '+partial:'');
 };
 r.onerror=e=>{const el=$('#voiceHelp');if(el)el.textContent='Microphone/recognition error: '+(e.error||'unknown')+'. Check permission, browser support and internet.';voiceMode='idle';updateVoiceButtons();};
 r.onend=()=>{voiceMode='idle';recognition=null;const i=$('#voiceIndicator');if(i){i.classList.remove('on');i.textContent='● Ready';}const t=$('#voiceTranscript');if(t)t.value=voiceText;updateVoiceButtons();};
 try{r.start()}catch(e){voiceMode='idle';core.toast('Could not start microphone: '+(e.message||e));}
}
function saveVoice(){
 stopVoice();
 const text=String($('#voiceTranscript')?.value||voiceText).trim();
 const title=String($('#voiceTitle')?.value||voiceTitle).trim()||'Voice note · '+new Date().toLocaleDateString();
 const subjectId=$('#voiceSubject')?.value||voiceSubject;
 if(!text){core.toast('Write or dictate something first.');return;}
 data().notes.unshift({id:core.id(),title:clip(title,140),body:clip(text,10000),tags:'voice-transcript',subjectId,createdAt:timestamp(),updatedAt:timestamp()});
 core.save();voiceText='';voiceTitle='';voiceSubject='';core.render();core.toast('Transcript saved to Notebook');
}
function generateCards(text,subjectId,limit=12){
 const lines=String(text||'').replace(/\r/g,'').split(/\n+/).map(s=>s.trim().replace(/^[•*−-]\s+/,'')).filter(Boolean);
 const cards=[],seen=new Set();
 for(const line of lines){
  let match=line.match(/^(.{3,85}?)(?::\s+|\s+[–—]\s+)(.{10,750})$/);
  if(!match)match=line.match(/^(.{3,85}?)\s+(?:is|refers to|means)\s+(.{10,750})[.]?$/i);
  if(!match)continue;
  const term=match[1].trim().replace(/[.]+$/,''),definition=match[2].trim(),key=term.toLowerCase();
  if(seen.has(key)||definition.length<10)continue;
  seen.add(key);
  cards.push({question:'What is '+term+'?',answer:definition,subjectId:subjectId||'',due:dateToday(),interval:0,reps:0,id:core.id(),source:'text'});
  if(cards.length>=limit)break;
 }
 return cards;
}
function recallPanel(){
 const notes=items('notes'),stickies=items('stickies');
 return '<section class="study-panel study-recall-panel"><div class="study-panel-heading"><h2>Make cards from notes</h2><span>Exact definitions · no AI</span></div>'+
 '<p>Choose a notebook entry, sticky note, or paste definitions formatted as “Term: explanation”. Review the generated cards before adding them.</p>'+
 '<select id="cardSource"><option value="">Paste my own text</option>'+notes.map(n=>'<option value="note:'+h(n.id)+'">'+h(clip(n.title,70))+'</option>').join('')+stickies.map(n=>'<option value="sticky:'+h(n.id)+'">Sticky: '+h(clip(n.title,65))+'</option>').join('')+'</select>'+
 '<textarea id="cardSourceText" rows="4" maxlength="12000" placeholder="Classical conditioning: Learning through association of stimuli.&#10;Operant conditioning: Learning through consequences."></textarea>'+
 '<div class="study-form-actions"><button data-extras="previewCards" class="primary">Preview flashcards</button><span id="generatedCardCount"></span></div><div id="generatedCardPreview"></div></section>';
}
function previewCards(){
 const selected=$('#cardSource')?.value||'';
 let text=$('#cardSourceText')?.value||'',subjectId='';
 if(selected.startsWith('note:')){
  const n=items('notes').find(x=>x.id===selected.slice(5));if(n){text=n.body||'';subjectId=n.subjectId;}
 }else if(selected.startsWith('sticky:')){
  const n=items('stickies').find(x=>x.id===selected.slice(7));if(n){text=(n.lines||[]).join('\n');subjectId=n.subjectId;}
 }
 lastCards=generateCards(text,subjectId,12);
 const target=$('#generatedCardPreview');
 if(target)target.innerHTML=lastCards.length?lastCards.map((x,i)=>'<div class="study-generated-card"><strong>'+h(x.question)+'</strong><p>'+h(x.answer)+'</p><button data-extras="discardCard" data-index="'+i+'">Remove</button></div>').join('')+'<button class="primary" data-extras="saveCards">Add '+lastCards.length+' cards to my deck</button>':'<div class="study-empty">No definitions detected. Use one per line: Term: explanation. This generator does not invent academic facts.</div>';
 const count=$('#generatedCardCount');if(count)count.textContent=String(lastCards.length)+' found';
}
function saveCards(){
 if(!lastCards.length)return;
 const present=new Set(items('cards').map(c=>c.question.toLowerCase()));
 const unique=lastCards.filter(c=>!present.has(c.question.toLowerCase()));
 if(!unique.length){core.toast('These questions are already in your deck.');return;}
 data().cards.push(...unique);core.save();lastCards=[];core.setTab('recall');core.toast(unique.length+' flashcards saved for review');
}
function insightsPanel(){
 const sessions=items('sessions'),reviews=items('reviews'),days=[];
 const now=new Date();now.setHours(12,0,0,0);
 for(let i=83;i>=0;i--){
  const dt=new Date(now);dt.setDate(dt.getDate()-i);
  const date=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
  days.push({date,mins:sessions.filter(s=>s.day===date).reduce((a,s)=>a+Number(s.minutes||0),0)});
 }
 const max=Math.max(45,...days.map(d=>d.mins));
 const last=reviews.slice(-80),good=last.filter(r=>['good','easy'].includes(r.rating)).length,retention=last.length?Math.round(good/last.length*100):null;
 const streak=(()=>{let num=0;for(let i=days.length-1;i>=0;i--){if(!days[i].mins&&i===days.length-1)continue;if(!days[i].mins)break;num++;}return num})();
 return '<section class="study-panel study-insights-more"><div class="study-panel-heading"><h2>Consistency calendar</h2><span>12 weeks · actual logged minutes</span></div>'+
 '<div class="study-heatmap">'+days.map(d=>'<span class="study-heat" style="--heat-opacity:'+Math.max(.12,Math.round(d.mins/max*85)/100)+'" title="'+d.date+' · '+d.mins+' min" aria-label="'+d.date+': '+d.mins+' minutes"></span>').join('')+'</div>'+
 '<div class="study-analytic-row"><div><strong>'+streak+'</strong><span>logged-day streak</span></div><div><strong>'+reviews.length+'</strong><span>total card reviews</span></div><div><strong>'+(retention===null?'—':retention+'%')+'</strong><span>Good / Easy ratings, last 80</span></div></div><p class="study-legal">Ratings show how you assessed your recall, not a scientifically validated memory-retention prediction.</p></section>';
}
function focusPanel(){
 const goal=String(data().focusGoal||'');
 return '<div class="study-panel study-focus-extras"><div class="study-panel-heading"><h2>Your focus environment</h2><span>Custom session intention · original ambient sound</span></div>'+
 '<label class="study-voice-label">What will you work on?<input id="focusIntention" maxlength="145" value="'+h(goal)+'" placeholder="e.g. Read chapter 3 and write a summary"></label>'+
 '<div class="study-sound-controls"><button data-extras="sound" data-mode="off" class="'+(ambientMode==='off'?'active':'')+'">Quiet</button><button data-extras="sound" data-mode="rain" class="'+(ambientMode==='rain'?'active':'')+'">Rain</button><button data-extras="sound" data-mode="brown" class="'+(ambientMode==='brown'?'active':'')+'">Brown noise</button><button data-extras="fullscreen" class="secondary">⛶ Fullscreen focus</button></div><p>Sounds are generated in your browser. They stop when you switch modes or leave the page.</p></div>';
}
function stopAmbient(){try{ambient?.source?.stop();ambient?.context?.close()}catch{}ambient=null;ambientMode='off';}
function sound(mode){
 stopAmbient();
 if(mode==='off'){core.render();return;}
 const Ctx=window.AudioContext||window.webkitAudioContext;
 if(!Ctx){core.toast('Web Audio is unavailable in this browser.');return;}
 try{
  const ctx=new Ctx(),rate=ctx.sampleRate,len=rate*3,buf=ctx.createBuffer(1,len,rate),arr=buf.getChannelData(0);
  let prev=0;for(let i=0;i<len;i++){
   const white=Math.random()*2-1;
   if(mode==='brown'){prev=(prev+.02*white)/1.02;arr[i]=prev*3.1;}else arr[i]=white*.37;
  }
  const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buf;source.loop=true;gain.gain.value=.07;
  source.connect(gain);gain.connect(ctx.destination);source.start();
  ambient={context:ctx,source};ambientMode=mode;core.render();
 }catch(e){ambientMode='off';core.toast('Unable to start ambient audio.');}
}
function fullscreen(){
 const target=$('#main');if(!target)return;
 if(document.fullscreenElement){document.exitFullscreen?.().catch(()=>{});return;}
 target.requestFullscreen?.().catch(()=>core.toast('Fullscreen is not available here.'));
}
function focusChanged(e){
 const target=e.target;if(target?.id!=='focusIntention')return;
 data().focusGoal=clip(target.value,145);core.save();
}
function applySearchTab(tab){core.setTab(tab);}
let captureShown=false;
function showQuickCapture(){
 if(captureShown)return false;
 const params=new URLSearchParams(location.search);
 const title=clip(params.get('shareTitle')||'',140),body=clip(params.get('shareText')||'',3500),url=safeUrl(params.get('shareUrl')||'');
 if(!title&&!body&&!url)return false;
 captureShown=true;
 // Wait for the account state to settle. Confirm before writing to the user's data.
 const open=()=>{
  const markup='<div class="study-share-intro"><p>Review this shared content before saving it to your current PsychDesk account. No changes have been made yet.</p>'+
  '<label>Title<input id="captureTitle" value="'+h(title||'Shared from Android')+'" maxlength="140"></label>'+
  '<label>Content<textarea id="captureText" rows="5" maxlength="4000">'+h([body,url].filter(Boolean).join('\n'))+'</textarea></label>'+
  '<div class="study-form-actions"><button data-extras="saveCaptureNote" class="primary">Save as note</button><button data-extras="saveCaptureSticky" class="secondary">Save as sticky</button><button data-extras="cancelCapture" class="secondary">Cancel</button></div></div>';
  core.openModal('Android quick capture',markup);
 };
 try{history.replaceState(null,'',location.pathname+(location.hash||''));}catch{}
 setTimeout(open,1200);return true;
}
function saveCapture(sticky){
 const title=clip($('#captureTitle')?.value?.trim()||'Shared thought',140);
 const body=clip($('#captureText')?.value?.trim()||'',4000);
 if(!body){core.toast('There is no content to save.');return;}
 if(sticky){
  const result=window.PsychDeskStickies?.generate?.(body,title,'','butter',core.id(),[]);
  if(!result?.length){core.toast('Could not create sticky note.');return;}
  data().stickies.push(...result);
 }else{
  data().notes.unshift({id:core.id(),title,body,subjectId:'',tags:'quick-capture',createdAt:timestamp(),updatedAt:timestamp()});
 }
 core.save();core.closeModal();core.setTab(sticky?'stickies':'notes');core.toast('Shared content saved');
}
document.addEventListener('submit',e=>{if(e.target?.id==='researchForm')saveResearch(e);});
document.addEventListener('input',e=>{
 if(e.target?.id==='studySearchInput'){query=e.target.value;const el=$('#searchResults');if(el)el.innerHTML=searchResults();}
 if(e.target?.id==='voiceTranscript')voiceText=e.target.value;
 if(e.target?.id==='voiceTitle')voiceTitle=e.target.value;
});
document.addEventListener('change',e=>{
 if(e.target?.id==='researchFilter'){researchFilter=e.target.value;core.render();}
 if(e.target?.id==='voiceSubject')voiceSubject=e.target.value;
 if(e.target?.id==='cardSource'){$('#cardSourceText').value='';}
 if(e.target?.id==='focusIntention')focusChanged(e);
});
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-extras]');if(!b)return;e.preventDefault();
 switch(b.dataset.extras){
 case 'filterSearch':searchType=b.dataset.value;core.render();$('#studySearchInput')?.focus();break;
 case 'openSearch':{
  const kind=b.dataset.kind,id=b.dataset.id;
  if(kind==='notes'){const n=items('notes').find(v=>v.id===id);if(n){core.setTab('notes');window.PsychDeskCloud?.noteEditor?.(n);break;}}
  if(kind==='stickies'){const n=items('stickies').find(v=>v.id===id);if(n){window.PsychDeskStickies?.edit?.(n.groupId||n.id);break;}}
  if(kind==='materials'){const n=items('materials').find(v=>v.id===id);if(n&&n.kind!=='link'){window.PsychDeskReader?.open?.(n.id);break;}}
  applySearchTab(b.dataset.tab);break;}
 case 'lookupDOI':lookup();break;
 case 'removeResearch':if(confirm('Remove this saved research reference?')){data().research=items('research').filter(p=>p.id!==b.dataset.id);core.save();core.render();}break;
 case 'cite':{const p=items('research').find(r=>r.id===b.dataset.id);if(p)navigator.clipboard?.writeText(citation(p)).then(()=>core.toast('Citation copied')).catch(()=>core.toast('Clipboard unavailable.'));break;}
 case 'startVoice':startVoice();break;
 case 'stopVoice':stopVoice();break;
 case 'saveVoice':saveVoice();break;
 case 'openVoiceNote':{const n=items('notes').find(v=>v.id===b.dataset.id);if(n)window.PsychDeskCloud?.noteEditor?.(n);break;}
 case 'previewCards':previewCards();break;
 case 'discardCard':lastCards.splice(Number(b.dataset.index),1);{const target=$('#generatedCardPreview');if(target){target.innerHTML=lastCards.map(x=>'<div class="study-generated-card"><strong>'+h(x.question)+'</strong><p>'+h(x.answer)+'</p></div>').join('')+'<button class="primary" data-extras="saveCards">Add '+lastCards.length+' cards</button>';}}break;
 case 'saveCards':saveCards();break;
 case 'sound':sound(b.dataset.mode);break;
 case 'fullscreen':fullscreen();break;
 case 'saveCaptureNote':saveCapture(false);break;
 case 'saveCaptureSticky':saveCapture(true);break;
 case 'cancelCapture':core.closeModal();break;
 }
});
document.addEventListener('keydown',e=>{
 const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||'')||document.activeElement?.isContentEditable;
 if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='k'){e.preventDefault();core.setTab('search');$('#studySearchInput')?.focus();}
 if((e.ctrlKey||e.metaKey)&&e.altKey&&e.key.toLowerCase()==='n'){e.preventDefault();window.PsychDeskCloud?.noteEditor?.();}
 if(!typing&&e.altKey&&!e.ctrlKey&&!e.metaKey&&/^[1-8]$/.test(e.key)){
  const tabs=['today','planner','notes','stickies','recall','materials','research','search'];e.preventDefault();core.setTab(tabs[Number(e.key)-1]);
 }
});
document.addEventListener('click',e=>{if(e.target.closest('[data-tab]')){if(ambient)stopAmbient();if(voiceMode==='listening')stopVoice();}});
window.addEventListener('pagehide',stopAmbient);
window.addEventListener('psychdesk:tab-changed',e=>{if(e.tab!=='focus'&&ambient)stopAmbient();if(e.tab!=='voice'&&voiceMode==='listening')stopVoice();});
window.addEventListener('psychdesk:session-reset',()=>{stopVoice();stopAmbient();voiceText='';voiceTitle='';voiceSubject='';});
window.addEventListener('psychdesk:account-ready',()=>showQuickCapture());
setTimeout(()=>showQuickCapture(),3500);
window.PsychDeskExtras={renderSearch,renderResearch,renderVoice,recallPanel,insightsPanel,focusPanel,generateCards,searchItems,lookupDOI,validDOI,fromPdf,showQuickCapture};
})();