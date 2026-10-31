/* PsychDesk setup assistant — honest, read-only checks after interactive Google sign-in. */
(()=>{
 'use strict';
 let active=false, phase='idle', error='', errorCode='', checkingDrive=false, driveVerified=false,
     driveError='', driveEmail='', started=0, generation=0, interval=null, lastUid='';
 const byId=id=>document.getElementById(id);
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const account=()=>window.PsychDeskFirebase?.getConnectionStatus?.()||{signedIn:false,loading:false};
 const drive=()=>window.PsychDeskCloud;
 function ensure(){
  if(byId('setup-overlay'))return;
  const wrap=document.createElement('div');
  wrap.id='setup-overlay';
  wrap.className='setup-overlay';
  wrap.hidden=true;
  wrap.innerHTML='<section class="setup-panel" role="dialog" aria-modal="true" aria-labelledby="setup-title"><div class="setup-heading"><div><span class="setup-eyebrow">PSYCHDESK · CONNECTION STATUS</span><h2 id="setup-title">Setting up your workspace</h2><p id="setup-subtitle" class="setup-subtitle">Checking your Google account and cloud services…</p></div><button class="setup-close" type="button" data-setup="close" aria-label="Close connection status">×</button></div><div id="setup-steps" class="setup-steps" aria-live="polite"></div><p id="setup-details" class="setup-details" aria-live="polite"></p><div id="setup-actions" class="setup-actions"></div></section>';
  document.body.appendChild(wrap);
  wrap.addEventListener('click',e=>{const b=e.target.closest('[data-setup]');if(!b)return;const action=b.dataset.setup;
   if(action==='close'){close();return;}
   if(action==='drive'){reconnect();return;}
   if(action==='signin'){close();window.PsychDeskFirebase?.openAccount?.();return;}
   if(action==='account'){close();window.PsychDeskFirebase?.openAccount?.();return;}
   if(action==='retry'){retry();return;}
  });
 }
 function step(label,detail,status){
  const icon=status==='ok'?'✓':status==='error'?'!':status==='pending'?'◌':'—';
  return '<div class="setup-step '+status+'"><span class="setup-icon">'+icon+'</span><div><strong>'+esc(label)+'</strong><small>'+esc(detail)+'</small></div></div>';
 }
 function repaint(){
  if(!active)return;
  ensure();
  const s=account();
  const signed=s.signedIn===true;
  let first=signed?'ok':'pending';
  let firestore=!signed?'pending':s.conflict||s.error?'error':s.synced?'ok':'pending';
  let driveState=!signed?'pending':driveVerified?'ok':driveError?'error':'pending';
  if(phase==='failed')first='error';
  if(signed&&s.uid!==lastUid){lastUid=s.uid;driveVerified=false;driveError='';checkingDrive=false;generation++;}
  const steps=byId('setup-steps');
  steps.innerHTML=
   step('Google account',phase==='failed'?error:signed?(s.email||'Signed in'):'Waiting for Google sign-in…',first)+
   step('Study progress & notes',firestore==='ok'?'Saved and synchronized with Firestore':firestore==='error'?(s.conflict?'Different versions need your review':s.error||'Sync error'):'Checking your cloud data…',firestore)+
   step('Google Drive',driveState==='ok'?'Drive API confirmed'+(driveEmail?' · '+driveEmail:''):driveState==='error'?driveError:checkingDrive?'Verifying Drive permissions…':'Waiting for Drive permission…',driveState);
  const complete=first==='ok'&&firestore==='ok'&&driveState==='ok';
  const failed=first==='error'||firestore==='error'||driveState==='error';
  byId('setup-title').textContent=complete?'All set — ready to study':failed?'Action needed':'Setting up your workspace';
  byId('setup-subtitle').textContent=complete?'Google sign-in, study sync and Drive are ready.':failed?'Review the issue below and choose a fix.':'We’re checking each connection before marking it ready.';
  byId('setup-details').textContent=complete?'Your files remain in your Google account. Drive backups and uploads are not automatic.':failed?
   (first==='error'?error:firestore==='error'?'Your study data needs attention. You can review sync details without overwriting your notes.':driveError):
   (Date.now()-started>30000?'This is taking longer than expected. You can retry the checks or reconnect Drive.':'Please keep this window open while setup completes.');
  let actions='';
  if(first==='error')actions='<button type="button" data-setup="signin" class="setup-button primary">Try Google sign-in again</button>';
  else if(firestore==='error')actions='<button type="button" data-setup="account" class="setup-button primary">Review account & sync</button><button type="button" data-setup="retry" class="setup-button">Check again</button>';
  else if(driveState==='error'||(signed&&!driveVerified&&!checkingDrive&&Date.now()-started>12000))actions='<button type="button" data-setup="drive" class="setup-button primary">Reconnect Google Drive</button><button type="button" data-setup="retry" class="setup-button">Check again</button>';
  else if(complete)actions='<button type="button" data-setup="close" class="setup-button primary">Start studying</button>';
  else if(Date.now()-started>30000)actions='<button type="button" data-setup="retry" class="setup-button">Retry checks</button>';
  if(first==='error')actions+='<a class="setup-help" target="_blank" rel="noopener noreferrer" href="https://support.google.com/accounts/answer/3466521">Google sign-in help ↗</a>';
  else if(driveState==='error')actions+='<a class="setup-help" target="_blank" rel="noopener noreferrer" href="https://support.google.com/accounts/answer/3466521">Review Google app permissions ↗</a>';
  byId('setup-actions').innerHTML=actions;
  if(signed&&!driveVerified&&!driveError&&!checkingDrive&&drive()?.isConnected?.())verifyDrive();
 }
 function verifyDrive(){
  if(checkingDrive||driveVerified||!active)return;
  const cloud=drive();
  if(!cloud?.isConnected?.()||!cloud?.verifyDriveConnection)return;
  const version=++generation;
  checkingDrive=true;driveError='';repaint();
  let timeout;
  Promise.race([
   cloud.verifyDriveConnection(),
   new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Drive check timed out. Please reconnect Google Drive.')),18000)})
  ]).then(result=>{
   if(!active||version!==generation)return;
   driveVerified=true;driveEmail=result?.email||'';
  }).catch(e=>{
   if(!active||version!==generation)return;
   driveError=String(e?.message||e||'Drive access could not be verified').slice(0,230);
  }).finally(()=>{
   clearTimeout(timeout);
   if(version===generation){checkingDrive=false;repaint();}
  });
 }
 function refresh(){
  if(!active)return;
  if(driveVerified&&!drive()?.isConnected?.()){driveVerified=false;driveError='Drive access expired. Reconnect to continue.';}
  repaint();
 }
 function start(){
  close();
  ensure();active=true;phase='active';started=Date.now();lastUid='';error='';errorCode='';driveError='';driveEmail='';driveVerified=false;generation++;
  const w=byId('setup-overlay');w.hidden=false;document.body.classList.add('setup-open');
  repaint();interval=setInterval(refresh,450);
 }
 function fail(message,code){
  if(!active)start();
  phase='failed';error=String(message||'Sign-in failed').slice(0,300);errorCode=String(code||'');repaint();
 }
 function retry(){
  started=Date.now();driveError='';driveVerified=false;checkingDrive=false;generation++;repaint();
 }
 async function reconnect(){
  const cloud=drive();
  if(!cloud?.connectDrive){driveError='Drive connection is unavailable. Reload PsychDesk and try again.';repaint();return;}
  generation++;driveError='';driveVerified=false;checkingDrive=true;repaint();
  try{await cloud.connectDrive();checkingDrive=false;verifyDrive();}
  catch(e){checkingDrive=false;driveError=String(e?.message||e).slice(0,260);repaint();}
 }
 function close(){
  active=false;checkingDrive=false;generation++;clearInterval(interval);interval=null;
  if(byId('setup-overlay'))byId('setup-overlay').hidden=true;
  document.body.classList.remove('setup-open');
 }
 window.PsychDeskSetup={start,fail,close,refresh};
 window.addEventListener('psychdesk:login-complete',event=>{
  if(!active)return;
  if(!event.driveGranted){
   driveError='Google sign-in succeeded, but Drive access was not granted. Use Reconnect Google Drive to authorize it.';
   checkingDrive=false;generation++;repaint();
  }
 });
 window.addEventListener('psychdesk:drive-connected',()=>{if(active){driveError='';driveVerified=false;checkingDrive=false;generation++;refresh();}});
 window.addEventListener('psychdesk:session-reset',()=>{if(active){driveVerified=false;driveError='';generation++;refresh();}});
 window.addEventListener('online',refresh);
 window.addEventListener('offline',refresh);
})();