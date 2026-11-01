/* Device-local crash drafts and bounded note revision history. No cloud schema changes. */
(()=>{'use strict';
const core=window.PsychDeskCore;if(!core)return;
const prefix='psychdesk-note-history-v1:',maxVersions=8,versionInterval=90*1000;
const esc=core.esc;
const owner=()=>{try{return window.PsychDeskFirebase?.getUserId?.()||localStorage.getItem('psychdesk-last-user-v3')||'guest'}catch{return 'guest'}};
const key=(kind,id)=>prefix+owner()+':'+kind+':'+(id||'new');
const safeRead=(k,defaultValue)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??defaultValue}catch{return defaultValue}};
function isValue(v){return v&&typeof v==='object'&&typeof v.title==='string'&&typeof v.body==='string'}
function restoreDraft(note){
 const saved=safeRead(key('draft',note?.id),null);
 if(!isValue(saved)||!saved.savedAt)return note;
 // Never restore an older draft over a newer Firestore-synced note.
 if(note?.updatedAt&&Date.parse(note.updatedAt)>=Date.parse(saved.savedAt))return note;
 return {...note,title:saved.title,body:saved.body,tags:saved.tags||'',subjectId:saved.subjectId||'',draftRestored:true};
}
function saveDraft(form){
 if(!form?.isConnected)return false;
 const data=new FormData(form),id=String(data.get('id')||'');
 const draft={
  title:String(data.get('title')||'').slice(0,140),
  body:String(data.get('body')||'').slice(0,100000),
  tags:String(data.get('tags')||'').slice(0,150),
  subjectId:String(data.get('subjectId')||''),
  savedAt:new Date().toISOString()
 };
 try{localStorage.setItem(key('draft',id),JSON.stringify(draft));return true}catch{return false}
}
function clearDraft(id){try{localStorage.removeItem(key('draft',id))}catch{}}
function recordVersion(note){
 if(!isValue(note)||!note.id)return false;
 const k=key('versions',note.id),raw=safeRead(k,[]),items=Array.isArray(raw)?raw.filter(isValue):[];
 const last=items[0];
 if(last&&Date.now()-Date.parse(last.savedAt)<versionInterval)return true;
 const snapshot={title:note.title,body:note.body,tags:note.tags||'',subjectId:note.subjectId||'',savedAt:new Date().toISOString()};
 if(last&&last.title===snapshot.title&&last.body===snapshot.body&&last.tags===snapshot.tags&&last.subjectId===snapshot.subjectId)return true;
 // Full body is kept; do not silently truncate snapshots or modify cloud study data.
 const next=[snapshot,...items].slice(0,maxVersions);
 try{localStorage.setItem(k,JSON.stringify(next));return true}catch{return false}
}
function versions(id){const list=safeRead(key('versions',id),[]);return Array.isArray(list)?list.filter(isValue):[]}
function historyHTML(id){
 if(!id)return '<p class="note">History begins after the first edit to a saved note.</p>';
 const items=versions(id);
 if(!items.length)return '<p class="note">No earlier versions yet. Previous content is kept when this note changes.</p>';
 return '<div class="note-history-list">'+items.map((v,i)=>
  '<button type="button" data-note-restore="'+i+'"><strong>'+esc(new Date(v.savedAt).toLocaleString())+'</strong><span>'+esc(v.title||'Untitled')+' · '+v.body.length.toLocaleString()+' characters</span></button>'
 ).join('')+'</div><p class="note">Restoring loads an earlier version into the editor. Autosave then saves it like any other edit. History is stored on this device.</p>';
}
function restoreVersion(id,index){
 const entry=versions(id)[index];if(!entry)return false;
 const f=document.getElementById('noteForm');if(!f||f.elements.id.value!==id)return false;
 for(const field of ['title','body','tags','subjectId'])if(f.elements[field])f.elements[field].value=entry[field]||'';
 f.elements.body.dispatchEvent(new Event('input',{bubbles:true}));
 return true;
}
document.addEventListener('click',event=>{
 const btn=event.target.closest('[data-note-restore]');
 if(!btn)return;
 event.preventDefault();
 const form=document.getElementById('noteForm'),id=form?.elements.id?.value;
 if(id&&restoreVersion(id,Number(btn.dataset.noteRestore))){
  core.toast('Earlier version loaded. Autosave will keep this restoration.');
 }
});
window.PsychDeskNoteHistory={saveDraft,clearDraft,recordVersion,versions,historyHTML,restoreDraft,restoreVersion};
})();
