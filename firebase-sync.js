/* PsychDesk v3: per-Google-account sync. Uses the public Firebase Web SDK. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup,
  signOut
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {
  getFirestore, doc, getDocFromServer, runTransaction, onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

const core = window.PsychDeskCore;
const accountBtn = document.querySelector('#accountBtn');
const config = window.PSYCHDESK_FIREBASE_CONFIG || {};
const configured = Boolean(config.apiKey && config.projectId && config.authDomain && config.appId);
const limitBytes = 750000; // Keep comfortably below Firestore's 1 MiB document limit.
let auth = null, db = null, user = null, unsubscribe = null;
let revision = 0, signedInReady = false, busy = false, dirty = false, conflict = false;
let syncTimer = null, changes = 0, localGuest = null, lastError = '', accountEpoch = 0;
const status = (text, state='idle') => { if (accountBtn) { accountBtn.textContent = text; accountBtn.dataset.state=state; accountBtn.title=text; }};
const uidKey = (part) => `psychdesk-${part}-${user?.uid || 'guest'}`;
const valid = (d) => Boolean(d && [1,2].includes(d.version) && ['subjects','tasks','cards','sessions'].every(k=>Array.isArray(d[k])) && (!d.notes || Array.isArray(d.notes)));
const isCustomized = (d) => Boolean(d.tasks?.length || d.cards?.length || d.notes?.length || d.sessions?.length || d.reviews?.length || Number(d.preferences?.dailyGoal||60)!==60 || d.subjects?.length!==5 || d.subjects?.some((s,i)=>s.name!==['Cognitive Psychology','Biological Psychology','Developmental Psychology','Social Psychology','Research Methods'][i]));
const sanitize = (raw) => {if(!valid(raw))throw Error('Cloud data is not a valid PsychDesk backup'); return JSON.parse(JSON.stringify(raw));};
const safeSize = (d) => { const bytes = new TextEncoder().encode(JSON.stringify(d)).length; if(bytes > limitBytes) throw Error(`Study data is ${Math.round(bytes/1024)} KB; this version's cloud sync supports up to ${Math.floor(limitBytes/1024)} KB. Export a JSON backup before continuing.`); };
const refFor = () => doc(db,'users',user.uid,'psychdesk','state');
const notePending = v => { dirty=v; if(user) localStorage.setItem(uidKey('pending'), v?'1':'0'); };
const messageError = e => (e?.message || e?.code || String(e)).slice(0,280);
function updateBadge(){
 if(!configured)return status('Set up Google', 'error');
 if(!user)return status('Sign in', 'idle');
 if(conflict)return status('Sync conflict', 'conflict');
 if(lastError)return status('Sync paused', 'error');
 if(!navigator.onLine)return status('Offline changes', 'saving');
 if(!signedInReady)return status('Connecting…','saving');
 if(dirty||busy)return status('Saving…','saving');
 return status('✓ Synced', 'synced');
}
function notify(message){ core.toast(message); updateBadge(); }
let loginInProgress = false;
// A single Google consent flow can authorize both Firebase sign-in and Drive.
const DRIVE_FILE_SCOPE='https://www.googleapis.com/auth/drive.file';
let accountChanging=false,pendingDriveCredential=null;
function deliverDriveCredential(){
 if(accountChanging||!pendingDriveCredential)return;
 const {uid,token}=pendingDriveCredential;
 if(!user||user.uid!==uid)return;
 if(window.PsychDeskCloud?.acceptGoogleSignInDriveToken?.(token,uid)){
  pendingDriveCredential=null;
 }
}
async function signIn(){
 if(!configured) return openAccount();
 if(loginInProgress) return;
 if(!auth){ alert('Firebase authentication is not ready. Check your connection, then reload PsychDesk in Chrome.'); return; }
 loginInProgress=true;lastError='';updateBadge();window.PsychDeskSetup?.start?.();
 try {
  const provider=new GoogleAuthProvider();
  provider.addScope(DRIVE_FILE_SCOPE);
  const result=await signInWithPopup(auth,provider);
  const credential=GoogleAuthProvider.credentialFromResult(result);
  if(credential?.accessToken && result?.user?.uid){
   pendingDriveCredential={uid:result.user.uid,token:credential.accessToken};
   deliverDriveCredential();
  }
  window.dispatchEvent(new CustomEvent('psychdesk:login-complete',{
   detail:{driveGranted:Boolean(credential?.accessToken)}
  }));
 }
 catch(e){
  const code=e?.code||'unknown-error';
  lastError=code+': '+messageError(e);
  const hints={
   'auth/cancelled-popup-request':'A second sign-in popup request interrupted the first. Close extra login tabs, open PsychDesk directly in Chrome, then tap Continue with Google once.',
   'auth/popup-blocked':'The browser blocked the Google login window. Open PsychDesk directly in Google Chrome, allow popups, and retry.',
   'auth/popup-closed-by-user':'The Google login window closed before completion. Open the website directly in Chrome and retry.',
   'auth/unauthorized-domain':'Add sid964.github.io in Firebase Authentication > Settings > Authorized domains.',
   'auth/operation-not-allowed':'Enable Google under Firebase Authentication > Sign-in method and save it.',
   'auth/invalid-api-key':'Check the public Firebase web configuration.',
   'auth/network-request-failed':'Check your connection, disable aggressive browser blocking, and retry.',
   'auth/internal-error':'Retry in Chrome. If the problem continues, capture this error code.'
  };
  console.error('PsychDesk Google sign-in failed',code,e);
  updateBadge();
  if(window.PsychDeskSetup?.fail) window.PsychDeskSetup.fail('Google sign-in failed: '+lastError, code); else alert('Google sign-in failed.\n\nError: '+lastError+'\n\n'+(hints[code]||'Try Chrome and share the exact error code.')+'\n\nWebsite: https://sid964.github.io/psychdesk/');
 }finally{loginInProgress=false;}
}
async function accountChanged(next){
 accountEpoch++;
 // Clear independent Drive authority and pending file operations, including sign-out in another tab.
 window.PsychDeskCloud?.resetSession?.();
 clearTimeout(syncTimer); if(unsubscribe){unsubscribe();unsubscribe=null;}
 signedInReady=false;busy=false;dirty=false;conflict=false;lastError='';revision=0;changes=0;
 if(!next){ pendingDriveCredential=null;user=null;localStorage.removeItem('psychdesk-last-user-v3');core.useStorageKey('psychdesk-v1');updateBadge();return; }
 // The old offline-only data stays under psychdesk-v1, even after account login.
 const oldGuest = JSON.parse(localStorage.getItem('psychdesk-v1')||'null') || core.getData();
 user=next;localGuest=structuredClone(oldGuest);
 core.closeModal();
 localStorage.setItem('psychdesk-last-user-v3',next.uid);
 core.useStorageKey('psychdesk-user-'+next.uid);
 dirty=localStorage.getItem(uidKey('pending'))==='1';
 revision=Number(localStorage.getItem(uidKey('revision'))||0);
 updateBadge();
 if(!navigator.onLine){lastError='Offline: saved on this device; reconnect to check cloud data.';updateBadge();return;}
 try { await initializeAccount(); }
 catch(e){if(user!==next)return;lastError='Could not load cloud: '+messageError(e); signedInReady=false;updateBadge();console.error(e);}
}
async function initializeAccount(){
 if(!user||!navigator.onLine)return;
 const epoch=accountEpoch;
 const snapshot=await getDocFromServer(refFor());
 if(epoch!==accountEpoch)return;
 const remote=snapshot.exists()?snapshot.data():null;
 if(remote && !valid(remote.data))throw Error('Cloud record is not a compatible PsychDesk data snapshot');
 const remoteRev=Number(remote?.revision)||0;
 if(remote){
  if(dirty && revision !== remoteRev){
   conflict=true;signedInReady=true;updateBadge();notify('Your offline changes differ from the cloud. Open Account to choose a copy.');
  }else if(dirty && revision === remoteRev){
   signedInReady=true;await syncNow();
  }else{
   revision=remoteRev; localStorage.setItem(uidKey('revision'),String(revision));
   core.replaceData(sanitize(remote.data)); notePending(false);signedInReady=true;updateBadge();
  }
 }else{
  // First sign-in on an empty account: offer migration of old offline study data.
  if(!isCustomized(core.getData()) && isCustomized(localGuest)){
   if(confirm('This Google account has no PsychDesk data yet. Import the study notes and progress from this device into your account?\n\nCancel to start with a fresh planner; your old offline data will remain saved.')) core.replaceData(sanitize(localGuest));
  }
  revision=0;signedInReady=true;notePending(true);await syncNow();
 }
 if(epoch!==accountEpoch)return;
 if(core.ensureSubjectDepartments())core.save();
 window.dispatchEvent(new Event('psychdesk:account-ready'));
 // Subscribe after initial load. Newer remote changes only apply when local work is fully saved.
 if(unsubscribe)unsubscribe();
 const sessionUid=user.uid;
 unsubscribe=onSnapshot(refFor(), snap=>{
  if(epoch!==accountEpoch||!user||user.uid!==sessionUid||!signedInReady||!snap.exists()||snap.metadata.hasPendingWrites)return;
  const record=snap.data(), nextRev=Number(record.revision)||0;
  if(nextRev<=revision)return;
  if(busy)return; // This may be the acknowledgement of our own transaction.
  if(dirty||document.querySelector('#modalRoot .modal')){
   conflict=true;updateBadge();return;
  }
  if(!valid(record.data)){conflict=true;lastError='Invalid remote data';updateBadge();return;}
  revision=nextRev;localStorage.setItem(uidKey('revision'),String(revision));
  core.replaceData(sanitize(record.data));updateBadge();
 }, e=>{if(epoch!==accountEpoch)return;lastError='Realtime sync stopped: '+messageError(e);updateBadge();});
}
async function syncNow(force=false){
 if(!user||!signedInReady||busy||(!dirty&&!force)||conflict&&!force)return;
 if(!navigator.onLine){lastError='Offline';updateBadge();return;}
 const startUid=user.uid, epoch=accountEpoch, ref=refFor(), oldRev=revision, seq=changes, newData=sanitize(core.getData());
 try { safeSize(newData); } catch(e){lastError=messageError(e);updateBadge();return;}
 busy=true;lastError='';updateBadge();
 try {
  const newRev=await runTransaction(db,async tx=>{
   const snap=await tx.get(ref),currentRev=snap.exists()?Number(snap.data().revision)||0:0;
   if(!force && currentRev!==oldRev) throw Error('CHANGED_ELSEWHERE');
   const nr=currentRev+1;
   tx.set(ref,{revision:nr,data:newData,updatedAt:serverTimestamp()});
   return nr;
  });
  if(epoch!==accountEpoch||!user||user.uid!==startUid)return;
  revision=newRev;localStorage.setItem(uidKey('revision'),String(revision));
  if(seq===changes){notePending(false)}else{notePending(true)}
  conflict=false;lastError='';
 }catch(e){
  if(epoch!==accountEpoch)return;
  if(messageError(e).includes('CHANGED_ELSEWHERE')){
   conflict=true;lastError='';core.toast('Cloud changed on another device. Open Account to resolve.');
  }else lastError=messageError(e);
 }finally{if(epoch===accountEpoch){busy=false;updateBadge();if(dirty&&!conflict&&!lastError)scheduleSync();}}
}
function scheduleSync(){if(!user||!signedInReady||conflict)return;clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncNow(),1300);updateBadge();}
async function reloadCloud(){
 if(!user||!navigator.onLine)return alert('Sign in and connect to the internet first.');
 if(dirty && !confirm('This device has UNSYNCED changes. Loading the cloud will replace them. Export a JSON backup first if you want to preserve them. Continue?'))return;
 const epoch=accountEpoch;
 try{
  const snap=await getDocFromServer(refFor());if(epoch!==accountEpoch)return;if(!snap.exists()||!valid(snap.data().data))throw Error('No compatible data saved to cloud yet.');
  core.replaceData(sanitize(snap.data().data));revision=Number(snap.data().revision)||0;localStorage.setItem(uidKey('revision'),String(revision));
  notePending(false);conflict=false;lastError='';signedInReady=true;core.closeModal();notify('Latest cloud progress loaded');
 }catch(e){if(epoch===accountEpoch)alert('Could not reload: '+messageError(e));}
}
async function overwriteCloud(){
 if(!user||!navigator.onLine)return alert('Sign in and connect to the internet first.');
 if(!confirm('Replace the Google cloud copy with ALL notes, flashcards, subjects and progress currently shown on this device? Work from other devices may be lost. Export a backup first.'))return;
 conflict=false;lastError='';notePending(true);signedInReady=true;
 await syncNow(true);if(!dirty){core.closeModal();notify('Device data uploaded to Google account')}else{alert('Cloud upload failed: '+(lastError||'Unknown error'));openAccount()}
}
function exportAccountBackup(){
 const blob=new Blob([JSON.stringify({...core.getData(),exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='psychdesk-cloud-safety-backup.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
async function leaveAccount(){
 if(!user)return;
 if(dirty && !confirm('There are unsynced changes on this device. Sign out anyway? Local account data will stay in this browser but may not appear elsewhere.'))return;
 core.closeModal();await signOut(auth);
}
function openAccount(){
 const h=core.esc;
 const body=!configured?`<div class="account-callout">Firebase is not configured yet. Open <b>firebase-config.js</b>, insert your project's public web app config, enable Google Authentication and create Firestore. Read <b>README.md</b> in the package for setup and deployment.</div><p class="account-meta">Host PsychDesk on Firebase Hosting for reliable Google sign-in. Never put private API keys or service account secrets in the public config.</p>`
 : !user?`<p class="note">Use one Google account for your study notes, tasks, flashcards and progress on all your devices. The first sign-in imports your offline work if your cloud account is empty.</p><button class="primary" style="width:100%" data-firebase="signin">Continue with Google</button><p class="account-meta">Google Drive backup requires a separate Drive permission. Signing in here creates the study-cloud connection.</p>`
 :`<p><strong>${h(user.displayName||'Google account')}</strong></p><p class="account-meta">${h(user.email||'')}<br>Cloud status: <b>${conflict?'Conflict — newer cloud data detected':lastError?lastError:dirty?'Awaiting sync':signedInReady?'Up to date':'Connecting'}</b><br>Cloud revision: ${revision}<br>Storage: Firestore tied to this Google account</p>
 ${conflict?'<div class="account-callout">Your current device and Google cloud contain different work. Download a safety backup, then choose which version to keep. No silent overwrite will occur.</div>':''}
 <div class="button-row"><button class="secondary" data-firebase="backup">Download safety backup</button><button class="secondary" data-firebase="reload">Load cloud progress</button></div>
 <div class="button-row"><button class="secondary" data-firebase="sync">Sync now</button><button class="secondary" data-firebase="overwrite">Replace cloud with this device</button></div>
 <button class="secondary" style="margin-top:9px;width:100%" data-firebase="signout">Sign out of PsychDesk</button>
 <p class="account-meta">Signing out clears this tab's Drive connection. Public setup and local account data stay saved; reconnect Drive when needed. Automatic sync runs after saved changes. On network loss, device data stays locally, but only synced changes are available on another device.</p>`;
 core.openModal('Google account & study sync',`<div class="settings-section">${body}</div>`);
}
window.PsychDeskFirebase={
 openAccount,getUserId:()=>user?.uid||null,
 getConnectionStatus:()=>({
  signedIn:!!user, email:user?.email||'', uid:user?.uid||'',
  synced:!!user&&signedInReady&&!dirty&&!busy&&!conflict&&!lastError&&navigator.onLine,
  loading:!!user&&(!signedInReady||busy||dirty)&&!lastError&&!conflict&&navigator.onLine,
  conflict, error:lastError, online:navigator.onLine, dirty
 })
};
accountBtn?.addEventListener('click',openAccount);
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-firebase]');if(!b)return;e.preventDefault();
 const a=b.dataset.firebase;
 if(a==='signin')signIn();
 else if(a==='backup')exportAccountBackup();
 else if(a==='reload')reloadCloud();
 else if(a==='overwrite')overwriteCloud();
 else if(a==='sync') {if(conflict)alert('Resolve the conflict by loading cloud or explicitly replacing cloud.');else {notePending(true);syncNow();}}
 else if(a==='signout')leaveAccount();
});
window.addEventListener('psychdesk:changed',()=>{if(!user)return;changes++;notePending(true);if(signedInReady)scheduleSync();else updateBadge();});
window.addEventListener('online',async()=>{
 lastError='';if(user&&!signedInReady)await initializeAccount();else if(user&&dirty&&!conflict)scheduleSync();updateBadge();
});
window.addEventListener('offline',updateBadge);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&user&&dirty&&!conflict)scheduleSync();});
if(!configured){updateBadge();}
else{
 try {
  const firebaseApp=initializeApp(config);
  auth=getAuth(firebaseApp);db=getFirestore(firebaseApp);
  onAuthStateChanged(auth, next=>{
   accountChanging=true;
   return Promise.resolve(accountChanged(next)).catch(e=>{
    lastError='Account initialization: '+messageError(e);updateBadge();
   }).finally(()=>{
    accountChanging=false;
    if(!next) pendingDriveCredential=null;
    else deliverDriveCredential();
   });
  },e=>{lastError=messageError(e);updateBadge()});
  updateBadge();
 } catch(e){lastError='Firebase initialization: '+messageError(e);updateBadge();}
}
