/* PsychDesk notes + Drive. Public setup persists; Drive tokens stay in memory. */
(()=>{'use strict';
const core=window.PsychDeskCore;if(!core)return;
const CONF='psychdesk-cloud-v2';const DRIVE_SESSION_KEY='psychdesk-drive-tab-v1';const SCOPE='https://www.googleapis.com/auth/drive.file';
const validClientId=value=>typeof value==='string' && (!value || /^[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(value));
let stored={};try{stored=JSON.parse(localStorage.getItem(CONF)||'{}')||{}}catch{}
// Never spread legacy settings: browser-key prototypes may have left secret fields.
let config={clientId:validClientId(stored.clientId)?stored.clientId:''};
for(const field of ['syncStamp','backupId','lastSyncAt']) if(typeof stored[field]==='string') config[field]=stored[field];
stored=null;
let accessToken='',tokenExpires=0,driveBusy=false,driveEpoch=0;
let driveAbort=new AbortController(),pendingDriveReject=null;
let noteQuery='',noteSubject='all';
const escape=core.esc;
function persist(){try{localStorage.setItem(CONF,JSON.stringify(config));return true}catch{try{localStorage.removeItem(CONF)}catch{}return false}}
// Purge unsupported fields, including legacy secret fields, on startup.
persist();
function clientId(){const builtIn=window.PSYCHDESK_DRIVE_CLIENT_ID; if(validClientId(builtIn)&&builtIn)return builtIn;const value=window.PsychDeskFirebase?.getUserId?.()?core.getData().preferences?.driveClientId:undefined;return validClientId(value)?value:config.clientId}
// A limited Drive token may survive a refresh in the same browser tab, but never
// goes to localStorage, Firestore, service workers or study backups.
function forgetDriveSession(){try{sessionStorage.removeItem(DRIVE_SESSION_KEY)}catch{}}
function storeDriveSession(email){
 const uid=window.PsychDeskFirebase?.getUserId?.();
 const owner=window.PsychDeskFirebase?.getConnectionStatus?.()?.email||'';
 if(!uid||!owner||!email||owner.toLowerCase()!==email.toLowerCase()||!accessToken||tokenExpires<Date.now()+30000)return false;
 try{sessionStorage.setItem(DRIVE_SESSION_KEY,JSON.stringify({uid,email,token:accessToken,expiresAt:tokenExpires,clientId:clientId()}));return true}catch{return false}
}
function clearDriveAuthorization({forgetSession=true}={}){
 pendingUpload=null;driveEpoch++;accessToken='';tokenExpires=0;driveAbort.abort();driveAbort=new AbortController();
 if(forgetSession)forgetDriveSession();
 if(pendingDriveReject){pendingDriveReject(Error('Account or Drive setup changed. Reconnect Google Drive.'));pendingDriveReject=null;}
}
async function restoreDriveSession(){
 const uid=window.PsychDeskFirebase?.getUserId?.();
 if(!uid)return false;
 if(accessToken&&Date.now()<tokenExpires)return true;
 let stored;
 try{stored=JSON.parse(sessionStorage.getItem(DRIVE_SESSION_KEY)||'null')}catch{forgetDriveSession();return false}
 if(!stored)return false;
 if(stored.uid!==uid||stored.clientId!==clientId()||typeof stored.token!=='string'||stored.token.length>8192||!Number.isFinite(stored.expiresAt)||stored.expiresAt<=Date.now()+30000){
  forgetDriveSession();return false;
 }
 clearDriveAuthorization({forgetSession:false});
 const epoch=driveEpoch;
 accessToken=stored.token;tokenExpires=stored.expiresAt;
 try{
  await verifyDriveConnection();
  if(epoch!==driveEpoch)return false;
  window.dispatchEvent(new Event('psychdesk:drive-connected'));
  return true;
 }catch{
  if(epoch===driveEpoch)clearDriveAuthorization();
  return false;
 }
}
// Reuse the short-lived Google token granted during Firebase Google sign-in.
// Token never enters localStorage, Firestore, backups or GitHub.
// Google must explicitly consent to the drive.file scope.
function acceptGoogleSignInDriveToken(token, uid){
 if(typeof token!=='string'||!token||!uid||window.PsychDeskFirebase?.getUserId?.()!==uid)return false;
 clearDriveAuthorization();
 accessToken=token;
 tokenExpires=Date.now()+50*60*1000; // conservative upper bound; Drive's 401 will require reconnect
 try{const node=document.querySelector('#driveStatus');if(node)node.textContent='✓ Drive connected via Google sign-in · Last backup: '+whenStamp(config.lastSyncAt)}catch{}
 window.dispatchEvent(new Event('psychdesk:drive-connected'));
 void verifyDriveConnection().catch(()=>{}); // Validate the Drive account before remembering a tab session.
 return true;
}
function resetSession({keepRefreshSession=false}={}){
 window.dispatchEvent(new Event('psychdesk:session-reset'));
 clearDriveAuthorization({forgetSession:!keepRefreshSession});
}
function syncPublicSettings(){
 if(window.PSYCHDESK_DRIVE_CLIENT_ID)return; // Configured app ID outranks legacy per-user IDs.
 const prefs=core.getData().preferences;if(!prefs)return;
 if(validClientId(prefs.driveClientId)){if(config.clientId!==prefs.driveClientId)clearDriveAuthorization();config.clientId=prefs.driveClientId;persist();}
 else if(config.clientId){prefs.driveClientId=config.clientId;core.save();}
}
window.addEventListener('psychdesk:account-ready',()=>{syncPublicSettings();void restoreDriveSession();});
window.addEventListener('psychdesk:data-replaced',()=>{
 if(window.PsychDeskFirebase?.getUserId?.() && validClientId(core.getData().preferences?.driveClientId))syncPublicSettings();
});
function validData(d){return d&&[1,2].includes(d.version)&&Array.isArray(d.subjects)&&Array.isArray(d.tasks)&&Array.isArray(d.cards)&&Array.isArray(d.sessions)&&(!d.notes||Array.isArray(d.notes))}
function subjectName(i){return core.getData().subjects.find(s=>s.id===i)?.name||'General';}
function whenStamp(stamp){return stamp?new Date(stamp).toLocaleString():'Not synced yet'}
function noteList(){let all=core.getData().notes||[];let q=noteQuery.toLowerCase().trim();return all.filter(n=>(noteSubject==='all'||n.subjectId===noteSubject)&&(!q||`${n.title} ${n.body} ${n.tags||''}`.toLowerCase().includes(q))).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));}
function noteCards(){let notes=noteList();return notes.length?notes.map(n=>`<div class="note-card-wrap"><button class="note-card" data-cloud="editNote" data-id="${escape(n.id)}"><strong>${escape(n.title||'Untitled note')}</strong><div class="preview">${escape((n.body||'').trim().slice(0,260)||'Empty note — tap to write')}</div><div class="note-meta"><span>${escape(subjectName(n.subjectId))}${n.tags?' · '+escape(n.tags):''}</span><span>${n.updatedAt?escape(new Date(n.updatedAt).toLocaleDateString()):''}</span></div></button><div class="note-sticky-convert"><button type="button" data-cloud="makeStickyFromNote" data-id="${escape(n.id)}">✳ Make sticky</button></div></div>`).join(''):'<div class="empty"><div class="empty-symbol">✎</div>No matching notes. Add a note or change the search.</div>'}
function renderNotes(){let d=core.getData();return `<section class="hero"><div class="eyebrow">YOUR PERSONAL KNOWLEDGE BASE</div><h1>Study notes.</h1><p>Collect ideas, compare theories and keep what matters.</p></section>
<div class="summary-grid"><div class="stat"><span class="number">${d.notes.length}</span><span class="stat-label">SAVED NOTES</span></div><div class="stat"><span class="number">${d.subjects.length}</span><span class="stat-label">SUBJECTS</span></div><div class="stat"><span class="number">${d.cards.length}</span><span class="stat-label">FLASHCARDS</span></div></div>
<div class="section-row"><h2>Your notebook</h2><div class="button-row"><button class="secondary" type="button" data-tab="stickies">✳ Sticky Notes</button><button class="link-btn" data-cloud="newNote">+ New note</button></div></div>
<div class="field"><input aria-label="Search study notes" id="noteSearch" placeholder="Search theories, definitions, tags…" value="${escape(noteQuery)}" type="search"></div>
<div class="field"><select id="noteFilter" aria-label="Filter notes by subject"><option value="all">All subjects</option>${d.subjects.map(s=>`<option value="${escape(s.id)}" ${noteSubject===s.id?'selected':''}>${escape(s.name)}</option>`).join('')}</select></div>
<div id="noteResults">${noteCards()}</div>
<div class="card" style="margin-top:14px"><strong style="font-size:13px">Your work stays yours.</strong><p class="note">Notes stay on your device and sync to your Google account when signed in. Google Drive backups are optional. Books and PDFs live in your subject library.</p><div class="button-row"><button class="secondary" data-tab="materials">Subject library</button></div></div>`}
function noteEditor(note){let n=note||{id:'',title:'',body:'',subjectId:'',tags:''};core.openModal(n.id?'Edit study note':'New study note',`<form id="noteForm"><input type="hidden" name="id" value="${escape(n.id)}"><div class="field"><label>Note title *</label><input name="title" maxlength="140" required placeholder="e.g. Piaget's cognitive stages" value="${escape(n.title)}"></div><div class="field"><label>Subject</label><select name="subjectId">${core.subjectOptions(n.subjectId)}</select></div><div class="field"><label>Tags (comma-separated)</label><input name="tags" maxlength="150" placeholder="development, memory, exam" value="${escape(n.tags||'')}"></div><div class="field"><label>Your notes</label><textarea class="note-editor" name="body" maxlength="100000" placeholder="Write definitions, examples, research findings and questions…">${escape(n.body||'')}</textarea></div><div class="button-row"><button type="submit" class="primary">Save note</button>${n.id?`<button class="secondary" type="button" data-cloud="deleteNote" data-id="${escape(n.id)}">Delete</button>`:''}</div></form><p class="note" style="margin-top:13px">Saved locally and synced through Firestore when signed in. Drive backup is optional.</p>`);
 document.querySelector('#noteForm').addEventListener('submit',e=>{e.preventDefault();let f=new FormData(e.currentTarget),title=String(f.get('title')||'').trim(),body=String(f.get('body')||''),tags=String(f.get('tags')||'').trim();if(!title)return;let d=core.getData(),existing=d.notes.find(x=>x.id===f.get('id'));const now=new Date().toISOString();const update={title,body,tags,subjectId:String(f.get('subjectId')||''),updatedAt:now};if(existing)Object.assign(existing,update);else d.notes.unshift({...update,id:core.id(),createdAt:now});core.save();core.closeModal();core.render();core.toast('Note saved on this device');});}
function legacySettingsView(){let secure=location.protocol==='https:'||location.hostname==='localhost';return `<div class="settings-section"><h3>Google Drive</h3><p class="note">Syncs subjects, study tasks, flashcards, sessions, preferences and notes as <b>psychdesk-backup.json</b>. It also writes <b>Study Notes.md</b> to a dedicated PsychDesk folder. Manual sync helps avoid accidentally overwriting another device.</p><p class="cloud-status" id="driveStatus">${accessToken&&Date.now()<tokenExpires?'Connected for this session':'Not connected'} · Last successful upload/download: ${escape(whenStamp(config.lastSyncAt))}</p><form id="googleSettingsForm"><div class="field"><label>Google OAuth Web Client ID</label><input name="clientId" autocomplete="off" placeholder="123456-…apps.googleusercontent.com" value="${escape(clientId())}"></div><button class="secondary" type="submit" style="width:100%">Save public client ID</button></form><p class="note">This public ID stays in this browser after sign-out. When signed in, it also syncs with your account settings; wait for ✓ Synced before switching devices. Reconnect Drive after sign-out, reload or expiry.</p><div class="helper-links"><a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud credentials ↗</a><a href="https://console.cloud.google.com/apis/library/drive.googleapis.com" target="_blank" rel="noopener noreferrer">Enable Drive API ↗</a></div><p class="note">${secure?'For Error 400: origin_mismatch, open the exact OAuth Web Client used above and add '+escape(location.origin)+' under Authorized JavaScript origins (no path or trailing slash). This is separate from authorized domains in Firebase Authentication.':'Drive OAuth is unavailable in a downloaded HTML file or Android WebView. Host PsychDesk on HTTPS and register that origin.'}</p><div class="button-row" style="margin-bottom:9px"><button class="primary" data-cloud="connectDrive" ${!secure?'disabled':''}>Connect / reconnect Drive</button><button class="secondary" data-cloud="disconnectDrive">Disconnect</button></div><div class="button-row"><button class="secondary" data-cloud="uploadDrive">↑ Upload to Drive</button><button class="secondary" data-cloud="downloadDrive">↓ Restore from Drive</button></div><p class="note">A restore replaces the local planner after confirmation. Upload will ask before overwriting cloud changes. No background sync or automatic merge.</p></div>
<div class="settings-section"><h3>Data control</h3><p class="note">Cloud backup excludes access tokens. PDF and Markdown originals stay in Drive; backups contain the subject catalogue and notes, not copies of the books. Cloud files are not end-to-end encrypted by PsychDesk. Avoid confidential clinical material.</p></div>`}

function settingsView(){if(!window.PSYCHDESK_DRIVE_CLIENT_ID)return legacySettingsView();const secure=location.protocol==='https:'||location.hostname==='localhost';const connected=!!accessToken&&Date.now()<tokenExpires;return `<div class="settings-section"><h3>Google Drive backups</h3><p class="note">Keep a backup of your subjects, notes, flashcards and progress in your own Google Drive. Books and PDFs are stored in your private PsychDesk folder.</p><p class="cloud-status" id="driveStatus">${connected?'✓ Drive connected':'Drive not connected'} · Last backup: ${escape(whenStamp(config.lastSyncAt))}</p><div class="button-row" style="margin-bottom:10px"><button class="primary" data-cloud="connectDrive" ${!secure?'disabled':''}>${connected?'Reconnect Google Drive':'Connect Google Drive'}</button></div><div class="button-row"><button class="secondary" data-cloud="uploadDrive">↑ Back up to Drive</button><button class="secondary" data-cloud="downloadDrive">↓ Restore backup</button></div><p class="note">Drive access needs your permission and may expire; your Google login and Firestore study progress are separate. Restoring replaces local planner data after confirmation. No automatic Drive merging.</p></div><div class="settings-section"><h3>Data and privacy</h3><p class="note">Your Drive files stay in your Google account. A short-lived Drive token is kept only in this browser tab to survive refreshes. It expires automatically and is cleared on sign-out. Backups include your notes and study catalogue but not PDF or Markdown file contents. Avoid confidential clinical material.</p></div>`}
function legacyOpenSettings(){core.openModal('Google Drive & backups',settingsView());let form=document.querySelector('#googleSettingsForm');form?.addEventListener('submit',e=>{e.preventDefault();const value=String(new FormData(form).get('clientId')||'').trim();
 if(!validClientId(value)){core.toast('Enter a public OAuth Web Client ID ending in .apps.googleusercontent.com, not a secret key.');return;}
 if(value!==clientId())clearDriveAuthorization();
 config.clientId=value;delete config.syncStamp;delete config.backupId;delete config.lastSyncAt;
 const saved=persist();
 if(window.PsychDeskFirebase?.getUserId?.()){core.getData().preferences.driveClientId=value;core.save();}
 core.toast(saved?'Public client ID saved. Drive authorization is separate.':'Browser storage unavailable. Keep a copy of your public client ID.');
 refreshSettings();})}

function openSettings(){if(!window.PSYCHDESK_DRIVE_CLIENT_ID)return legacyOpenSettings();core.openModal('Google Drive & backups',settingsView())}
function errorMsg(error){return String(error?.message||error||'Unknown error').slice(0,330)}
function isSupportedOrigin(){return location.protocol==='https:'||location.hostname==='localhost'}
function checkAuth(){if(!accessToken||Date.now()>=tokenExpires){clearDriveAuthorization();throw Error('Google authorization expired. Reconnect Google Drive.')}}
function driveError(error){
 const message=errorMsg(error);
 return /origin_mismatch/i.test(message)?Error('Google rejected this website origin. In Google Cloud, edit the OAuth Web Client whose ID is saved here and add '+location.origin+' to Authorized JavaScript origins (no path or trailing slash).'):Error(message);
}
async function connectDrive(){
 if(!isSupportedOrigin())throw Error('Google OAuth requires a hosted HTTPS site or localhost.');
 if(window.PsychDeskAndroid)throw Error('Google sign-in is not supported inside Android WebView. Open the hosted PsychDesk site in Chrome.');
 const publicId=clientId();if(!publicId)throw Error('PsychDesk Google Drive setup is unavailable. Contact the app administrator.');
 if(!window.google?.accounts?.oauth2)throw Error('Google sign-in script is loading. Check internet access, then tap Connect Drive again.');
 clearDriveAuthorization();const requestEpoch=driveEpoch;
 return new Promise((resolve,reject)=>{
  pendingDriveReject=reject;
  const fail=error=>{if(requestEpoch!==driveEpoch)return;pendingDriveReject=null;reject(driveError(error));};
  try{
   const client=google.accounts.oauth2.initTokenClient({
    client_id:publicId,scope:SCOPE,
    callback:r=>{
     if(requestEpoch!==driveEpoch)return;
     if(r.error||!r.access_token){fail(r.error_description||r.error||'Authorization cancelled');return;}
     pendingDriveReject=null;accessToken=r.access_token;tokenExpires=Date.now()+(Number(r.expires_in)||3300)*1000-60000;
     delete config.syncStamp;delete config.backupId;delete config.lastSyncAt;persist();resolve();
     void verifyDriveConnection().catch(()=>{});
    },
    error_callback:e=>fail(e.type||'Google popup failed')
   });
   client.requestAccessToken({prompt:''});
  }catch(e){fail(e)}
 });
}
// Read-only Drive API check: possession of an OAuth token alone does not prove access.
async function verifyDriveConnection(){
 if(!accessToken||Date.now()>=tokenExpires)throw Error('Drive permission is missing or expired. Reconnect Google Drive.');
 const epoch=driveEpoch;
 const status=await api('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)');
 if(epoch!==driveEpoch)throw Error('Drive session changed. Reconnect and retry.');
 const email=status?.user?.emailAddress||'';
 const owner=window.PsychDeskFirebase?.getConnectionStatus?.()?.email||'';
 if(email&&owner&&email.toLowerCase()!==owner.toLowerCase()){
  clearDriveAuthorization();
  throw Error('Drive belongs to a different Google account. Reconnect with your PsychDesk Google account.');
 }
 if(email)storeDriveSession(email);
 return {connected:true,email};
}
async function api(url,options={}){
 checkAuth();const requestEpoch=driveEpoch;
 const res=await driveRequest(url,options);
 const body=await res.text();
 if(requestEpoch!==driveEpoch)throw Error('Drive session changed. Reconnect Google Drive.');
 let json;try{json=JSON.parse(body)}catch{json=null}
 if(res.status===401){clearDriveAuthorization();throw Error('Google authorization expired or was revoked. Reconnect Google Drive.');}
 if(!res.ok)throw Error(json?.error?.message||`${res.status} ${res.statusText}`);
 return json??body;
}
const base='https://www.googleapis.com/drive/v3/files';const uploadBase='https://www.googleapis.com/upload/drive/v3/files';
async function list(name,parent){let clause=`name = '${String(name).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}' and '${parent}' in parents and trashed = false`;let p=new URLSearchParams({q:clause,fields:'nextPageToken,files(id,name,mimeType,modifiedTime)',pageSize:'100'});const response=await api(`${base}?${p.toString()}`);return response.files||[]}
async function findOrMakeFolder(name,parent){let f=(await list(name,parent)).find(f=>f.mimeType==='application/vnd.google-apps.folder');if(f)return f.id;let d=await api(`${base}?fields=id`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,mimeType:'application/vnd.google-apps.folder',parents:[parent]})});return d.id}
async function folderId(){return findOrMakeFolder('PsychDesk','root')}
async function findFile(name,parent){return (await list(name,parent)).find(f=>f.name===name)}
async function putFile(name,mime,contents,parent,existing){if(existing){return api(`${uploadBase}/${encodeURIComponent(existing.id)}?uploadType=media&fields=id,name,modifiedTime`,{method:'PATCH',headers:{'Content-Type':mime},body:contents});}
 let bound='psychdesk_'+Math.random().toString(36).slice(2),body=new Blob([`--${bound}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,JSON.stringify({name,parents:[parent],mimeType:mime}),`\r\n--${bound}\r\nContent-Type: ${mime}\r\n\r\n`,contents,`\r\n--${bound}--\r\n`]);return api(`${uploadBase}?uploadType=multipart&fields=id,name,modifiedTime`,{method:'POST',headers:{'Content-Type':`multipart/related; boundary=${bound}`},body});}
function notesMarkdown(d){let notes=d.notes||[];return '# PsychDesk · Study Notes\n\nExported: '+new Date().toISOString()+'\n\n'+(notes.length?notes.map(n=>`---\n\n## ${n.title}\n\nSubject: ${d.subjects.find(s=>s.id===n.subjectId)?.name||'General'}\nTags: ${n.tags||'none'}\nUpdated: ${n.updatedAt||'unknown'}\n\n${n.body||''}\n`).join('\n'):'No notes yet.\n')}
async function pushDrive(){let folder=await folderId();let old=await findFile('psychdesk-backup.json',folder);if(old&&(!config.syncStamp||old.modifiedTime!==config.syncStamp)){
  if(!confirm('Drive already contains a different backup. Uploading will REPLACE it with this device’s data. Cancel to restore from Drive or export a local backup first. Continue?'))return false;}
 const d=core.getData();if(new Blob([JSON.stringify(d)]).size>4_500_000)throw Error('Cloud backup exceeds the 4.5 MB safe limit; export your data locally and reduce note size before uploading.');const backup=await putFile('psychdesk-backup.json','application/json',JSON.stringify(d,null,2),folder,old);
 try{let oldMd=await findFile('Study Notes.md',folder);await putFile('Study Notes.md','text/markdown',notesMarkdown(d),folder,oldMd)}catch(e){config.syncStamp=backup.modifiedTime;config.backupId=backup.id;config.lastSyncAt=new Date().toISOString();persist();throw Error('Main backup uploaded successfully, but the readable notes file failed: '+errorMsg(e))}
 config.syncStamp=backup.modifiedTime;config.backupId=backup.id;config.lastSyncAt=new Date().toISOString();persist();return true;}
async function pullDrive(){let folder=await folderId(),remote=await findFile('psychdesk-backup.json',folder);if(!remote)throw Error('No PsychDesk cloud backup exists yet. Upload your device data first.');
 let raw=await api(`${base}/${encodeURIComponent(remote.id)}?alt=media`);if(typeof raw!=='string')raw=JSON.stringify(raw);if(raw.length>5_000_000)throw Error('Backup is too large to restore in this version.');let imported;try{imported=JSON.parse(raw)}catch{throw Error('Cloud backup contains invalid JSON')};if(!validData(imported))throw Error('The Drive file is not a compatible PsychDesk backup');
 if(!confirm('RESTORE FROM DRIVE? This will REPLACE all local subjects, notes, tasks, cards, and study logs on this device. Export a local backup first if needed.'))return false;
 // Revalidate and replace using the existing local data model without another confirmation.
 core.replaceData(imported);core.save();config.syncStamp=remote.modifiedTime;config.backupId=remote.id;config.lastSyncAt=new Date().toISOString();persist();return true;}
async function cloudAction(job){if(driveBusy){core.toast('A Drive action is already running');return}driveBusy=true;let requestEpoch=driveEpoch;const status=document.querySelector('#driveStatus');if(status)status.textContent='Working with Google Drive…';try{if(job==='connect'){const connection=connectDrive();requestEpoch=driveEpoch;await connection;core.toast('Google Drive connected for this session')}else if(job==='upload'){let success=await pushDrive();if(success)core.toast('Full backup and notes uploaded to Drive')}else if(job==='download'){let success=await pullDrive();if(success)core.toast('Restored from Google Drive')}}catch(e){if(requestEpoch===driveEpoch){core.toast(errorMsg(e));alert(errorMsg(e))}}finally{driveBusy=false;if(document.querySelector('#driveStatus'))document.querySelector('#driveStatus').textContent=`${accessToken&&Date.now()<tokenExpires?'Connected':'Not connected'} · Last sync: ${whenStamp(config.lastSyncAt)}`}}
function disconnectDrive(){if(accessToken&&window.google?.accounts?.oauth2)google.accounts.oauth2.revoke(accessToken,()=>{});clearDriveAuthorization();core.toast('Disconnected from Drive; public setup is saved');core.closeModal()}
function refreshSettings(){core.closeModal();openSettings()}
let pendingUpload=null;
async function driveRequest(url,options={}){
 checkAuth();const epoch=driveEpoch,sessionSignal=driveAbort.signal,controller=new AbortController();
 const abort=()=>controller.abort();sessionSignal.addEventListener('abort',abort,{once:true});
 const timeout=setTimeout(()=>controller.abort(),120000);
 try{const response=await fetch(url,{...options,signal:controller.signal,headers:{Authorization:`Bearer ${accessToken}`,...options.headers}});
  if(epoch!==driveEpoch)throw Error('Drive session changed. Reconnect Drive.');
  if(response.status===401){clearDriveAuthorization();throw Error('Drive authorization expired. Reconnect Drive and retry.');}
  return response;
 }catch(error){if(controller.signal.aborted)throw Error('Drive transfer stopped or timed out. Reconnect if needed, then retry the same file.');throw error;}
 finally{clearTimeout(timeout);sessionSignal.removeEventListener('abort',abort)}
}
// Read only an app-owned Drive PDF/Markdown for the in-app reader. Never cache document bytes.
async function fetchStudyMaterial(driveId){
 const id=String(driveId||'');
 if(!/^[A-Za-z0-9_-]{10,120}$/.test(id))throw Error('This book is missing its valid Drive file ID.');
 if(!accessToken||Date.now()>=tokenExpires)throw Error('Reconnect Google Drive to read your books.');
 const epoch=driveEpoch;
 const response=await driveRequest(base+'/'+encodeURIComponent(id)+'?alt=media');
 if(!response.ok)throw Error('Google Drive could not open this book (HTTP '+response.status+'). Check file access and retry.');
 const size=Number(response.headers.get('Content-Length')||0);
 if(size>80*1024*1024)throw Error('This book is over the 80 MB in-browser reader limit. Open it in Google Drive instead.');
 const blob=await response.blob();
 if(epoch!==driveEpoch)throw Error('Google Drive session changed. Reconnect and reopen the book.');
 if(blob.size>80*1024*1024)throw Error('This file is too large for the in-browser reader. Open it in Google Drive.');
 return blob;
}
async function uploadMaterial(file,subject,onProgress=()=>{}){
 if(driveBusy)throw Error('Another Drive operation is running. Please wait.');
 const epoch=driveEpoch;checkAuth();if(!file||!file.size||file.size>512*1024*1024)throw Error('Choose a non-empty PDF or Markdown file up to 512 MB.');
 const ext=file.name.toLowerCase().split('.').pop();if(!['pdf','md','markdown'].includes(ext))throw Error('Only PDF and Markdown books are supported.');
 if(ext==='pdf' && !(await file.slice(0,1024).text()).includes('%PDF-'))throw Error('This file does not contain a PDF header.');
 if(epoch!==driveEpoch)throw Error('Account changed before upload. Select the file again.');driveBusy=true;
 const identity=[subject.id,file.name,file.size,file.lastModified||0].join('|');
 const mime=ext==='pdf'?'application/pdf':'text/markdown';
 const result=async response=>{const value=await response.json();if(epoch!==driveEpoch)throw Error('Account changed during upload.');if(!value.id)throw Error('Drive did not return the saved file ID.');pendingUpload=null;onProgress(100);return {driveId:value.id,url:'https://drive.google.com/file/d/'+encodeURIComponent(value.id)+'/view',fileName:file.name,size:file.size,kind:ext==='pdf'?'pdf':'markdown'};};
 const accepted=response=>{const match=(response.headers.get('Range')||'').match(/bytes=0-(\d+)/);return match?Number(match[1])+1:0;};
 try{
  if(!pendingUpload || pendingUpload.identity!==identity){
   const root=await folderId(),library=await findOrMakeFolder('Study Materials',root);
   const folder=await findOrMakeFolder(subject.name.slice(0,100)+' ['+subject.id+']',library);
   const response=await driveRequest(uploadBase+'?uploadType=resumable&fields=id,name',{method:'POST',headers:{'Content-Type':'application/json','X-Upload-Content-Type':mime,'X-Upload-Content-Length':String(file.size)},body:JSON.stringify({name:file.name,parents:[folder]})});
   if(!response.ok)throw Error('Could not start Drive upload (HTTP '+response.status+').');
   const url=response.headers.get('Location');if(!url||new URL(url).origin!=='https://www.googleapis.com')throw Error('Drive did not return a valid upload session.');
   pendingUpload={identity,url,offset:0};
  }else{
   const probe=await driveRequest(pendingUpload.url,{method:'PUT',headers:{'Content-Range':'bytes */'+file.size},body:new Blob([])});
   if(probe.status===200||probe.status===201)return await result(probe);
   if(probe.status!==308){pendingUpload=null;throw Error('The upload session expired. Retry to start a new upload.');}
   pendingUpload.offset=accepted(probe);
  }
  while(pendingUpload.offset<file.size){
   const start=pendingUpload.offset,end=Math.min(start+8*1024*1024,file.size);
   const response=await driveRequest(pendingUpload.url,{method:'PUT',headers:{'Content-Type':mime,'Content-Range':`bytes ${start}-${end-1}/${file.size}`},body:file.slice(start,end)});
   if(response.status===200||response.status===201)return await result(response);
   if(response.status!==308)throw Error('Drive upload paused (HTTP '+response.status+'). Retry the same file.');
   const offset=accepted(response);if(offset<=start||offset>end)throw Error('Drive could not confirm this chunk. Retry the same file.');
   pendingUpload.offset=offset;onProgress(Math.floor(offset/file.size*100));
  }
  throw Error('Drive has not confirmed completion. Retry the same file to check its status.');
 }finally{driveBusy=false}
}
function handle(event){let button=event.target.closest('[data-cloud]');if(!button)return;event.preventDefault();let action=button.dataset.cloud,uid=button.dataset.id;switch(action){
 case 'newNote':noteEditor();break;
 case 'editNote':noteEditor(core.getData().notes.find(n=>n.id===uid));break;
 case 'makeStickyFromNote':window.PsychDeskStickies?.fromNote(core.getData().notes.find(n=>n.id===uid));break;
 case 'deleteNote':if(confirm('Delete this note permanently from this device? Your previous Drive backup is not changed until you upload again.')){let d=core.getData();d.notes=d.notes.filter(n=>n.id!==uid);core.save();core.closeModal();core.render();core.toast('Note deleted locally')}break;
 case 'driveSettings':openSettings();break;

 case 'connectDrive':cloudAction('connect');break;
 case 'disconnectDrive':disconnectDrive();break;
 case 'uploadDrive':cloudAction('upload');break;
 case 'downloadDrive':cloudAction('download');break;

 }}
document.addEventListener('click',handle);
document.addEventListener('change',e=>{if(e.target.id==='noteFilter'){noteSubject=e.target.value;document.querySelector('#noteResults').innerHTML=noteCards()}});
document.addEventListener('input',e=>{if(e.target.id==='noteSearch'){noteQuery=e.target.value;document.querySelector('#noteResults').innerHTML=noteCards()}});
window.PsychDeskCloud={renderNotes,openSettings,resetSession,connectDrive,verifyDriveConnection,restoreDriveSession,acceptGoogleSignInDriveToken,fetchStudyMaterial,uploadMaterial,noteEditor,isConnected:()=>Boolean(accessToken&&Date.now()<tokenExpires),cancelUpload:clearDriveAuthorization};
})();
