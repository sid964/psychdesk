/* PsychDesk 1.0 — local-first, no analytics, no cloud dependencies. */
(()=>{'use strict';
let lastUid='';
try{lastUid=(localStorage.getItem('psychdesk-last-user-v3')||'').match(/^[A-Za-z0-9_-]+$/)?.[0]||'';}catch{}
let storageKey=lastUid?'psychdesk-user-'+lastUid:'psychdesk-v1';
const colors=['#47796f','#c9965d','#667da6','#9b75a1','#b86d6d','#6a9681'];
const initial=()=>({version:1,subjects:[
 {id:'cog',name:'Cognitive Psychology',color:colors[0]},
 {id:'bio',name:'Biological Psychology',color:colors[1]},
 {id:'dev',name:'Developmental Psychology',color:colors[2]},
 {id:'soc',name:'Social Psychology',color:colors[3]},
 {id:'res',name:'Research Methods',color:colors[4]}],tasks:[],cards:[],sessions:[],reviews:[],stickies:[],inkNotes:[],research:[],boardItems:[],mindMaps:[],pdfHighlights:[],dictionaryEntries:[],dictionaryBookmarks:[],timelineEvents:[],timelineBookmarks:[],timelineAnnotations:[],preferences:{dailyGoal:60}});
let blockedKey='',blockedRaw='',blockedReason='',recoveryDownloaded=false;
function markCorrupt(key,raw,reason){
 blockedKey=key;blockedRaw=String(raw||'');blockedReason=String(reason?.message||reason||'Cannot read study data').slice(0,170);
 recoveryDownloaded=false;
}
function validateSnapshot(value){
 const collections=['subjects','tasks','cards','sessions','notes','reviews','materials','stickies','inkNotes','research','boardItems','mindMaps','pdfHighlights','dictionaryEntries','timelineEvents','timelineAnnotations'];
 if(!value||![1,2].includes(value.version)||!['subjects','tasks','cards','sessions'].every(key=>Array.isArray(value[key])))throw Error('Invalid PsychDesk snapshot');
 for(const key of collections){
  const rows=value[key];if(rows==null)continue;
  if(!Array.isArray(rows)||rows.some(row=>!row||typeof row!=='object'||Array.isArray(row)))throw Error('Invalid PsychDesk records in '+key+'. Your original data is unchanged.');
  for(const row of rows){
   for(const field of ['id','subjectId','title','name','body','question','answer','due','day','tags']){
    if(row[field]!=null&&typeof row[field]!=='string')throw Error('Invalid '+key+' '+field+'. Your original data is unchanged.');
   }
   if(row.minutes!=null&&(!Number.isFinite(row.minutes)||row.minutes<0))throw Error('Invalid study minutes');
  }
 }
 if(value.subjects.some(row=>typeof row.name!=='string'||typeof row.id!=='string'))throw Error('Invalid subject record');
 for(const key of ['dictionaryBookmarks','timelineBookmarks'])if(value[key]!=null&&(!Array.isArray(value[key])||value[key].some(id=>typeof id!=='string')))throw Error('Invalid PsychDesk bookmarks');
 for(const map of value.mindMaps||[])if(!Array.isArray(map.nodes)||!Array.isArray(map.edges)||[...map.nodes,...map.edges].some(row=>!row||typeof row!=='object'))throw Error('Invalid mind map');
 return value;
}
let data;
try{
 const raw=localStorage.getItem(storageKey);
 data=raw?JSON.parse(raw):initial();
 if(!data||![1,2].includes(data.version)||!['subjects','tasks','cards','sessions'].every(k=>Array.isArray(data[k]))||
   ['notes','stickies','inkNotes','research','boardItems','mindMaps','pdfHighlights'].some(k=>data[k]!=null&&!Array.isArray(data[k])))
  throw Error('Saved study data has an incompatible structure');
 validateSnapshot(data);
}catch(e){
 let raw='';try{raw=localStorage.getItem(storageKey)||''}catch{}
 markCorrupt(storageKey,raw,e);data=initial();
}
// Only public preferences belong in study sync or backups.
function normalizePreferences(raw={}){
 const prefs={dailyGoal:Math.max(5,Math.min(600,Number(raw?.dailyGoal)||60))};
 if(typeof raw?.driveClientId==='string' && (!raw.driveClientId || /^[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(raw.driveClientId))) prefs.driveClientId=raw.driveClientId;
 if(raw?.subjectPackVersion===1)prefs.subjectPackVersion=1;
 return prefs;
}
data.materials=Array.isArray(data.materials)?data.materials:[];data.stickies=Array.isArray(data.stickies)?data.stickies:[];data.inkNotes=Array.isArray(data.inkNotes)?data.inkNotes:[];for(const key of ['inkNotes','research','boardItems','mindMaps','pdfHighlights','dictionaryEntries','dictionaryBookmarks','timelineEvents','timelineBookmarks','timelineAnnotations'])data[key]=Array.isArray(data[key])?data[key]:[];data.sessions ||= [];data.reviews ||= [];data.notes ||= [];data.preferences=normalizePreferences(data.preferences);data.version=2;
let tab='today',taskFilter='upcoming',subjectFilter='all',recallSubjectFilter='all',focusTopicId='',flip=false,selectedReviewId=null;
const timerKey=()=> 'psychdesk-timer-v2:'+storageKey;
const freshTimer=()=>({duration:25,remaining:25*60,endsAt:0,running:false,subjectId:data.subjects[0]?.id||'',startedTotal:25*60});
function loadTimer(migrateLegacy=false){
 const fallback=freshTimer();
 try{
  const current=localStorage.getItem(timerKey());
  const previous=JSON.parse(current||(migrateLegacy?localStorage.getItem('psychdesk-timer-v1'):null)||'null');
  if(!previous||![15,25,40,50].includes(previous.duration)||!Number.isFinite(previous.remaining)||previous.remaining<0||
   previous.startedTotal!==previous.duration*60||previous.remaining>previous.startedTotal||typeof previous.running!=='boolean'||
   !Number.isFinite(previous.endsAt)||typeof previous.subjectId!=='string')return fallback;
  if(previous.running)previous.remaining=Math.max(0,Math.min(previous.startedTotal,Math.ceil((previous.endsAt-Date.now())/1000)));
  if(!previous.remaining)previous.running=false;
  if(!current&&migrateLegacy){localStorage.setItem(timerKey(),JSON.stringify(previous));localStorage.removeItem('psychdesk-timer-v1');}
  return {...fallback,...previous};
 }catch{return fallback;}
}
let timer=loadTimer(true);
const saveTimer=()=>{try{localStorage.setItem(timerKey(),JSON.stringify(timer))}catch{}};
const $=s=>document.querySelector(s),main=$('#main');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
const localDay=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const addDays=(date,n)=>{let [y,m,d]=date.split('-').map(Number),x=new Date(y,m-1,d);x.setDate(x.getDate()+n);return localDay(x)};
const niceDay=s=>{if(!s)return 'No due date';let [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString(undefined,{month:'short',day:'numeric'})};
const today=()=>localDay();
const save=(silent=false)=>{
 if(blockedKey===storageKey){toast('Local data needs recovery. Download the original before saving.');return false;}
 try{
  localStorage.setItem(storageKey,JSON.stringify(data));
  if(!silent)window.dispatchEvent(new Event('psychdesk:changed'));
  return true;
 }catch(e){toast('Storage is unavailable. Export your data to avoid losing it.');return false;}
};
// A failed disk write must not change the visible workspace or dismiss an editor.
function commitChange(change){
 const previous=structuredClone(data);
 try{change(data);if(save())return true;}
 catch(error){toast(String(error?.message||'Could not save this change.'));}
 for(const key of Object.keys(data))delete data[key];
 Object.assign(data,previous);
 return false;
}
function recoveryBanner(){
 if(blockedKey!==storageKey)return '';
 return '<section class="account-callout recovery-warning" role="alert"><strong>Saved study data needs recovery</strong>'+
  '<p>PsychDesk could not safely load this browser\'s study record. The original has not been overwritten. '+esc(blockedReason)+
  '</p><div class="button-row"><button type="button" class="secondary" data-action="downloadRecovery">Download original data</button>'+
  '<button type="button" class="secondary" data-action="startRecovery">Start fresh after backup</button></div>'+
  '<p class="note">Saving is paused to protect the original. Download it before choosing to start fresh. If you have a valid backup, you can import it afterwards.</p></section>';
}
function downloadRecovery(){
 if(blockedKey!==storageKey)return;
 const blob=new Blob([blockedRaw],{type:'application/json'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='psychdesk-unreadable-study-recovery-'+new Date().toISOString().slice(0,10)+'.json';
 document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),5000);
 recoveryDownloaded=true;
 toast('Original recovery file downloaded. Keep this backup safe.');
}
function startRecovery(){
 if(blockedKey!==storageKey)return;
 if(!recoveryDownloaded){toast('Download the original data first.');return;}
 if(!confirm('The original local record has been downloaded. Create a fresh local workspace? Your downloaded recovery file will not be changed.'))return;
 const oldKey=blockedKey,oldRaw=blockedRaw;
 blockedKey='';blockedRaw='';blockedReason='';recoveryDownloaded=false;
 if(!save(true)){markCorrupt(oldKey,oldRaw,'Storage is unavailable');render();return;}
 render();toast('Fresh local workspace ready. Your recovery file is safe.');
}
const subj=i=>data.subjects.find(s=>s.id===i);
const subjName=i=>subj(i)?.name||'General';
const safeColor=value=>/^#[0-9a-f]{6}$/i.test(String(value||''))?String(value):'#888888';
const subjColor=i=>safeColor(subj(i)?.color);
const minutesDay=(day)=>data.sessions.filter(s=>s.day===day).reduce((a,s)=>a+s.minutes,0);
const dueCards=()=>data.cards.filter(c=>(c.due||today())<=today());
const dueTasks=()=>data.tasks.filter(t=>!t.done&&(!t.due||t.due<=today())).sort((a,b)=>String(a.due||today()).localeCompare(String(b.due||today())));
const weekDays=()=>Array.from({length:7},(_,i)=>addDays(today(),i-6));
const completedToday=()=>data.tasks.filter(t=>t.completedAt===today()).length;
const totalWeek=()=>weekDays().reduce((v,d)=>v+minutesDay(d),0);
function streak(){let day=today(),count=0;if(minutesDay(day)===0)day=addDays(day,-1);while(minutesDay(day)>0&&count<500){count++;day=addDays(day,-1)}return count;}
function toast(msg){let el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove('show'),3000)}
function setTab(t){window.PsychDeskMotion?.navigate(tab,t);tab=t;flip=false;selectedReviewId=null;if(!window.PsychDeskMotion)window.scrollTo(0,0);render();const heading=main.querySelector?.('h1');if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}const event=new Event('psychdesk:tab-changed');event.tab=t;window.dispatchEvent(event)}
function render(){window.PsychDeskMotion?.beforeRender(main,tab);main.classList.remove('page-enter');const extra=window.PsychDeskExtras,boards=window.PsychDeskBoards;main.innerHTML=recoveryBanner()+(tab==='notes'?window.PsychDeskCloud?.renderNotes():tab==='ink'?window.PsychDeskInk?.render():tab==='stickies'?window.PsychDeskStickies?.render():tab==='materials'?window.PsychDeskMaterials?.render():tab==='reader'?window.PsychDeskReader?.render():tab==='search'?extra?.renderSearch():tab==='research'?window.PsychDeskReferences?.render():tab==='dictionary'?window.PsychDeskKnowledge?.renderDictionary():tab==='timeline'?window.PsychDeskKnowledge?.renderTimeline():tab==='voice'?extra?.renderVoice():tab==='board'?boards?.renderBoard():tab==='mindmap'?boards?.renderMind():tab==='university'||tab==='psychology'?renderPreparation(tab):tab==='tools'?renderTools():tab==='recall'?renderRecall()+(extra?.recallPanel()||''):tab==='focus'?renderFocus()+(extra?.focusPanel()||''):tab==='insights'?renderInsights()+(extra?.insightsPanel()||''):({today:renderToday,planner:renderPlanner}[tab]||renderToday)())||'<div class="empty">Loading study tools…</div>'; document.querySelectorAll('[data-tab]').forEach(b=>{const more=['ink','stickies','materials','university','psychology','reader','research','search','board','mindmap','voice','insights','recall','dictionary','timeline'];b.classList.toggle('active',b.dataset.tab===tab||(b.dataset.tab==='tools'&&((b.classList.contains('nav-item')&&more.includes(tab))||(b.classList.contains('rail-link')&&['stickies','recall','research','dictionary','timeline','insights','reader','search','board','mindmap','voice'].includes(tab)))));if(b.classList.contains('rail-link')||b.classList.contains('nav-item'))b.setAttribute('aria-current',b.classList.contains('active')?'page':'false');});main.classList.add('page-enter');const crumb=document.querySelector('#railCurrentSection');if(crumb)crumb.textContent=({university:'University exam prep',psychology:'Psychology preparation',today:'Study desk',planner:'Subjects & topics',notes:'Knowledge base',ink:'Ink Notes',stickies:'Sticky Notes Studio',recall:'Flashcards',focus:'Deep focus',materials:'Subject library',insights:'Study insights',reader:'Book reader',research:'Reference Manager',dictionary:'Psychology Dictionary',timeline:'History of Psychology',search:'Universal search',voice:'Voice notes',board:'Study board',mindmap:'Mind maps',tools:'Study tools'})[tab]||'Study desk';window.PsychDeskStudio?.enhance(main,tab);if(['board','mindmap'].includes(tab))requestAnimationFrame(()=>window.PsychDeskBoards?.layout());if(tab==='ink')window.PsychDeskInk?.mount();window.PsychDeskMotion?.render(main,tab);}

function renderSyllabus(){
 const courses=window.PsychDeskSyllabus||[];
 return `<section class="prep-syllabus"><div class="section-row"><h2>Your Semester I syllabus</h2><span class="tag">M.A. I · 5 courses</span></div><p class="note">From your supplied syllabus. Each course has 60 hours and 4 credits. Topic labels below are condensed summaries; consult the original for exact wording. Add individual topics to your planner when you are ready.</p>${courses.map((course,ci)=>`<details class="card prep-support"><summary>${esc(course.name)} <span class="tiny">${esc(course.code)}</span></summary>${course.units.map((unit,ui)=>`<section class="prep-unit"><h3>Unit ${ui+1} · ${esc(unit.name)}</h3><ul class="prep-topic-list">${unit.topics.map((title,ti)=>{const key='syllabus-'+course.code+'-'+ui+'-'+ti, task=data.tasks.find(t=>t.id===key);return `<li><span>${ui+1}.${ti+1} ${esc(title)}</span><button class="link-btn" ${task?`data-action="editTask" data-id="${key}"`:`data-action="addSyllabusTopic" data-course="${ci}" data-unit="${ui}" data-topic="${ti}"`}>${task?(task.done?'Completed · Edit':'Planned · Edit'):'Add to plan'}</button></li>`}).join('')}</ul></section>`).join('')}${course.code==='PSY-MJ-103'?`<div class="prep-exam-note"><h3>Statistics examination notes</h3><p class="note">Your syllabus permits a non-scientific calculator. Calculation questions are restricted to percentiles and percentile ranks, normal probability curve applications, product-moment correlation, t-test, one-way ANOVA, and chi-square (2 × 2, equal probability). Interpretation of obtained calculations may also be asked. Other listed topics still belong to the syllabus.</p></div>`:''}</details>`).join('')}</section>`;
}
function addSyllabusTopic(el){
 const course=window.PsychDeskSyllabus?.[Number(el.dataset.course)],ui=Number(el.dataset.unit),ti=Number(el.dataset.topic),title=course?.units[ui]?.topics[ti];
 if(!title)return;
 const key='syllabus-'+course.code+'-'+ui+'-'+ti;
 if(data.tasks.some(t=>t.id===key)){toast('This topic is already in your planner');return;}
 if(!commitChange(()=>{
  let subject=data.subjects.find(s=>s.name.toLowerCase()===course.name.toLowerCase());
  if(!subject){subject={id:id(),name:course.name,color:colors[Number(el.dataset.course)%colors.length],resources:[]};data.subjects.push(subject);}
  data.tasks.push({id:key,title:`${ui+1}.${ti+1} ${title}`,subjectId:subject.id,due:'',minutes:25,done:false,completedAt:''});
 }))return;
 render();toast('Topic added. Use Planned · Edit to set a study date.');
}
function renderPreparation(mode){
 const exam=mode==='university', pending=data.tasks.filter(t=>!t.done).sort((a,b)=>String(a.due||'9999').localeCompare(String(b.due||'9999'))), reviews=dueCards().length;
 const steps=exam?[
 ['1 · Map your syllabus','Add each examinable topic in the planner. Set its next study date; use your actual exam date and marking scheme to decide priority.','planner','Plan syllabus'],
 ['2 · Write from memory','Choose a past-paper question. Close your notes and draft an answer in Ink Notes or your notebook before checking the source.','ink','Practice an answer'],
 ['3 · Check and revisit','Compare against your course rubric. Correct missing points against your source. Make questions from mistakes and schedule another attempt on a later day.','recall','Review flashcards']
 ]:[
 ['1 · Build foundations','Work across biological, cognitive, social and developmental psychology, then methods, measurement and psychopathology. Use your own learning goals to set the order.','planner','Explore subjects'],
 ['2 · Connect and distinguish','Compare two theories: their claims, evidence, limitations and where their predictions differ. Draw the relationship from memory first, then check your sources.','mindmap','Connect theories'],
 ['3 · Apply and evaluate','Explain a concept using a new example. Check the original evidence and separate a study finding from your interpretation.','research','Examine sources']
 ];
 return `<section class="hero"><div class="eyebrow">YOUR STUDY WORKSPACE</div><h1>${exam?'University exam prep.':'Overall psychology prep.'}</h1><p>${exam?'Turn your syllabus into focused revision and answer practice.':'Build understanding across psychology, one connection at a time.'}</p></section>
 <nav class="prep-actions prep-switch" aria-label="Preparation layouts"><button class="secondary" data-tab="university" aria-current="${exam?'page':'false'}">University exams</button><button class="secondary" data-tab="psychology" aria-current="${!exam?'page':'false'}">Overall psychology</button></nav>
 <div class="prep-grid"><section><div class="section-row"><h2>${exam?'Revision queue':'Your next learning topics'}</h2><button class="link-btn" data-action="newTask">+ Add topic</button></div><p class="note">${exam?'Unfinished topics, earliest study date first. These dates are study deadlines, not exam dates.':'Your shared planner topics. Start with a foundation, then connect it to another area.'}</p>${pending.length?pending.slice(0,6).map(taskRow).join(''):'<div class="empty">Add a syllabus or learning topic to build your study queue.</div>'}
 ${pending.length>6?'<button class="link-btn prep-support" data-tab="planner">View all '+pending.length+' unfinished topics →</button>':''}<div class="section-row"><h2>Study sequence</h2></div><div class="prep-steps">${steps.map(([title,copy,target,label])=>`<article class="card"><h3>${title}</h3><p class="note">${copy}</p><button class="link-btn" data-tab="${target}">${label} →</button></article>`).join('')}</div></section>
 <aside aria-label="Study support"><div class="banner"><div class="eyebrow">RETRIEVE BEFORE REREADING</div><h2>${reviews?reviews+' cards due':'Start with a question.'}</h2><p>Try to recall the answer before revealing it. Check mistakes and use the existing review schedule to space future practice.</p><button class="pill-btn" data-tab="recall">Open flashcards →</button></div>
 <div class="card prep-support"><h2>Try this next</h2><p class="note">${exam?'Cognitive Processes: explain Piaget and Vygotsky from memory, then check the differences. Statistics: compare when an independent or paired t-test is appropriate; solve a syllabus-permitted example and interpret the result.':'Compare two explanations of attention from memory. Give a new everyday example, then check which evidence supports each explanation.'}</p><p class="note">Work through one idea before switching to a related one. Compare them deliberately; avoid rapid switching between unrelated tasks.</p><button class="link-btn" data-tab="notes">Open your notebook →</button></div>
 <div class="card prep-support"><h2>One focused session</h2><p class="note">Choose one concrete outcome: explain a concept or answer a question. Study, check your answer, then use a topic’s target date to plan another attempt on a later day. Spread practice across days rather than saving it all for the night before an exam.</p><button class="secondary" data-tab="focus">Open focus room →</button></div>
 <details class="card prep-support"><summary>Why this study sequence?</summary><p class="note">Retrieval practice and distributing practice over time support lasting learning. After learning the basics, compare related ideas to practice telling them apart. No single screen layout guarantees better results.</p><p class="note">Practical guides from the Learning Scientists: <a href="https://www.learningscientists.org/blog/2016/6/23-1" target="_blank" rel="noopener noreferrer">retrieval practice</a>, <a href="https://www.learningscientists.org/blog/2016/7/21-1" target="_blank" rel="noopener noreferrer">spaced practice</a>, and <a href="https://www.learningscientists.org/blog/2016/8/11-1" target="_blank" rel="noopener noreferrer">interleaving</a>.</p><p class="note">Research review: <a href="https://doi.org/10.1177/1529100612453266" target="_blank" rel="noopener noreferrer">Dunlosky et al. (2013), Improving Students’ Learning With Effective Learning Techniques</a>. Adapt practice to your course and check answers against reliable sources.</p></details>
 <p class="note prep-support">These layouts share your existing study data. Switching layouts does not move or reset your work.</p></aside></div>${exam?renderSyllabus():''}`;
}

function renderTools(){
 const groups=[
 ['Choose your preparation',['Two focused routes through the same study tools.'],[
 ['university','▤','University exam prep','Your semester syllabus, revision topics and answer practice.'],
 ['psychology','ψ','Overall psychology prep','Understand concepts, compare theories and apply ideas.']]],
 ['Capture and organize',['Choose how you want to keep your study material.'],[
 ['notes','✎','Typed notes','Write and organize your notebook.'],['ink','✒','Handwritten notes','Write or draw with a pen, touch or mouse.'],['stickies','▧','Sticky notes','Keep short reminders and ideas.'],['materials','✧','Subject library','Organize books, files and study links.'],['reader','▤','Book reader','Read and annotate PDFs.']]],
 ['Practice and connect',['Use these after choosing a topic.'],[
 ['recall','◇','Flashcards','Recall an answer, then check and schedule review.'],['focus','◷','Focus room','Time one study session and log it when finished.'],['mindmap','◇','Mind maps','Connect concepts and compare theories.'],['board','✳','Study board','Arrange ideas visually.']]],
 ['Look up and explore',['Find material or check a concept.'],[
 ['search','⌕','Search your workspace','Find your saved notes, cards and references.'],['dictionary','A–Z','Psychology dictionary','Look up concepts and your glossary.'],['research','▧','Reference manager','Organize sources, DOIs and citations.'],['timeline','◷','Psychology timeline','Explore historical milestones.']]],
 ['Additional tools',['Optional ways to capture and review your work.'],[
 ['voice','◉','Voice notes','Dictate a draft and edit the transcript.'],['insights','▥','Study insights','Review logged activity and recall ratings.']]]
 ];
 return '<section class="hero"><div class="eyebrow">EVERYTHING IN ONE PLACE</div><h1>Study tools.</h1><p>Choose a purpose first. You do not need to use every tool.</p></section>'+groups.map(([title,description,tools])=>'<section class="tool-group"><h2>'+title+'</h2><p class="note">'+description[0]+'</p><div class="study-tools-grid">'+tools.map(t=>'<button type="button" data-tab="'+t[0]+'" class="study-tool-launcher"><span aria-hidden="true">'+t[1]+'</span><strong>'+t[2]+'</strong><small>'+t[3]+'</small></button>').join('')+'</div></section>').join('')+'<details class="study-panel"><summary>Keyboard shortcuts</summary><p>Ctrl / Cmd + K · Search your workspace</p><p>Ctrl / Cmd + Alt + N · New notebook note</p><p>Alt + 1–8 · Switch core study sections</p></details>';
}

function taskRow(t){let isOverdue=t.due&&t.due<today()&&!t.done;return `<div class="task-row"><button class="check-btn ${t.done?'done':''}" data-action="toggleTask" data-id="${esc(t.id)}" aria-label="${t.done?'Mark incomplete':'Mark complete'}">${t.done?'✓':''}</button><div class="task-main"><div class="task-name ${t.done?'completed':''}">${esc(t.title)}</div><div class="task-sub"><span class="dot" style="background:${esc(subjColor(t.subjectId))}"></span>${esc(subjName(t.subjectId))}<span>·</span>${t.due?`<span class="${isOverdue?'tag overdue':''}">${isOverdue?'Overdue · ':''}${niceDay(t.due)}</span>`:'Flexible'}<span>·</span>${t.minutes||25} min</div></div><div class="task-actions">${t.due?`<button class="mini-btn" data-action="calendar" data-id="${esc(t.id)}" title="Add to calendar">▣</button>`:''}<button class="mini-btn" data-action="editTask" data-id="${esc(t.id)}" title="Edit topic">✎</button></div></div>`}
function renderToday(){
 const pending=data.tasks.filter(t=>!t.done).slice().sort((a,b)=>String(a.due||'9999').localeCompare(String(b.due||'9999'))),next=pending[0],rev=dueCards().length,goal=data.preferences.dailyGoal||60,minutes=minutesDay(today()),recent=data.notes.slice().sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))[0];
 return `<div class="dashboard-page study-home"><section class="hero"><div class="eyebrow">${new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})} · PSYCHOLOGY</div><h1>Your study desk.</h1><p>A place to wonder, scribble, and figure things out.</p><button type="button" class="secondary desk-write" data-cloud="newNote">✎ Just start writing</button></section>
 <div class="study-home-layout"><div>
 <section class="study-desk-sheet" aria-labelledby="deskTopic"><div class="eyebrow">${next?'NEXT IN YOUR PLAN':'START WITH YOUR COURSE'}</div><h2 id="deskTopic">${next?esc(next.title):'What will you understand today?'}</h2><p class="note">${next?esc(subjName(next.subjectId))+' · '+(next.minutes||25)+' min'+(next.due?' · Planned '+niceDay(next.due):' · Flexible study date'):'Your M.A. Semester I syllabus is ready: five courses, broken down into units and topics.'}</p><div class="desk-rule"></div><p class="desk-instruction">${next?'Before opening your notes, write what you already know. Study what is missing, then explain it again in your own words.':'Begin with Cognitive Processes, Psychometrics, Statistics, Research Methods or Sports Psychology. Choose one topic, rather than opening every tool.'}</p><div class="prep-actions">${next?`<button class="primary" data-action="studyTopic" data-id="${esc(next.id)}">Study this topic →</button><button class="link-btn" data-action="editTask" data-id="${esc(next.id)}">Change study date</button>`:'<button class="primary" data-tab="university">Open your syllabus →</button>'}</div></section>
 <section class="desk-paths" aria-labelledby="prepPaths"><div class="section-row"><h2 id="prepPaths">What are you preparing for?</h2></div><div class="desk-path-grid prep-entry"><button class="card desk-path" data-tab="university"><span class="eyebrow">YOUR SEMESTER</span><strong>University exams</strong><span class="note">Your syllabus, revision plan and answer practice.</span><span class="desk-path-link">Continue exam preparation →</span></button><button class="card desk-path" data-tab="psychology"><span class="eyebrow">BEYOND THE EXAM</span><strong>Overall psychology</strong><span class="note">Understand theories, connect evidence and apply ideas.</span><span class="desk-path-link">Explore psychology →</span></button></div></section>
 ${pending.length?`<section><div class="section-row"><h2>On your study list</h2><button class="link-btn" data-tab="planner">View plan →</button></div>${pending.slice(0,3).map(taskRow).join('')}</section>`:''}
 </div><aside aria-label="Keep learning"><section class="card desk-question"><div class="eyebrow">A QUESTION TO THINK THROUGH</div><h2>How would you tell whether a psychological test is reliable, valid, or both?</h2><p class="note">A starter prompt from your Psychometrics course. Define each term, give an example, then check your course material.</p><button class="link-btn" data-cloud="newNote">Write your answer →</button></section>
 <section class="desk-recall"><div class="section-row"><h2>Bring it back to mind</h2></div><p class="note">${rev?rev+' flashcard'+(rev===1?' is':'s are')+' ready. Try the answer before revealing it.':'Turn a difficult idea into a question you can revisit later.'}</p><button class="secondary" data-tab="recall">${rev?'Review your cards':'Open flashcards'} →</button></section>
 ${recent?`<section class="desk-recent"><div class="section-row"><h2>Back to your notebook</h2></div><button class="card desk-note" data-cloud="editNote" data-id="${esc(recent.id)}"><strong>${esc(recent.title||'Untitled note')}</strong><span class="note">${esc((recent.body||'').slice(0,120))}</span><span class="desk-path-link">Continue writing →</span></button></section>`:''}
 <details class="desk-progress"><summary>Today’s progress · ${minutes} min studied</summary><p class="note">${completedToday()} topics completed · ${minutes} / ${goal} minute goal</p><button class="link-btn" data-tab="insights">See your study history →</button></details></aside></div></div>`;
}

const MIT_STUDY='https://ocw.mit.edu/courses/9-00sc-introduction-to-psychology-fall-2011/resources/lecture-videos/';
const BOOK_STUDY='https://openstax.org/books/psychology-2e/pages/';
const STUDY_LIBRARY=[
{match:/cognit|memory|thinking|intelligence|attention|perception/i,ch:'8-introduction',name:'Memory and cognition',vid:'Lecture 10: Memory I',slug:'lecture-10-memory-i/'},
{match:/biolog|neuro|brain|physio/i,ch:'3-introduction',name:'Biopsychology',vid:'Lecture 3: Brain I',slug:'lecture-3-brain-i/'},
{match:/develop|child|lifespan/i,ch:'9-introduction',name:'Lifespan development',vid:'Lecture 17: Child Development',slug:'lecture-17-child-development/'},
{match:/social|group|personality/i,ch:'12-introduction',name:'Social psychology',vid:'Lecture 22: Social Psychology I',slug:'lecture-22-social-psychology-i/'},
{match:/research|statistics|method|experiment/i,ch:'2-introduction',name:'Psychological research',vid:'Lecture 2: Science and Research',slug:'lecture-2-science-and-research/'}];
function resourceDialog(subject){if(!subject)return;const found=STUDY_LIBRARY.find(a=>a.match.test(subject.name)),links=[
{title:found?.name||'Psychology 2e · free textbook',type:'Read',provider:'OpenStax',url:BOOK_STUDY+(found?.ch||'preface')},
{title:found?.vid||'Introduction to Psychology · video lectures',type:'Watch',provider:'MIT OpenCourseWare',url:MIT_STUDY+(found?.slug||'')},
...(Array.isArray(subject.resources)?subject.resources.filter(a=>a&&/^https?:\/\//.test(a.url||'')).slice(0,12).map(a=>({...a,type:'Link',provider:'Your link'})):[])];
openModal('Study resources',`<div class="resource-modal-head"><span class="eyebrow">FREE STUDY MATERIALS</span><h3>${esc(subject.name)}</h3><p class="note">Read from OpenStax or watch MIT lectures. Your own saved links appear here too.</p></div><div class="resource-list">${links.map(a=>`<a class="resource-item" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer"><span class="resource-icon">${a.type==='Watch'?'▷':'↗'}</span><span class="resource-copy"><span class="resource-kicker">${esc(a.provider)} · ${esc(a.type)}</span><strong>${esc(a.title)}</strong></span><span class="resource-arrow">↗</span></a>`).join('')}</div>`);}

function renderPlanner(){let tasks=data.tasks.filter(t=>subjectFilter==='all'||t.subjectId===subjectFilter);
if(taskFilter==='upcoming')tasks=tasks.filter(t=>!t.done);
if(taskFilter==='done')tasks=tasks.filter(t=>t.done);
tasks.sort((a,b)=>(a.done===b.done?0:a.done?1:-1)||String(a.due||'9999').localeCompare(String(b.due||'9999')));
return `<section class="hero"><div class="eyebrow">YOUR SYLLABUS, YOUR PACE</div><h1>Study planner.</h1><p>Break subjects down into manageable topics.</p></section>
<div class="section-row"><h2>Study topics</h2><button class="link-btn" data-action="newTask">+ New topic</button></div><div class="filter-row"><button class="filter ${taskFilter==='upcoming'?'active':''}" data-action="filterTask" data-value="upcoming" aria-pressed="${taskFilter==='upcoming'}">To do</button><button class="filter ${taskFilter==='done'?'active':''}" data-action="filterTask" data-value="done" aria-pressed="${taskFilter==='done'}">Completed</button><button class="filter ${taskFilter==='all'?'active':''}" data-action="filterTask" data-value="all" aria-pressed="${taskFilter==='all'}">All</button></div>
<div class="field"><select aria-label="Filter by subject" id="subjectFilter"><option value="all">All subjects</option>${data.subjects.map(s=>`<option value="${esc(s.id)}" ${subjectFilter===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
${tasks.length?tasks.map(taskRow).join(''):`<div class="empty">Nothing here yet. Add a topic or change the filter.</div>`}
<div class="section-row" style="margin-top:0"><h2>Subjects</h2><button class="link-btn" data-action="newSubject">+ Add subject</button></div><div class="subject-grid">${data.subjects.map(s=>{let ts=data.tasks.filter(t=>t.subjectId===s.id),done=ts.filter(t=>t.done).length,pct=ts.length?Math.round(done/ts.length*100):0;return `<article class="subject-card"><div class="colorbar" style="background:${safeColor(s.color)}"></div><strong>${esc(s.name)}</strong><p>${done}/${ts.length} topics completed</p><div class="progress"><div style="width:${pct}%;background:${safeColor(s.color)}"></div></div><div class="subject-links"><button class="subject-resource-btn" data-action="subjectMaterials" data-id="${esc(s.id)}">Study materials <span>↗</span></button><button class="subject-edit-btn" data-action="editSubject" data-id="${esc(s.id)}" title="Edit subject" aria-label="Edit subject">✎</button></div></article>`}).join('')||`<div class="empty" style="grid-column:1/-1">Add your first subject.</div>`}</div>
<div class="resource-hint">✦ Each subject has its own books, PDFs, notes and study links.</div><div class="spacer"></div><p class="note">Starter subjects are examples. Tap any subject to rename or delete it to match your actual syllabus.</p>`}
function renderRecall(){if(recallSubjectFilter!=='all'&&!data.subjects.some(s=>s.id===recallSubjectFilter))recallSubjectFilter='all';const deck=data.cards.filter(c=>recallSubjectFilter==='all'||c.subjectId===recallSubjectFilter),revs=dueCards().filter(c=>recallSubjectFilter==='all'||c.subjectId===recallSubjectFilter);if(selectedReviewId&&!revs.find(c=>c.id===selectedReviewId))selectedReviewId=null;let c=revs.find(c=>c.id===selectedReviewId)||revs[0];
return `<section class="hero"><div class="eyebrow">SPACED REPETITION</div><h1>Recall & retain.</h1><p>Test yourself before revealing the answer.</p></section>
<div class="summary-grid"><div class="stat"><span class="number">${data.cards.length}</span><span class="stat-label">TOTAL CARDS</span></div><div class="stat"><span class="number">${revs.length}</span><span class="stat-label">DUE NOW</span></div><div class="stat"><span class="number">${data.reviews.filter(r=>r.day===today()).length}</span><span class="stat-label">REVIEWED TODAY</span></div></div>
<div class="field"><label for="recallSubjectFilter">Review subject</label><select id="recallSubjectFilter"><option value="all">All subjects</option>${data.subjects.map(s=>`<option value="${esc(s.id)}" ${recallSubjectFilter===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div><div class="section-row"><h2>Review queue</h2><button class="link-btn" data-action="newCard">+ New card</button></div>
${c?`<div class="card"><div class="kpi-header"><span class="tag">${esc(subjName(c.subjectId))}</span><span class="tiny">${revs.length} due</span></div><div style="padding:22px 2px 10px"><div class="eyebrow">QUESTION</div><div class="review-q">${esc(c.question)}</div></div>${flip?`<div class="answer"><div class="eyebrow">ANSWER</div>${esc(c.answer)}</div><div class="review-btns"><button data-action="rate" data-id="${esc(c.id)}" data-rating="again">Again</button><button data-action="rate" data-id="${esc(c.id)}" data-rating="hard">Hard</button><button data-action="rate" data-id="${esc(c.id)}" data-rating="good">Good</button><button data-action="rate" data-id="${esc(c.id)}" data-rating="easy">Easy</button></div>`:`<button class="primary" style="margin-top:18px;width:100%" data-action="flip">Reveal answer</button>`}</div>`:`<div class="empty"><div class="empty-symbol">◇</div>${deck.length?'All caught up! No flashcards due for this selection.':'No flashcards in this selection. Add a question and answer or choose another subject.'}</div>`}
<div class="section-row"><h2>Your deck</h2><span class="tiny">${deck.length} cards in this selection</span></div>
${deck.length?deck.slice().sort((a,b)=>String(a.due||today()).localeCompare(String(b.due||today()))).map(c=>`<div class="task-row"><div class="task-main"><div class="task-name">${esc(c.question)}</div><div class="task-sub">${esc(subjName(c.subjectId))} · Next ${niceDay(c.due)}</div></div><button class="mini-btn" data-action="editCard" data-id="${esc(c.id)}" aria-label="Edit flashcard: ${esc(c.question)}">✎</button></div>`).join(''):`<div class="note">Create cards from your lecture notes using your own words.</div>`}
<div class="spacer"></div><p class="note">Review intervals are simple estimates based on your self-rating, not a guarantee of long-term retention.</p>`}
function renderFocus(){const ss=data.subjects;const remaining=timer.running?Math.max(0,Math.ceil((timer.endsAt-Date.now())/1000)):timer.remaining;
return `<section class="hero"><div class="eyebrow">ATTENTION IS A PRACTICE</div><h1>Focus session.</h1><p>Do one meaningful thing, without switching tasks.</p></section>
${data.tasks.some(t=>t.id===focusTopicId)?`<section class="card focus-study-context"><div class="eyebrow">YOUR TOPIC FOR THIS SESSION</div><h2>${esc(data.tasks.find(t=>t.id===focusTopicId).title)}</h2><p class="note">Read or write alongside the timer. Finish by explaining the idea without your notes.</p><button class="link-btn" data-tab="notes">Open your notebook →</button></section>`:''}<div class="card"><div class="eyebrow" style="text-align:center;margin-top:8px">STUDY TIMER</div><div class="timer-ring"><div class="focus-clock" id="clock">${clock(remaining)}</div></div>
<div class="select-strip">${[15,25,40,50].map(n=>`<button data-action="timerLength" data-min="${n}" class="${timer.duration===n?'active':''}" ${timer.running?'disabled':''}>${n} min</button>`).join('')}</div>
<div class="field"><label for="focusSubject">Studying</label><select id="focusSubject" ${timer.running?'disabled':''}><option value="">General study</option>${ss.map(s=>`<option value="${esc(s.id)}" ${s.id===timer.subjectId?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
<div class="button-row">${timer.running?`<button class="primary" data-action="pause">Pause</button>`:`<button class="primary" data-action="startTimer">${remaining===0?'Start again':remaining<timer.duration*60?'Resume':'Begin focus'}</button>`}<button class="secondary" data-action="completeTimer" ${timer.startedTotal-remaining<60?'disabled':''}>Finish & log</button></div>
<div style="text-align:center;margin-top:13px"><button class="link-btn" data-action="resetTimer">Reset timer</button></div></div>
<div class="section-row"><h2>Today so far</h2><span class="tag">${minutesDay(today())} min logged</span></div><p class="note">Sessions are logged when you tap Finish & log. The timer itself does not keep you focused or automatically verify study time.</p>`}
function renderInsights(){const days=weekDays(),max=Math.max(60,...days.map(minutesDay)),todayMinutes=minutesDay(today());const minutesBySub=data.subjects.map(s=>({s,min:data.sessions.filter(v=>v.subjectId===s.id).reduce((a,v)=>a+v.minutes,0)})).filter(x=>x.min>0).sort((a,b)=>b.min-a.min);
return `<section class="hero"><div class="eyebrow">REVIEW THE PROCESS</div><h1>Your progress.</h1><p>Build consistency, not perfection.</p></section><div class="summary-grid"><div class="stat"><span class="number">${totalWeek()}</span><span class="stat-label">MIN THIS WEEK</span></div><div class="stat"><span class="number">${streak()}</span><span class="stat-label">DAY STREAK</span></div><div class="stat"><span class="number">${data.tasks.filter(t=>t.done).length}</span><span class="stat-label">TOPICS FINISHED</span></div></div>
<div class="section-row"><h2>Last 7 days</h2><span class="tiny">Minutes studied</span></div><div class="card"><div class="chart">${days.map((d,i)=>{const min=minutesDay(d);return `<div class="chart-item"><span class="chart-value">${min||''}</span><div class="chart-bar ${i===6?'current':''}" style="height:${Math.max(3,Math.round(min/max*110))}px"></div><span class="chart-label">${new Date(d+'T12:00').toLocaleDateString(undefined,{weekday:'short'}).slice(0,2)}</span></div>`}).join('')}</div><div class="note" style="margin-top:14px">${todayMinutes?'You have logged '+todayMinutes+' minutes today.':'Start a focus session to record your first study minutes.'}</div></div>
<div class="section-row"><h2>Time by subject</h2></div>${minutesBySub.length?minutesBySub.map(x=>`<div class="card" style="margin-bottom:9px"><div class="kpi-header"><strong>${esc(x.s.name)}</strong><span class="tiny">${x.min} min</span></div><div class="progress" style="margin-top:11px"><div style="width:${Math.round(x.min/Math.max(1,minutesBySub[0].min)*100)}%;background:${safeColor(x.s.color)}"></div></div></div>`).join(''):`<div class="empty">No sessions logged yet. Your subject breakdown will appear here.</div>`}
<div class="section-row"><h2>Next improvement</h2></div><div class="subtle">Try planning just 1–3 realistic topics each day. Add a few recall questions after each session, then review them regularly.</div>`}
function clock(s){s=Math.max(0,s);return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
let modalOpener=null;
function openModal(title,content){
 // Opening another dialog must flush an existing note editor before its fields disappear.
 if($('#modalRoot')?.innerHTML)window.dispatchEvent(new Event('psychdesk:before-modal-close'));
 else modalOpener=document.activeElement;
 $('#modalRoot').innerHTML=`<div class="modal-overlay"><div class="modal" tabindex="-1" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-header"><h2>${esc(title)}</h2><button class="close" data-action="closeModal" aria-label="Close">×</button></div>${content}</div></div>`;
 document.querySelector('.app-shell')?.setAttribute('inert','');
 document.body.classList.add('modal-open');
 // Associate the existing field labels, including extension-generated forms.
 document.querySelectorAll('.modal .field label').forEach((label,index)=>{
  const field=label.parentElement?.querySelector('input:not([type="hidden"]),textarea,select');
  if(field&&!label.htmlFor){if(!field.id)field.id='dialog-field-'+index;label.htmlFor=field.id;}
 });
 window.PsychDeskMotion?.opened($('#modalRoot .modal'));
 const x=$('.modal input:not([type="hidden"]),.modal textarea,.modal select')||$('.modal');x?.focus();
}
function closeModal(options={}){
 window.PsychDeskMotion?.closed();
 const wasOpen=Boolean($('#modalRoot').innerHTML);
 const event=new Event('psychdesk:before-modal-close');event.discardNoteId=options?.discardNoteId;
 window.dispatchEvent(event);window.PsychDeskMotion?.dismiss?.($('#modalRoot .modal-overlay'));$('#modalRoot').innerHTML='';
 document.querySelector('.app-shell')?.removeAttribute?.('inert');document.body.classList.remove('modal-open');
 if(wasOpen){if(modalOpener?.isConnected)modalOpener.focus();else main.focus();}modalOpener=null;
}
document.addEventListener('keydown',event=>{
 if(event.key!=='Tab')return;
 const dialog=$('#modalRoot .modal');if(!dialog)return;
 const controls=[...dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"],summary')].filter(el=>el.getClientRects().length);
 const first=controls[0],last=controls.at(-1);
 if(!first){event.preventDefault();dialog.focus();return;}
 if(event.shiftKey&&(document.activeElement===first||!controls.includes(document.activeElement))){event.preventDefault();last.focus();}
 else if(!event.shiftKey&&(document.activeElement===last||!controls.includes(document.activeElement))){event.preventDefault();first.focus();}
});
function subjectOptions(sel){return `<option value="">General / unassigned</option>${data.subjects.map(s=>`<option value="${esc(s.id)}" ${s.id===sel?'selected':''}>${esc(s.name)}</option>`).join('')}`}
function taskForm(t){t||={title:'',subjectId:data.subjects[0]?.id||'',due:today(),minutes:25,id:''};openModal(t.id?'Edit study topic':'New study topic',`<form id="taskForm"><input type="hidden" name="id" value="${esc(t.id)}"><div class="field"><label>Topic / task *</label><input name="title" maxlength="140" required placeholder="e.g. Classical conditioning" value="${esc(t.title)}"></div><div class="field"><label>Subject</label><select name="subjectId">${subjectOptions(t.subjectId)}</select></div><div class="field"><label>Target date</label><input name="due" type="date" value="${esc(t.due||'')}"></div><div class="field"><label>Estimated study minutes</label><input name="minutes" type="number" min="5" max="480" value="${t.minutes||25}"></div><div class="modal-footer"><button type="submit" class="primary">Save topic</button>${t.id?`<button type="button" class="secondary" data-action="deleteTask" data-id="${esc(t.id)}">Delete</button>`:''}</div></form>`);$('#taskForm').addEventListener('submit',e=>{e.preventDefault();let f=new FormData(e.target),title=String(f.get('title')||'').trim();if(!title)return;let existing=data.tasks.find(x=>x.id===f.get('id'));let obj={id:existing?.id||id(),title,subjectId:String(f.get('subjectId')||''),due:String(f.get('due')||''),minutes:Math.max(5,Math.min(480,Number(f.get('minutes'))||25)),done:existing?.done||false,completedAt:existing?.completedAt||''};if(!commitChange(()=>{if(existing)Object.assign(existing,obj);else data.tasks.push(obj)}))return;closeModal();render();toast('Study topic saved')});}
function subjectForm(s){s||={id:'',name:'',color:colors[data.subjects.length%colors.length]};openModal(s.id?'Edit subject':'New subject',`<form id="subjectForm"><input type="hidden" name="id" value="${esc(s.id)}"><div class="field"><label>Subject name *</label><input name="name" maxlength="65" required placeholder="e.g. Abnormal Psychology" value="${esc(s.name)}"></div><div class="field"><label>Subject color</label><select name="color">${colors.map(c=>`<option value="${c}" ${s.color===c?'selected':''}>${{'#47796f':'Forest','#c9965d':'Ochre','#667da6':'Slate blue','#9b75a1':'Lilac','#b86d6d':'Rose','#6a9681':'Sage'}[c]}</option>`).join('')}</select></div><div class="field"><label>Personal study links (optional)</label><textarea name="resources" rows="3" placeholder="Video title | https://example.com/video">${esc((s.resources||[]).map(r=>r.title+' | '+r.url).join('\n'))}</textarea><div class="field-hint">One resource per line: Title | URL. Links sync with your subject.</div></div><div class="modal-footer"><button class="primary" type="submit">Save subject</button>${s.id?`<button class="secondary" type="button" data-action="deleteSubject" data-id="${esc(s.id)}">Delete</button>`:''}</div></form>`);$('#subjectForm').addEventListener('submit',e=>{e.preventDefault();let f=new FormData(e.target),nm=String(f.get('name')||'').trim();if(!nm)return;let existing=data.subjects.find(x=>x.id===f.get('id'));const resources=String(f.get('resources')||'').split('\n').map(x=>x.split('|')).filter(x=>x.length>=2).map(x=>({title:String(x[0]).trim().slice(0,95),url:String(x.slice(1).join('|')).trim()})).filter(x=>x.title&&/^https?:\/\//i.test(x.url)&&x.url.length<1200).slice(0,12);if(!commitChange(()=>{if(existing){existing.name=nm;existing.color=String(f.get('color'));existing.resources=resources}else data.subjects.push({id:id(),name:nm,color:String(f.get('color')),resources})}))return;closeModal();render();toast('Subject saved')});}
function cardForm(c){c||={id:'',question:'',answer:'',subjectId:data.subjects[0]?.id||''};openModal(c.id?'Edit flashcard':'Create flashcard',`<form id="cardForm"><input type="hidden" name="id" value="${esc(c.id)}"><div class="field"><label>Question *</label><textarea name="question" maxlength="500" required placeholder="What is operant conditioning?">${esc(c.question)}</textarea></div><div class="field"><label>Answer *</label><textarea name="answer" maxlength="1500" required placeholder="Your explanation in your own words">${esc(c.answer)}</textarea></div><div class="field"><label>Subject</label><select name="subjectId">${subjectOptions(c.subjectId)}</select></div><div class="modal-footer"><button class="primary" type="submit">Save card</button>${c.id?`<button class="secondary" type="button" data-action="deleteCard" data-id="${esc(c.id)}">Delete</button>`:''}</div></form>`);$('#cardForm').addEventListener('submit',e=>{e.preventDefault();let f=new FormData(e.target),q=String(f.get('question')||'').trim(),a=String(f.get('answer')||'').trim();if(!q||!a)return;let existing=data.cards.find(c=>c.id===f.get('id'));if(!commitChange(()=>{if(existing){existing.question=q;existing.answer=a;existing.subjectId=String(f.get('subjectId'))}else data.cards.push({id:id(),question:q,answer:a,subjectId:String(f.get('subjectId')),due:today(),interval:0,reps:0})}))return;closeModal();render();toast('Flashcard saved')});}
function updateReview(card,rating){if(!['again','hard','good','easy'].includes(rating))return;if(!commitChange(()=>{let prev=card.interval||0;if(rating==='again'){card.interval=1}else if(rating==='hard'){card.interval=Math.max(1,Math.round(prev*1.2))}else if(rating==='good'){card.interval=prev?Math.max(2,Math.round(prev*2.2)):1}else{card.interval=prev?Math.max(3,Math.round(prev*3)):3}card.interval=Math.min(365,card.interval);card.reps=(card.reps||0)+1;card.due=addDays(today(),card.interval);data.reviews.push({day:today(),cardId:card.id,rating})}))return;selectedReviewId=null;flip=false;render();const next=document.querySelector('[data-action="flip"]')||main.querySelector('h1');if(next){next.setAttribute('tabindex','-1');next.focus({preventScroll:true});}toast(`Next review in ${card.interval} day${card.interval===1?'':'s'}`);}
function settings(){openModal('Your study settings',`<div class="settings-section"><h3>Daily goal</h3><form id="goalForm"><div class="field"><label>Minutes to study per day</label><input name="goal" type="number" min="5" max="600" value="${data.preferences.dailyGoal||60}"></div><button class="primary" type="submit" style="width:100%">Save goal</button></form></div><div class="settings-section"><h3>Your Google account</h3><p class="note">Google sign-in synchronizes notes, topics, flashcards and progress across devices using Firestore.</p><button class="secondary" data-action="accountSettings" style="width:100%">Manage Google login & sync →</button></div><div class="settings-section"><h3>Google Drive & files</h3><p class="note">Store your books and PDFs in Drive and back up your study workspace.</p><button class="secondary" data-action="cloudSettings" style="width:100%">Manage Drive & backups →</button></div><div class="settings-section"><h3>Backup your learning</h3><p class="note">Your topics, notes, flashcards and study logs are kept locally, and synced when signed in. Export a JSON backup periodically. Import will replace your current data.</p><div class="button-row"><button class="secondary" data-action="export">Export backup</button><button class="secondary" data-action="import">Import backup</button></div><input id="backupFile" type="file" accept="application/json,.json" hidden></div><div class="settings-section"><h3>Privacy and limitations</h3><ul class="mini-list"><li>No advertising or tracking. Google Drive communicates with Google when you connect or use file and backup actions.</li><li>Cloud Firestore sync is automatic after Google login; Google Drive backup is optional and manual.</li><li>Clearing app/browser storage can erase progress unless you have a backup.</li><li>Study notifications and automatic calendar synchronization are not enabled.</li></ul></div><p class="tiny">PsychDesk v3.0 · Google login + cloud sync</p>`);$('#goalForm').addEventListener('submit',e=>{e.preventDefault();if(!commitChange(()=>{data.preferences.dailyGoal=Math.max(5,Math.min(600,Number(new FormData(e.target).get('goal'))||60))}))return;closeModal();render();toast('Daily goal updated')});$('#backupFile').addEventListener('change',e=>{let file=e.target.files?.[0];if(file)file.text().then(importBackup).catch(()=>toast('Could not read file'))});}
function exportBackup(){let json=JSON.stringify({...data,exportedAt:new Date().toISOString()},null,2);if(window.PsychDeskAndroid?.exportBackup){window.PsychDeskAndroid.exportBackup(json);return}let blob=new Blob([json],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='psychdesk-backup-'+today()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000);toast('Backup file prepared')}
function importBackup(raw){
 try{
  const d=JSON.parse(raw);
  if(!d||![1,2].includes(d.version)||!['subjects','tasks','cards','sessions'].every(k=>Array.isArray(d[k]))||
    ['notes','stickies','inkNotes','materials','research','boardItems','mindMaps','pdfHighlights','dictionaryEntries','dictionaryBookmarks','timelineEvents','timelineBookmarks','timelineAnnotations'].some(k=>d[k]!=null&&!Array.isArray(d[k])))
   throw Error('Invalid or unsupported backup file.');
  if(!confirm('Replace all current PsychDesk data with this backup? Export a safety copy first. This cannot be undone.'))return;
  replaceData(d);
  if(!save())throw Error('The backup was restored locally, but synchronization could not start. Export a copy before leaving this device.');
  closeModal();render();toast('Backup restored successfully');
 }catch(e){toast(String(e?.message||'Could not restore the backup').slice(0,180));}
}
window.receiveBackup=importBackup;
function importAction(){if(window.PsychDeskAndroid?.importBackup)window.PsychDeskAndroid.importBackup();else $('#backupFile')?.click()}
function calendar(t){if(!t?.due){toast('Set a date on the study topic first');return}if(window.PsychDeskAndroid?.addToCalendar){window.PsychDeskAndroid.addToCalendar(t.title,t.due);return}let start=t.due.replace(/-/g,''),end=addDays(t.due,1).replace(/-/g,'');let ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//PsychDesk//Study Planner//EN','BEGIN:VEVENT','UID:'+id()+'@psychdesk.local','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\..*/,'Z'),'DTSTART;VALUE=DATE:'+start,'DTEND;VALUE=DATE:'+end,'SUMMARY:'+t.title.replace(/[,;\\\n]/g,' '),'DESCRIPTION:Study topic from PsychDesk','END:VEVENT','END:VCALENDAR'].join('\r\n');let blob=new Blob([ics],{type:'text/calendar'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='study-'+start+'.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2500);toast('Calendar event file prepared')}
function tick(){if(timer.running){timer.remaining=Math.max(0,Math.ceil((timer.endsAt-Date.now())/1000));if(timer.remaining===0){timer.running=false;saveTimer();toast('Session time is up — finish and log your study time.');if(tab==='focus')render()}let el=$('#clock');if(el)el.textContent=clock(timer.remaining);const finish=$('[data-action="completeTimer"]');if(finish)finish.disabled=timer.startedTotal-timer.remaining<60}}
setInterval(tick,700);
function completeTimer(){tick();let seconds=Math.max(0,timer.startedTotal-timer.remaining);let min=Math.round(seconds/60);if(seconds<60){toast('Study for at least one minute to log a session.');return}if(!commitChange(()=>data.sessions.push({id:id(),day:today(),minutes:min,subjectId:timer.subjectId,completedAt:new Date().toISOString()})))return;let v=timer.duration;timer={duration:v,remaining:v*60,startedTotal:v*60,endsAt:0,running:false,subjectId:timer.subjectId};saveTimer();render();toast(`Logged ${min} focused minutes`);}
function invoke(a,el){let i=el.dataset.id;switch(a){case 'studyTopic':{const topic=data.tasks.find(t=>t.id===i);if(topic){if(!timer.running){focusTopicId=topic.id;timer.subjectId=topic.subjectId||'';saveTimer();}else toast('Your current focus timer is still running.');setTab('focus');}break;}case 'addSyllabusTopic':addSyllabusTopic(el);break;case 'accountSettings':window.PsychDeskFirebase?.openAccount();break;case 'cloudSettings':window.PsychDeskCloud?.openSettings();break;case 'goNotes':setTab('notes');break;case 'goInsights':setTab('insights');break;case 'goFocus':setTab('focus');break;case 'goRecall':setTab('recall');break;case 'newTask':taskForm();break;case 'editTask':taskForm(data.tasks.find(t=>t.id===i));break;case 'newSubject':subjectForm();break;case 'editSubject':subjectForm(subj(i));break;case 'subjectResources':resourceDialog(subj(i));break;case 'subjectMaterials':window.PsychDeskMaterials?.open(i);break;case 'newCard':cardForm(tab==='recall'&&recallSubjectFilter!=='all'?{id:'',question:'',answer:'',subjectId:recallSubjectFilter}:null);break;case 'editCard':cardForm(data.cards.find(t=>t.id===i));break;case 'toggleTask':{let t=data.tasks.find(x=>x.id===i);if(t){if(commitChange(()=>{t.done=!t.done;t.completedAt=t.done?today():''})){render();}}break}case 'deleteTask':if(confirm('Delete this study topic?')){if(!commitChange(()=>{data.tasks=data.tasks.filter(t=>t.id!==i)}))break;closeModal();render();toast('Topic deleted')}break;
case 'deleteSubject':{let used=data.tasks.some(t=>t.subjectId===i)||data.cards.some(c=>c.subjectId===i)||data.sessions.some(v=>v.subjectId===i)||data.notes.some(n=>n.subjectId===i)||data.inkNotes.some(n=>n.subjectId===i)||data.materials.some(m=>m.subjectId===i)||data.stickies.some(n=>n.subjectId===i)||data.research.some(n=>n.subjectId===i);if(used){toast('Move or delete associated materials, notes, topics, flashcards, and sessions first.');break}if(confirm('Delete this subject?')){if(!commitChange(()=>{data.subjects=data.subjects.filter(t=>t.id!==i)}))break;if(timer.subjectId===i){timer.subjectId='';saveTimer()}if(subjectFilter===i)subjectFilter='all';closeModal();render()};break}
case 'deleteCard':if(confirm('Delete this flashcard?')){if(!commitChange(()=>{data.cards=data.cards.filter(c=>c.id!==i)}))break;closeModal();render()}break;
case 'filterTask':taskFilter=el.dataset.value;render();document.querySelector('[data-action="filterTask"][data-value="'+taskFilter+'"]')?.focus();break;case 'flip':flip=true;render();document.querySelector('[data-action="rate"]')?.focus();break;
case 'rate':{let c=data.cards.find(c=>c.id===i);if(c)updateReview(c,el.dataset.rating);break}
case 'closeModal':closeModal();break;case 'timerLength':{let n=Number(el.dataset.min);if(!timer.running&&[15,25,40,50].includes(n)){timer.duration=n;timer.remaining=n*60;timer.startedTotal=n*60;saveTimer();render()}break}
case 'startTimer':{if(timer.remaining<=0){timer.remaining=timer.duration*60;timer.startedTotal=timer.remaining}timer.running=true;timer.endsAt=Date.now()+timer.remaining*1000;saveTimer();render();break}
case 'pause':tick();timer.running=false;saveTimer();render();break;case 'resetTimer':if(confirm('Reset the timer without logging?')){timer.running=false;timer.remaining=timer.duration*60;timer.startedTotal=timer.remaining;saveTimer();render()}break;case 'completeTimer':completeTimer();break;case 'calendar':calendar(data.tasks.find(t=>t.id===i));break;case 'export':exportBackup();break;case 'import':importAction();break;case 'downloadRecovery':downloadRecovery();break;case 'startRecovery':startRecovery();break;
}}
document.addEventListener('click',e=>{let nav=e.target.closest('[data-tab]');if(nav){setTab(nav.dataset.tab);return}let btn=e.target.closest('[data-action]');if(btn){invoke(btn.dataset.action,btn);return}if(e.target.classList.contains('modal-overlay'))closeModal()});
document.addEventListener('change',e=>{if(e.target.id==='recallSubjectFilter'){recallSubjectFilter=e.target.value;selectedReviewId=null;flip=false;render();document.querySelector('#recallSubjectFilter')?.focus()}if(e.target.id==='subjectFilter'){subjectFilter=e.target.value;render()}if(e.target.id==='focusSubject'){timer.subjectId=e.target.value;saveTimer()}});
function replaceData(imported){
 validateSnapshot(imported);
 if(!imported||![1,2].includes(imported.version)||!['subjects','tasks','cards','sessions'].every(k=>Array.isArray(imported[k]))||
 (imported.notes&&!Array.isArray(imported.notes))|| (imported.stickies&&!Array.isArray(imported.stickies))|| ['inkNotes','research','boardItems','mindMaps','pdfHighlights','dictionaryEntries','dictionaryBookmarks','timelineEvents','timelineBookmarks','timelineAnnotations'].some(key=>imported[key]&&!Array.isArray(imported[key]))|| (imported.reviews&&!Array.isArray(imported.reviews))) throw Error('Invalid PsychDesk snapshot');
 const previous=data;data={...imported,materials:Array.isArray(imported.materials)?imported.materials:[],stickies:Array.isArray(imported.stickies)?imported.stickies:[],inkNotes:Array.isArray(imported.inkNotes)?imported.inkNotes:[],research:Array.isArray(imported.research)?imported.research:[],boardItems:Array.isArray(imported.boardItems)?imported.boardItems:[],mindMaps:Array.isArray(imported.mindMaps)?imported.mindMaps:[],pdfHighlights:Array.isArray(imported.pdfHighlights)?imported.pdfHighlights:[],dictionaryEntries:Array.isArray(imported.dictionaryEntries)?imported.dictionaryEntries:[],dictionaryBookmarks:Array.isArray(imported.dictionaryBookmarks)?imported.dictionaryBookmarks:[],timelineEvents:Array.isArray(imported.timelineEvents)?imported.timelineEvents:[],timelineBookmarks:Array.isArray(imported.timelineBookmarks)?imported.timelineBookmarks:[],timelineAnnotations:Array.isArray(imported.timelineAnnotations)?imported.timelineAnnotations:[],version:2,notes:imported.notes||[],reviews:imported.reviews||[],preferences:normalizePreferences(imported.preferences)};
 delete data.exportedAt;
 if(!save(true)){data=previous;throw Error('Could not safely save the replacement. Your original study data is unchanged.');}
 window.dispatchEvent(new Event('psychdesk:data-replaced'));render();
}
function ensureSubjectDepartments(){
 if(data.preferences.subjectPackVersion===1)return false;
 const departments=[["bio","Biological Psychology & Biopsychology"],["cog","Cognitive Psychology"],["soc","Social Psychology"],["counsel","Counseling & Psychotherapy"],["res","Tests, Measurement & Research Methods"],["abnormal","Abnormal Psychology & Psychopathology"],["psychiatry","Psychiatry"],["classification","DSM & ICD Classification"],["general","General Psychology"]];
 for(const [key,name] of departments){
  const existing=data.subjects.find(s=>s.id===key || s.name.toLowerCase()===name.toLowerCase());
  if(!existing)data.subjects.push({id:key,name,color:colors[data.subjects.length%colors.length]});
  else if(['Biological Psychology','Research Methods'].includes(existing.name))existing.name=name;
 }
 data.preferences.subjectPackVersion=1;return true;
}
function useStorageKey(key){
 if(!/^psychdesk-(?:v1|user-[A-Za-z0-9_-]+)$/.test(key))throw Error('Invalid local account');
 const accountSwitch=storageKey!==key;
 if(accountSwitch)saveTimer();
 storageKey=key;
 if(accountSwitch){timer=loadTimer();subjectFilter='all';}
 let raw;
 try{
  raw=localStorage.getItem(key);
  if(raw){
   const d=JSON.parse(raw);
   // Treat this as a local read, not a replacement that immediately rewrites the file.
   if(!d||![1,2].includes(d.version)||!['subjects','tasks','cards','sessions'].every(k=>Array.isArray(d[k]))||
       ['notes','stickies','inkNotes','research','mindMaps'].some(k=>d[k]!=null&&!Array.isArray(d[k])))
    throw Error('Saved study data has an incompatible structure');
   if(blockedKey===key){blockedKey='';blockedRaw='';blockedReason='';}
   replaceData(d);
  }else{
   if(blockedKey===key){blockedKey='';blockedRaw='';blockedReason='';}
   data=initial();data.version=2;data.notes=[];data.materials=[];data.stickies=[];data.inkNotes=[];save(true);render();
  }
 }catch(e){
  // Crucial: never overwrite an unreadable account record with blank starter data.
  data=initial();data.version=2;data.notes=[];data.materials=[];data.stickies=[];data.inkNotes=[];
  markCorrupt(key,raw,e);render();
 }
 // Account initialization does not reset a running or completed focus session.
 saveTimer();
}
window.PsychDeskCore={getData:()=>data,getStorageKey:()=>storageKey,save,commitChange,validateSnapshot,render,setTab,toast,openModal,closeModal,subjectOptions,esc,id,today,settings,replaceData,useStorageKey,ensureSubjectDepartments,resourceDialog};$('#settingsBtn').addEventListener('click',settings);document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});if(ensureSubjectDepartments())save(true);render();
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
