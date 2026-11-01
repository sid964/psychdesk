/* Subject library: catalogue in account sync, original books in private Google Drive. */
(()=>{'use strict';const core=window.PsychDeskCore,cloud=window.PsychDeskCloud,h=core.esc;
let selected='',query='',uploading=false,generation=0;
const subjects=()=>core.getData().subjects;const current=()=>subjects().find(s=>s.id===selected)||subjects()[0];
const safeUrl=value=>{try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?url.href:''}catch{return ''}};
function open(subjectId){selected=subjectId||'';query='';core.closeModal();core.setTab('materials')}
function render(){const subject=current();if(!subject)return '<div class="empty">Add a subject in the study planner to start your library.</div>';selected=subject.id;
 const data=core.getData(),items=(data.materials||[]).filter(m=>m.subjectId===subject.id&&String(m.title).toLowerCase().includes(query.toLowerCase())),notes=data.notes.filter(n=>n.subjectId===subject.id);
 const files=items.filter(m=>m.kind!=='link'),links=items.filter(m=>m.kind==='link');
 const card=m=>`<article class="material-card"><span class="material-type">${h(m.kind==='markdown'?'MD BOOK':m.kind==='pdf'?'PDF BOOK':'STUDY LINK')}</span><h3>${h(m.title)}</h3><p>${h(m.fileName||'Saved resource')}${m.size?' · '+(m.size/1024/1024).toFixed(1)+' MB':''}</p><div class="material-actions">${m.driveId&&m.kind!=='link'?`<button class="secondary" data-library="read" data-id="${h(m.id)}">Read & highlight</button>`:'' }${safeUrl(m.url)?`<a class="secondary" href="${h(safeUrl(m.url))}" target="_blank" rel="noopener noreferrer">Open ↗</a>`:'<span class="note">Link unavailable</span>'}<button class="mini-btn" data-library="edit" data-id="${h(m.id)}">Edit</button><button class="mini-btn" data-library="remove" data-id="${h(m.id)}">Remove</button></div></article>`;
 return `<section class="hero"><div class="eyebrow">YOUR SUBJECT LIBRARY</div><h1>Room for every idea.</h1><p>Books, lecture notes and useful links, organized by subject.</p></section><div class="library-toolbar"><div class="field"><label for="librarySubject">Subject department</label><select id="librarySubject">${subjects().map(s=>`<option value="${h(s.id)}" ${s.id===subject.id?'selected':''}>${h(s.name)}</option>`).join('')}</select></div></div><h2 class="library-title">${h(subject.name)}</h2><div class="library-summary"><span>${files.length} books & files</span><span>${notes.length} notes</span><span>${links.length} links</span></div><div class="section-row"><h2>Books & PDFs</h2><button class="primary" data-library="upload">↑ Upload book</button></div><p class="note">PDF and Markdown files up to 512 MB. Originals are saved in Drive → PsychDesk → Study Materials → this subject. Keep this tab open during upload.</p><div class="material-grid">${files.map(card).join('')||'<div class="empty">Your bookshelf is ready. Upload a PDF or Markdown book, or add a link to a file already in Drive.</div>'}</div><div class="section-row"><h2>Subject notes</h2><button class="secondary" data-library="note">+ Write a note</button></div><div class="material-grid">${notes.map(n=>`<button class="note-card" data-cloud="editNote" data-id="${h(n.id)}"><strong>${h(n.title)}</strong><div class="preview">${h((n.body||'').slice(0,220))}</div></button>`).join('')||'<div class="empty">Keep your lecture notes and summaries here.</div>'}</div><div class="section-row"><h2>Study links</h2><button class="secondary" data-library="link">+ Add link</button></div><div class="material-grid">${links.map(card).join('')||'<div class="empty">Save a course page, video or an existing Drive file.</div>'}</div><button class="link-btn" data-library="resources">Explore reference readings & videos ↗</button><p class="note">Notes and your library catalogue sync when signed in. Wait for ✓ Synced before changing devices. Removing a catalogue entry leaves its original file in Drive.</p>`;
}
function editor(item){const subject=current();if(!subject)return;core.openModal(item?'Edit material':'Add study link',`<form id="materialForm"><div class="field"><label>Title</label><input name="title" required maxlength="180" value="${h(item?.title||'')}"></div><div class="field"><label>Web or Google Drive link</label><input name="url" type="url" required value="${h(item?.url||'')}" placeholder="https://..."></div><button class="primary">Save material</button></form>`);document.querySelector('#materialForm').addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.currentTarget),title=String(f.get('title')||'').trim(),url=safeUrl(f.get('url'));if(!title||!url)return core.toast('Use a title and an http or https link.');const data=core.getData(),previous=item?{...item}:null;
 const created=!item?{id:core.id(),subjectId:subject.id,title,url,kind:'link',createdAt:new Date().toISOString()}:null;
 if(item)Object.assign(item,{title,url});else data.materials.push(created);
 if(core.save()===false){
  if(item)Object.assign(item,previous);else data.materials=data.materials.filter(v=>v!==created);
  core.toast('Could not save this link. Your form is still open.');return;
 }
 core.closeModal();core.render()})}
function uploadDialog(){if(uploading)return core.toast('An upload is already running.');if(!cloud.isConnected()){cloud.openSettings();core.toast('Connect Drive, then return to your subject to upload a book.');return;}const subject=current();if(!subject)return;
 core.openModal('Upload to '+subject.name,`<form id="materialUpload"><div class="field"><label>PDF or Markdown book</label><input id="materialFile" type="file" accept=".pdf,.md,.markdown" required></div><div class="field"><label>Display title (optional)</label><input id="materialTitle" maxlength="180" placeholder="Use the file name"></div><progress id="uploadProgress" max="100" value="0" style="width:100%"></progress><p id="uploadStatus" role="status" class="note">Uploads go directly to your private Drive. Retry the same file after a connection interruption.</p><div class="button-row"><button id="uploadSubmit" class="primary">Upload to Drive</button><button type="button" class="secondary" data-library="cancel">Cancel & disconnect</button></div></form>`);
 let uploadedResult=null;
 document.querySelector('#materialUpload').addEventListener('submit',async e=>{e.preventDefault();if(uploading)return;const file=document.querySelector('#materialFile').files[0];if(!file)return;const title=document.querySelector('#materialTitle').value.trim()||file.name,epoch=generation,owner=core.getData();uploading=true;const status=document.querySelector('#uploadStatus'),button=document.querySelector('#uploadSubmit');button.disabled=true;status.textContent='Preparing Drive folders…';
 try{const result=uploadedResult||await cloud.uploadMaterial(file,subject,percent=>{if(epoch!==generation)return;const bar=document.querySelector('#uploadProgress');if(bar)bar.value=percent;status.textContent='Uploading '+percent+'% — keep this tab open.';});if(epoch!==generation||owner!==core.getData())return;
 const entry={...result,id:core.id(),subjectId:subject.id,title,createdAt:new Date().toISOString()};
 owner.materials.push(entry);
 if(core.save()===false){
  owner.materials=owner.materials.filter(x=>x!==entry);
  uploadedResult=result;
  status.textContent='File uploaded to Google Drive, but its library entry could not be saved. Free storage, then retry saving here. Do not upload the file again.';
  button.textContent='Retry saving library entry';
  return;
 }
 uploadedResult=null;
 core.closeModal();core.render();core.toast('Book saved in Drive and added to your subject.');
 }catch(error){if(epoch===generation){status.textContent=String(error.message||error);button.textContent='Retry upload';core.toast('Upload not completed. Your original file is unchanged.');}}finally{uploading=false;button.disabled=false;}
 });
}
document.addEventListener('change',e=>{if(e.target.id==='librarySubject'){selected=e.target.value;core.render()}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-library]');if(!b)return;e.preventDefault();const item=core.getData().materials.find(m=>m.id===b.dataset.id);switch(b.dataset.library){
case 'read':if(item)window.PsychDeskReader?.open(item.id);break;
 case 'upload':uploadDialog();break;case 'cancel':cloud.cancelUpload();break;
 case 'note':cloud.noteEditor({id:'',title:'',body:'',tags:'',subjectId:current().id});break;
 case 'link':editor();break;case 'edit':if(item)editor(item);break;
 case 'remove':if(item&&confirm('Remove this library entry? The original file will remain in Drive.')){
  const d=core.getData(),old=d.materials;d.materials=d.materials.filter(m=>m.id!==item.id);
  if(core.save()===false){d.materials=old;core.toast('Could not remove library entry: storage unavailable.');}
  else core.render();
 }break;
 case 'resources':core.resourceDialog(current());break;
}});
window.addEventListener('psychdesk:session-reset',()=>{generation++;uploading=false;selected='';});
window.PsychDeskMaterials={render,open,safeUrl};
})();