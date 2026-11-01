/* Optional durable Google Drive authorization backed by Firebase Functions.
   Firebase ID token authenticates the request. OAuth refresh token stays server-side. */
(()=>{'use strict';
const core=window.PsychDeskCore;
if(!core)return;
const exact='https://asia-south1-psystudy-e4854.cloudfunctions.net/psychdeskDriveAuth';
const endpoint=String(window.PSYCHDESK_DRIVE_BACKEND_URL||'');
const enabled=()=>endpoint===exact;
let restoring=null,connecting=false;
async function request(action,code){
 if(!enabled())throw Error('Persistent Drive backend is not configured.');
 const idToken=await window.PsychDeskFirebase?.getIdToken?.();
 if(!idToken)throw Error('Sign in to your PsychDesk Google account first.');
 const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),20000);
 try{
  const response=await fetch(endpoint,{method:'POST',mode:'cors',credentials:'omit',signal:ctrl.signal,
   headers:{'Content-Type':'application/json','X-Requested-With':'XmlHttpRequest',
    Authorization:'Bearer '+idToken},
   body:JSON.stringify(code?{action,code}:{action})});
  const json=await response.json().catch(()=>({}));
  if(!response.ok){
   const err=new Error(json.message||({
    NOT_CONNECTED:'Persistent Google Drive has not been connected yet.',
    RECONNECT_REQUIRED:'Google Drive access was revoked or expired. Please reconnect.',
    REFRESH_TOKEN_NOT_ISSUED:'Google did not issue long-term authorization. Revoke this app in your Google Account permissions and try again.',
    WRONG_GOOGLE_ACCOUNT:'Choose the same Google account used by PsychDesk.',
    BACKEND_NOT_CONFIGURED:'Drive backend secrets are missing.'
   }[json.error]||'Persistent Drive authorization is unavailable.'));
   err.status=response.status;err.code=json.error;throw err;
  }
  return json;
 }finally{clearTimeout(timeout);}
}
async function takeGrant(grant){
 if(!grant?.accessToken||!Number.isFinite(Number(grant.expiresIn)))throw Error('Backend did not return a usable Drive grant.');
 return window.PsychDeskCloud?.acceptPersistentDriveToken?.(grant.accessToken,Number(grant.expiresIn),window.PsychDeskFirebase?.getUserId?.());
}
async function restore(){
 if(!enabled()||!window.PsychDeskFirebase?.getUserId?.()||!navigator.onLine)return false;
 // Revalidating an already active Drive grant would abort ongoing book reads/uploads.
 if(window.PsychDeskCloud?.isConnected?.())return true;
 if(restoring)return restoring;
 restoring=(async()=>{
  try{return Boolean(await takeGrant(await request('token')));}
  catch(error){
   if(![404,401].includes(error.status))console.warn('PsychDesk: persistent Drive unavailable',error.code||'network');
   return false;
  }
 })();
 try{return await restoring}finally{restoring=null;}
}
function connect(){
 if(!enabled())return Promise.reject(Error('Persistent Drive backend is not configured.'));
 if(connecting)return Promise.reject(Error('Another Drive authorization window is already open.'));
 if(!window.PsychDeskFirebase?.getUserId?.())return Promise.reject(Error('Sign in to your PsychDesk Google account first.'));
 if(!window.google?.accounts?.oauth2?.initCodeClient)return Promise.reject(Error('Google consent has not loaded. Check your connection.'));
 connecting=true;
 // Request a code during the user click. Exchanging it occurs only on the backend.
 return new Promise((resolve,reject)=>{
  const finish=(error,value)=>{connecting=false;error?reject(error):resolve(value);};
  try{
   const client=google.accounts.oauth2.initCodeClient({
    client_id:window.PSYCHDESK_DRIVE_CLIENT_ID,
    scope:'https://www.googleapis.com/auth/drive.file',
    ux_mode:'popup',
    login_hint:window.PsychDeskFirebase?.getConnectionStatus?.().email||undefined,
    callback:async response=>{
     if(response.error||!response.code){finish(Error('Google did not grant Drive permission.'));return;}
     try{
      const grant=await request('exchange',response.code);
      if(!await takeGrant(grant))throw Error('The Drive account could not be verified.');
      finish(null,true);
     }catch(e){finish(e);}
    },
    error_callback:e=>finish(Error(e?.type||'Google Drive popup failed.'))
   });
   client.requestCode();
  }catch(e){finish(e);}
 });
}
async function disconnect(){
 if(!enabled())return false;
 await request('disconnect');
 return true;
}
window.PsychDeskDrivePersistence={enabled,restore,connect,disconnect,request};
window.addEventListener('psychdesk:identity-ready',()=>{void restore();});
window.addEventListener('online',()=>{void restore();});
})();