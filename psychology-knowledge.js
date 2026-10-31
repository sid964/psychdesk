/* PsychDesk Psychology Dictionary + Historical Timeline.
   Static textbook-based summaries; personal additions and bookmarks sync with account study data. */
(()=>{'use strict';
const core=window.PsychDeskCore;if(!core)return;
const $=s=>document.querySelector(s),h=core.esc;
const corpus=window.PSYCHDESK_PSYCHOLOGY_REFERENCE||{definitions:[],timeline:[]};
const data=()=>core.getData();
const list=key=>Array.isArray(data()[key])?data()[key]:[];
const validUrl=value=>{try{const v=new URL(String(value||''));return /^(https?):$/.test(v.protocol)?v.href:''}catch{return''}};
const glossary=()=>[...corpus.definitions,...list('dictionaryEntries')];
const history=()=>[...corpus.timeline,...list('timelineEvents')].sort((a,b)=>a.year-b.year||a.title.localeCompare(b.title));
const categories=['All','Learning','Cognition','Biological','Development','Social','Research','Clinical'];
const eras=[['all','All eras'],['foundations','Foundations'],['learning','Learning'],['cognition','Cognition'],['social','Social'],['clinical','Clinical'],['research','Research'],['development','Development']];
let dictQuery='',dictCategory='All',dictSavedOnly=false,dictSelected='',timelineQuery='',timelineEra='all',timelineSelected='',timelineSavedOnly=false;
function isMarked(key,id){return list(key).includes(id);}
function toggleMark(key,id){
 const d=data(),set=new Set(list(key));if(set.has(id))set.delete(id);else set.add(id);
 d[key]=[...set];core.save();
}
function termById(id){return glossary().find(t=>t.id===id);}
function eventById(id){return history().find(x=>x.id===id);}
function findTerms(q=dictQuery,category=dictCategory,bookmarked=dictSavedOnly){
 const term=q.toLocaleLowerCase().trim();
 return glossary().filter(entry=>
  (!bookmarked||isMarked('dictionaryBookmarks',entry.id))&&
  (category==='All'||entry.category===category)&&
  (!term||[entry.term,entry.definition,entry.example,entry.category].join(' ').toLocaleLowerCase().includes(term))
 ).sort((a,b)=>a.term.localeCompare(b.term));
}
function renderDictionary(){
 const entries=findTerms();
 if(!entries.some(x=>x.id===dictSelected))dictSelected=entries[0]?.id||'';
 return '<section class="hero psy-hero"><div class="eyebrow">THE LANGUAGE OF PSYCHOLOGY</div><h1>Psychology Dictionary.</h1><p>Clear, searchable concepts. Link definitions to your own learning.</p></section>'+
 '<div class="psy-info-strip"><span>'+corpus.definitions.length+' curated entries</span><span>+ '+list('dictionaryEntries').length+' personal</span><span>Evidence-informed summaries</span></div>'+
 '<div class="psy-top-tools"><label class="psy-input-label"><span>SEARCH CONCEPTS</span><input type="search" id="psyDictionaryQuery" aria-label="Search psychology dictionary" value="'+h(dictQuery)+'" placeholder="Try: negative reinforcement, validity, memory…"></label>'+
 '<button type="button" data-psy="addTerm" class="primary">+ Add my own term</button></div>'+
 '<div class="psy-tabs" aria-label="Filter dictionary by topic">'+categories.map(cat=>'<button data-psy="category" data-value="'+h(cat)+'" class="'+(cat===dictCategory?'active':'')+'">'+h(cat)+'</button>').join('')+'</div>'+
 '<div class="psy-layout"><div><div class="psy-list-heading"><span id="psyDictionaryCount">'+entries.length+' definitions</span><button type="button" data-psy="toggleSaved" class="'+(dictSavedOnly?'selected':'')+'">✦ '+(dictSavedOnly?'Show all':'Bookmarked only')+'</button></div>'+
 '<div class="psy-entry-list" id="psyDictionaryResults">'+dictionaryResults(entries)+'</div></div>'+
 '<div class="psy-detail-slot" id="psyDefinitionDetail">'+dictionaryDetail(termById(dictSelected))+'</div></div>'+
 '<p class="psy-disclaimer">This is a concise study glossary, not a diagnostic resource. Definitions may simplify complex research; check original textbooks and primary sources for academic work.</p>';
}
function dictionaryResults(entries=findTerms()){
 if(!entries.length)return '<div class="psy-empty">No matching terms. Try another topic or add your own definition.</div>';
 return entries.map(entry=>'<button type="button" class="psy-entry'+(dictSelected===entry.id?' active':'')+'" data-psy="selectTerm" data-id="'+h(entry.id)+'">'+
 '<span><strong>'+h(entry.term)+'</strong><small>'+h(entry.category)+(entry.personal?' · My entry':'')+'</small></span><span class="psy-chevron">'+(isMarked('dictionaryBookmarks',entry.id)?'✦':'›')+'</span></button>').join('');
}
function dictionaryDetail(entry){
 if(!entry)return '<div class="psy-empty">Choose a concept to explore its definition and related ideas.</div>';
 const related=(entry.related||[]).map(id=>termById(id)).filter(Boolean);
 return '<article class="psy-detail"><div class="psy-detail-overline">'+h(entry.category)+' / '+(entry.personal?'PERSONAL ENTRY':'STUDY REFERENCE')+'</div>'+
 '<h2>'+h(entry.term)+'</h2><h3>What it means</h3><p class="psy-definition">'+h(entry.definition)+'</p>'+
 (entry.example?'<h3>Example in practice</h3><p>'+h(entry.example)+'</p>':'')+
 (related.length?'<h3>Related concepts</h3><div class="psy-related">'+related.map(r=>'<button data-psy="related" data-id="'+h(r.id)+'">'+h(r.term)+'</button>').join('')+'</div>':'')+
 (validUrl(entry.source)?'<a class="psy-source" href="'+h(validUrl(entry.source))+'" target="_blank" rel="noopener noreferrer">Open reading source ↗</a>':'')+
 '<div class="psy-detail-actions"><button type="button" data-psy="bookmark" data-id="'+h(entry.id)+'">'+(isMarked('dictionaryBookmarks',entry.id)?'✦ Bookmarked':'☆ Bookmark')+'</button>'+
 '<button type="button" data-psy="noteTerm" data-id="'+h(entry.id)+'">Save to notebook</button>'+
 '<button type="button" data-psy="stickyTerm" data-id="'+h(entry.id)+'">Make sticky</button>'+
 '<button type="button" data-psy="cardTerm" data-id="'+h(entry.id)+'">Make flashcard</button>'+
 (entry.personal?'<button type="button" data-psy="editTerm" data-id="'+h(entry.id)+'">Edit</button><button type="button" data-psy="deleteTerm" data-id="'+h(entry.id)+'">Delete</button>':'')+
 '</div>'+(window.PsychDeskConnections?.forConcept(entry)||'')+'</article>';
}
function refreshDictionary(){
 const entries=findTerms(),container=$('#psyDictionaryResults');
 if(!entries.some(x=>x.id===dictSelected))dictSelected=entries[0]?.id||'';
 if(container)container.innerHTML=dictionaryResults(entries);
 if($('#psyDictionaryCount'))$('#psyDictionaryCount').textContent=entries.length+' definitions';
 if($('#psyDefinitionDetail'))$('#psyDefinitionDetail').innerHTML=dictionaryDetail(termById(dictSelected));
}
function addNotebook(title,body,tag){
 const d=data();
 d.notes=Array.isArray(d.notes)?d.notes:[];
 const stamp=new Date().toISOString();
 d.notes.unshift({id:core.id(),title:title.slice(0,140),body:body.slice(0,10000),tags:tag,subjectId:'',createdAt:stamp,updatedAt:stamp});
 core.save();core.toast('Saved to your notebook.');
}
function addSticky(title,body){
 const d=data();if(!Array.isArray(d.stickies))d.stickies=[];
 const id=core.id(),cards=window.PsychDeskStickies?.generate?.(body,title,'','cream',id,[])||[];
 if(!cards.length){core.toast('Sticky note creator unavailable.');return;}
 d.stickies.push(...cards);core.save();core.toast('Handwritten sticky created.');
}
function addFlashcard(question,answer){
 const d=data();d.cards=Array.isArray(d.cards)?d.cards:[];
 if(d.cards.some(c=>c.question?.toLocaleLowerCase()===question.toLocaleLowerCase())){core.toast('This question is already in your deck.');return;}
 d.cards.push({id:core.id(),question:question.slice(0,500),answer:answer.slice(0,1500),subjectId:'',due:core.today(),interval:0,reps:0});
 core.save();core.toast('Flashcard saved for review.');
}
function termEditor(entry){
 const existing=Boolean(entry?.personal);
 const title=existing?'Edit glossary entry':'Add personal glossary entry';
 core.openModal(title,'<form id="psyTermForm"><input type="hidden" name="entryId" value="'+h(entry?.id||'')+'">'+
 '<div class="field"><label>Concept *</label><input name="term" required maxlength="110" value="'+h(entry?.term||'')+'" placeholder="e.g. Signal detection theory"></div>'+
 '<div class="field"><label>Category</label><select name="category">'+categories.slice(1).map(cat=>'<option value="'+h(cat)+'"'+((entry?.category||'Cognition')===cat?' selected':'')+'>'+h(cat)+'</option>').join('')+'</select></div>'+
 '<div class="field"><label>Definition *</label><textarea name="definition" required maxlength="1300" rows="4">'+h(entry?.definition||'')+'</textarea></div>'+
 '<div class="field"><label>Example</label><textarea name="example" maxlength="700" rows="3">'+h(entry?.example||'')+'</textarea></div>'+
 '<div class="field"><label>Source (optional URL)</label><input name="source" maxlength="600" value="'+h(entry?.source||'')+'" placeholder="https://…"></div>'+
 '<div class="modal-footer"><button type="submit" class="primary">Save definition</button></div></form>');
}
function saveTerm(event){
 event.preventDefault();const f=event.target;
 const id=f.elements.entryId.value,term=f.elements.term.value.trim().slice(0,110),definition=f.elements.definition.value.trim().slice(0,1300);
 if(!term||!definition){core.toast('Concept and definition are required.');return;}
 if(!id&&list('dictionaryEntries').length>=120){core.toast('Personal dictionary limit: 120 entries.');return;}
 const newEntry={id:id||core.id(),term,category:f.elements.category.value,definition,example:f.elements.example.value.trim().slice(0,700),source:validUrl(f.elements.source.value),related:[],personal:true};
 const d=data(),arr=list('dictionaryEntries'),index=arr.findIndex(x=>x.id===id);
 if(index>=0)arr[index]=newEntry;else arr.push(newEntry);
 d.dictionaryEntries=arr;dictSelected=newEntry.id;
 core.save();core.closeModal();core.render();core.toast('Definition saved');
}
function timelineEntries(q=timelineQuery,era=timelineEra,savedOnly=timelineSavedOnly){
 const needle=q.toLocaleLowerCase().trim();
 return history().filter(event=>(!savedOnly||isMarked('timelineBookmarks',event.id))&&(era==='all'||event.era===era)&&
 (!needle||[event.title,event.description,event.people,event.year].join(' ').toLocaleLowerCase().includes(needle)));
}
function renderTimeline(){
 const events=timelineEntries();
 if(!events.some(x=>x.id===timelineSelected))timelineSelected=events[0]?.id||'';
 const first=history()[0]?.year||1859,last=history().slice(-1)[0]?.year||1988;
 return '<section class="hero psy-hero"><div class="eyebrow">HOW PSYCHOLOGY DEVELOPED</div><h1>Psychology Timeline.</h1><p>Explore key milestones, movements, researchers, and historical context.</p></section>'+
 '<div class="psy-info-strip"><span>'+corpus.timeline.length+' sourced milestones</span><span>'+list('timelineEvents').length+' personal events</span><span>'+first+' — '+last+'</span></div>'+
 '<div class="psy-top-tools"><label class="psy-input-label"><span>EXPLORE HISTORY</span><input id="psyTimelineQuery" type="search" value="'+h(timelineQuery)+'" placeholder="Search year, researcher, school of thought…" aria-label="Search history timeline"></label>'+
 '<button type="button" data-psy="addEvent" class="primary">+ Add milestone</button></div>'+
 '<div class="psy-tabs">'+eras.map(([id,label])=>'<button data-psy="era" data-value="'+id+'" class="'+(id===timelineEra?'active':'')+'">'+label+'</button>').join('')+'</div>'+
 '<div class="psy-list-heading"><span id="psyEventCount">'+events.length+' events</span><button type="button" data-psy="toggleTimelineSaved" class="'+(timelineSavedOnly?'selected':'')+'">✦ '+(timelineSavedOnly?'Show all':'Bookmarked only')+'</button></div>'+
 '<div class="psy-timeline-layout"><div id="psyTimelineEvents" class="psy-timeline-events">'+timelineCards(events)+'</div><div class="psy-detail-slot" id="psyEventDetail">'+eventDetail(eventById(timelineSelected))+'</div></div>'+
 '<p class="psy-disclaimer">This is a selected timeline, not an exhaustive account of global psychology. Movements do not have single start dates, and historical interpretations can vary. Follow the linked source for context.</p>';
}
function timelineCards(events=timelineEntries()){
 if(!events.length)return '<div class="psy-empty">No events match. Adjust the filters or add a personal milestone.</div>';
 let previous=-1;
 return events.map(event=>{
  const decade=Math.floor(event.year/10)*10;const head=decade!==previous?'<div class="psy-decade-label">'+decade+'s</div>':'';
  previous=decade;
  return head+'<button type="button" data-psy="selectEvent" data-id="'+h(event.id)+'" class="psy-timeline-card'+(timelineSelected===event.id?' active':'')+'"><span class="psy-date">'+h(event.year)+'</span><div><strong>'+h(event.title)+'</strong><small>'+h(eras.find(x=>x[0]===event.era)?.[1]||'Milestone')+(event.personal?' · My event':'')+'</small></div><span>'+(isMarked('timelineBookmarks',event.id)?'✦':'›')+'</span></button>';
 }).join('');
}
function eventDetail(event){
 if(!event)return '<div class="psy-empty">Choose a milestone to view its significance and related people.</div>';
 const annotation=list('timelineAnnotations').find(n=>n.eventId===event.id);
 return '<article class="psy-detail"><div class="psy-detail-overline">'+h(event.year)+' / '+h(eras.find(e=>e[0]===event.era)?.[1]||event.era)+'</div>'+
 '<h2>'+h(event.title)+'</h2><h3>Why it matters</h3><p>'+h(event.description)+'</p>'+
 '<h3>Key people and organizations</h3><p>'+h(event.people||'Not specified')+'</p>'+
 (validUrl(event.source)?'<a class="psy-source" href="'+h(validUrl(event.source))+'" target="_blank" rel="noopener noreferrer">Read historical source ↗</a>':'')+
 '<h3>My notes on this milestone</h3><textarea class="psy-event-notes" id="psyTimelineNotes" maxlength="1700" rows="4" placeholder="Why is this milestone important for your course?">'+h(annotation?.text||'')+'</textarea>'+
 '<div class="psy-detail-actions"><button type="button" data-psy="saveEventNote" data-id="'+h(event.id)+'">Save reflection</button>'+
 '<button type="button" data-psy="bookmarkEvent" data-id="'+h(event.id)+'">'+(isMarked('timelineBookmarks',event.id)?'✦ Bookmarked':'☆ Bookmark')+'</button>'+
 '<button type="button" data-psy="noteEvent" data-id="'+h(event.id)+'">Send to notebook</button>'+
 '<button type="button" data-psy="cardEvent" data-id="'+h(event.id)+'">Make flashcard</button>'+
 (event.personal?'<button type="button" data-psy="editEvent" data-id="'+h(event.id)+'">Edit</button><button type="button" data-psy="deleteEvent" data-id="'+h(event.id)+'">Delete</button>':'')+'</div></article>';
}
function refreshTimeline(){
 const events=timelineEntries();
 if(!events.some(x=>x.id===timelineSelected))timelineSelected=events[0]?.id||'';
 if($('#psyTimelineEvents'))$('#psyTimelineEvents').innerHTML=timelineCards(events);
 if($('#psyEventCount'))$('#psyEventCount').textContent=events.length+' events';
 if($('#psyEventDetail'))$('#psyEventDetail').innerHTML=eventDetail(eventById(timelineSelected));
}
function eventEditor(event){
 core.openModal(event?'Edit personal milestone':'Add personal milestone','<form id="psyEventForm">'+
 '<input type="hidden" name="id" value="'+h(event?.id||'')+'">'+
 '<div class="field"><label>Year *</label><input name="year" type="number" required min="1500" max="2100" value="'+h(event?.year||'')+'"></div>'+
 '<div class="field"><label>Milestone title *</label><input name="title" required maxlength="140" value="'+h(event?.title||'')+'"></div>'+
 '<div class="field"><label>Theme</label><select name="era">'+eras.slice(1).map(([id,label])=>'<option value="'+id+'"'+((event?.era||'foundations')===id?' selected':'')+'>'+label+'</option>').join('')+'</select></div>'+
 '<div class="field"><label>Description *</label><textarea name="description" required maxlength="1400" rows="4">'+h(event?.description||'')+'</textarea></div>'+
 '<div class="field"><label>People / organizations</label><input name="people" maxlength="220" value="'+h(event?.people||'')+'"></div>'+
 '<div class="field"><label>Source URL</label><input name="source" maxlength="600" value="'+h(event?.source||'')+'" placeholder="https://…"></div>'+
 '<div class="modal-footer"><button class="primary" type="submit">Save milestone</button></div></form>');
}
function saveEvent(e){
 e.preventDefault();const f=e.target;
 const year=Number(f.elements.year.value),title=f.elements.title.value.trim(),description=f.elements.description.value.trim(),id=f.elements.id.value;
 if(!Number.isInteger(year)||year<1500||year>2100||!title||!description){core.toast('Enter a year, title, and description.');return;}
 if(!id&&list('timelineEvents').length>=100){core.toast('Personal timeline limit: 100 milestones.');return;}
 const row={id:id||core.id(),year,era:f.elements.era.value,title:title.slice(0,140),description:description.slice(0,1400),
  people:f.elements.people.value.trim().slice(0,220),source:validUrl(f.elements.source.value),personal:true};
 const d=data(),arr=list('timelineEvents'),index=arr.findIndex(x=>x.id===id);
 if(index>=0)arr[index]=row;else arr.push(row);
 d.timelineEvents=arr;timelineSelected=row.id;
 core.save();core.closeModal();core.render();core.toast('Timeline milestone saved');
}
function saveEventNote(id){
 const text=($('#psyTimelineNotes')?.value||'').trim().slice(0,1700);
 const d=data(),notes=list('timelineAnnotations').filter(n=>n.eventId!==id);
 if(text)notes.push({eventId:id,text,updatedAt:new Date().toISOString()});
 d.timelineAnnotations=notes;core.save();core.toast('Reflection saved');
}
document.addEventListener('input',e=>{
 if(e.target?.id==='psyDictionaryQuery'){
  dictQuery=e.target.value;
  const filtered=findTerms();if(!filtered.some(t=>t.id===dictSelected))dictSelected=filtered[0]?.id||'';
  refreshDictionary();
 }
 if(e.target?.id==='psyTimelineQuery'){
  timelineQuery=e.target.value;const filtered=timelineEntries();
  if(!filtered.some(x=>x.id===timelineSelected))timelineSelected=filtered[0]?.id||'';
  refreshTimeline();
 }
});
document.addEventListener('submit',e=>{
 if(e.target?.id==='psyTermForm')saveTerm(e);
 if(e.target?.id==='psyEventForm')saveEvent(e);
});
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-psy]');if(!b)return;
 e.preventDefault();const action=b.dataset.psy,id=b.dataset.id;
 switch(action){
  case 'category':dictCategory=b.dataset.value;core.render();break;
  case 'toggleSaved':dictSavedOnly=!dictSavedOnly;core.render();break;
  case 'selectTerm':case 'related':dictSelected=id;refreshDictionary();break;
  case 'bookmark':toggleMark('dictionaryBookmarks',id);refreshDictionary();break;
  case 'addTerm':termEditor(null);break;
  case 'editTerm':{const entry=termById(id);if(entry?.personal)termEditor(entry);break;}
  case 'deleteTerm':if(confirm('Delete this personal glossary entry?')){data().dictionaryEntries=list('dictionaryEntries').filter(x=>x.id!==id);data().dictionaryBookmarks=list('dictionaryBookmarks').filter(x=>x!==id);dictSelected='';core.save();core.render();}break;
  case 'noteTerm':{const t=termById(id);if(t)addNotebook(t.term,t.definition+(t.example?'\n\nExample: '+t.example:''),'psychology-dictionary');break;}
  case 'stickyTerm':{const t=termById(id);if(t)addSticky(t.term,t.definition+(t.example?'\nExample: '+t.example:''));break;}
  case 'cardTerm':{const t=termById(id);if(t)addFlashcard('Define '+t.term+'.',t.definition);break;}
  case 'era':timelineEra=b.dataset.value;core.render();break;
  case 'toggleTimelineSaved':timelineSavedOnly=!timelineSavedOnly;core.render();break;
  case 'selectEvent':timelineSelected=id;refreshTimeline();break;
  case 'bookmarkEvent':toggleMark('timelineBookmarks',id);refreshTimeline();break;
  case 'saveEventNote':saveEventNote(id);break;
  case 'noteEvent':{const event=eventById(id);if(event)addNotebook(event.year+' · '+event.title,event.description+'\n\nPeople: '+event.people,'psychology-history');break;}
  case 'cardEvent':{const event=eventById(id);if(event)addFlashcard('What happened in psychology in '+event.year+' involving '+event.title+'?',event.description);break;}
  case 'addEvent':eventEditor(null);break;
  case 'editEvent':{const event=eventById(id);if(event?.personal)eventEditor(event);break;}
  case 'deleteEvent':if(confirm('Delete this personal timeline milestone?')){data().timelineEvents=list('timelineEvents').filter(x=>x.id!==id);data().timelineBookmarks=list('timelineBookmarks').filter(x=>x!==id);data().timelineAnnotations=list('timelineAnnotations').filter(x=>x.eventId!==id);timelineSelected='';core.save();core.render();}break;
 }
});
window.addEventListener('psychdesk:session-reset',()=>{dictQuery='';dictCategory='All';dictSavedOnly=false;dictSelected='';timelineQuery='';timelineEra='all';timelineSelected='';timelineSavedOnly=false;});
function openTerm(id){if(!termById(id))return;dictSelected=id;dictQuery='';dictCategory='All';dictSavedOnly=false;core.setTab('dictionary');}
function openEvent(id){if(!eventById(id))return;timelineSelected=id;timelineQuery='';timelineEra='all';timelineSavedOnly=false;core.setTab('timeline');}
window.PsychDeskKnowledge={renderDictionary,renderTimeline,findTerms,timelineEntries,termById,eventById,glossary,history,openTerm,openEvent};
})();