/* Account-scoped study continuity. UI preferences only: no document text or tokens. */
(()=>{'use strict';
const core=window.PsychDeskCore;
if(!core)return;
const allowed=new Set(['reader','notes','ink','recall','focus','planner','materials','research','dictionary','timeline','board','mindmap','connections','university','psychology']);
const key=()=> 'psychdesk-session-v1:'+core.getStorageKey();
const validId=value=>typeof value==='string'&&value.length>0&&value.length<=180;
const safeTab=tab=>allowed.has(tab)?tab:null;
const esc=core.esc;
function readRaw(){
 try{
  const saved=JSON.parse(localStorage.getItem(key())||'null');
  return saved&&saved.v===1&&safeTab(saved.tab)?saved:null;
 }catch{return null}
}
function getResume(){
 const saved=readRaw();
 if(!saved)return null;
 if(saved.tab==='reader'){
  const item=(core.getData().materials||[]).find(m=>m.id===saved.materialId&&['pdf','markdown'].includes(m.kind));
  if(!item)return null;
  return {tab:'reader',materialId:item.id,page:Number.isInteger(saved.page)&&saved.page>0?saved.page:1,title:String(item.title||item.fileName||'Your book').slice(0,100)};
 }
 if(saved.tab==='notes'){
  const note=(core.getData().notes||[]).find(n=>n.id===saved.noteId);
  return {tab:'notes',noteId:note?.id||'',title:String(note?.title||'Your notebook').slice(0,100)};
 }
 return {tab:saved.tab,title:({ink:'Ink Notes',recall:'Flashcards',focus:'Focus Room',planner:'Study planner',materials:'Library',research:'Research',dictionary:'Psychology dictionary',timeline:'Psychology timeline',board:'Study board',mindmap:'Mind map',connections:'Connected learning',university:'University preparation',psychology:'Psychology preparation'})[saved.tab]||'Your study space'};
}
function store(part){
 if(!safeTab(part.tab))return false;
 const entry={v:1,tab:part.tab,at:new Date().toISOString()};
 if(validId(part.materialId))entry.materialId=part.materialId;
 if(validId(part.noteId))entry.noteId=part.noteId;
 if(Number.isInteger(part.page)&&part.page>0&&part.page<=100000)entry.page=part.page;
 try{localStorage.setItem(key(),JSON.stringify(entry));return true}catch{return false}
}
function readerOpened(materialId,pageNum=1){
 if(!validId(materialId))return;
 store({tab:'reader',materialId,page:pageNum});
}
function readerPage(pageNum){
 const previous=readRaw();
 if(previous?.tab==='reader'&&validId(previous.materialId))store({tab:'reader',materialId:previous.materialId,page:pageNum});
}
function noteOpened(noteId){
 if(!validId(noteId)||document.querySelector('.reader-layout'))return;
 if(!(core.getData().notes||[]).some(n=>n.id===noteId))return;
 store({tab:'notes',noteId});
}
function recordTab(tab){
 if(!safeTab(tab))return;
 if(tab==='reader')return; // Only a successfully selected Drive-library item is resumable.
 if(tab==='notes'){
  const previous=readRaw();
  if(previous?.tab==='notes')return;
 }
 store({tab});
}
function resume(){
 const previous=getResume();
 if(!previous){core.toast('Your previous study material is no longer available here.');return;}
 if(previous.tab==='reader'){
  const reader=window.PsychDeskReader;
  if(reader?.open)reader.open(previous.materialId,previous.page);
  else core.setTab('materials');
  return;
 }
 if(previous.tab==='notes'){
  core.setTab('notes');
  if(previous.noteId){
   const note=(core.getData().notes||[]).find(n=>n.id===previous.noteId);
   if(note)window.PsychDeskCloud?.noteEditor?.(note);
  }
  return;
 }
 core.setTab(previous.tab);
}
function homeButton(){
 const previous=getResume();if(!previous)return '';
 const short=previous.tab==='reader'?'Continue reading':previous.tab==='materials'?'Open library':previous.tab==='notes'?'Continue your note':previous.tab==='focus'?'Return to focus':'Continue studying';
 const detail=previous.tab==='reader'?'Page '+previous.page+' · '+previous.title:previous.title;
 return '<button class="garden-main-btn" type="button" data-session="resume" aria-label="'+esc(short+' — '+detail)+'">'+esc(short)+' <span aria-hidden="true">↗</span></button>';
}
function homeDetail(){
 const previous=getResume();if(!previous)return '';
 const kind=previous.tab==='reader'?'LAST BOOK':previous.tab==='notes'?'LATEST NOTE':'LAST OPENED';
 const description=previous.tab==='reader'?'Page '+previous.page+' · Open where you stopped.':'Continue without finding your place again.';
 return '<div class="garden-notebook-copy"><span class="studio-kicker">'+kind+'</span><h3>'+esc(previous.title)+'</h3><p>'+esc(description)+'</p></div>'+
 '<div class="garden-book-actions"><span>Saved on this device</span><button type="button" class="garden-text-btn" data-session="resume">Continue ↗</button></div>';
}
document.addEventListener('click',event=>{
 if(event.target.closest('[data-session="resume"]')){event.preventDefault();resume();}
});
window.addEventListener('psychdesk:tab-changed',event=>recordTab(event.tab));
window.PsychDeskSession={getResume,homeButton,homeDetail,readerOpened,readerPage,noteOpened,resume};
})();
