/* Secure server-side Google Drive OAuth. Requires Firebase Functions deployment + secrets.
   No refresh tokens are sent to the browser or written to GitHub/Firestore study snapshots. */
'use strict';
const {onRequest}=require('firebase-functions/v2/https');
const admin=require('firebase-admin');
const {CLIENT_ID,SCOPE,ORIGINS,encrypt,decrypt,originAllowed,normalizeEmail,verifyIdentity,scopeAllowed}=require('./lib/oauth');
admin.initializeApp();
const db=admin.firestore();
const URL_TOKEN='https://oauth2.googleapis.com/token';
const ALLOWED=[...ORIGINS];
function send(res,status,data){
 res.set('Cache-Control','no-store, max-age=0');
 res.set('Pragma','no-cache');
 res.set('X-Content-Type-Options','nosniff');
 return res.status(status).json(data);
}
async function postToken(body){
 const res=await fetch(URL_TOKEN,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body)});
 const value=await res.json().catch(()=>({}));
 if(!res.ok){const err=new Error('Google authorization is unavailable.');err.code=value.error||'google_unavailable';throw err;}
 return value;
}
async function getDriveOwner(token){
 const r=await fetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)',{headers:{Authorization:'Bearer '+token}});
 if(!r.ok)throw Error('Could not verify which Google account owns this Drive grant.');
 const j=await r.json();
 return normalizeEmail(j?.user?.emailAddress);
}
exports.psychdeskDriveAuth=onRequest({
 region:'asia-south1',
 cors:ALLOWED,
 secrets:['GOOGLE_DRIVE_CLIENT_SECRET','DRIVE_TOKEN_KEY'],
 maxInstances:5,
 timeoutSeconds:45,
 memory:'256MiB'
},async(req,res)=>{
 if(req.method!=='POST')return send(res,405,{error:'METHOD_NOT_ALLOWED'});
 const origin=String(req.headers.origin||'');
 if(!originAllowed(origin)||req.headers['x-requested-with']!=='XmlHttpRequest')return send(res,403,{error:'FORBIDDEN'});
 const auth=String(req.headers.authorization||'');
 if(!auth.startsWith('Bearer ')||auth.length>10000)return send(res,401,{error:'NOT_AUTHENTICATED'});
 let decoded;
 try{decoded=await admin.auth().verifyIdToken(auth.slice(7),true);}catch{return send(res,401,{error:'NOT_AUTHENTICATED'});}
 if(!verifyIdentity(decoded))return send(res,403,{error:'GOOGLE_ACCOUNT_REQUIRED'});
 const secret=process.env.GOOGLE_DRIVE_CLIENT_SECRET,key=process.env.DRIVE_TOKEN_KEY;
 if(!secret||!key)return send(res,503,{error:'BACKEND_NOT_CONFIGURED'});
 const ref=db.collection('psychdeskDriveGrants').doc(decoded.uid);
 const action=String(req.body?.action||'');
 try{
  if(action==='disconnect'){
   const snap=await ref.get();
   if(snap.exists){
    const refresh=decrypt(snap.data().token,key);
    await ref.delete();
    // Best effort: local delete blocks reuse even if Google revocation is unreachable.
    await fetch('https://oauth2.googleapis.com/revoke',{method:'POST',
     headers:{'Content-Type':'application/x-www-form-urlencoded'},
     body:new URLSearchParams({token:refresh})}).catch(()=>{});
   }
   return send(res,200,{connected:false});
  }
  if(action==='exchange'){
   const code=String(req.body?.code||'');
   if(code.length<8||code.length>4096)return send(res,400,{error:'INVALID_CODE'});
   // GIS popup code flow uses the exact calling page origin as redirect_uri.
   const grant=await postToken({code,client_id:CLIENT_ID,client_secret:secret,
    redirect_uri:origin,grant_type:'authorization_code'});
   if(!grant.access_token||!scopeAllowed(grant.scope))return send(res,403,{error:'DRIVE_SCOPE_NOT_GRANTED'});
   const googleEmail=await getDriveOwner(grant.access_token);
   if(!googleEmail||googleEmail!==normalizeEmail(decoded.email))return send(res,403,{error:'WRONG_GOOGLE_ACCOUNT'});
   const old=await ref.get();
   const refresh=grant.refresh_token||(old.exists?decrypt(old.data().token,key):'');
   if(!refresh)return send(res,409,{error:'REFRESH_TOKEN_NOT_ISSUED',
    message:'Remove this app from Google Account third-party connections, then reconnect to grant offline access.'});
   await ref.set({token:encrypt(refresh,key),email:googleEmail,scope:SCOPE,updatedAt:admin.firestore.FieldValue.serverTimestamp()});
   return send(res,200,{connected:true,accessToken:grant.access_token,expiresIn:Number(grant.expires_in)||3000});
  }
  if(action==='token'){
   const snapshot=await ref.get();
   if(!snapshot.exists)return send(res,404,{error:'NOT_CONNECTED'});
   const grant=snapshot.data();
   if(normalizeEmail(grant.email)!==normalizeEmail(decoded.email))return send(res,403,{error:'WRONG_GOOGLE_ACCOUNT'});
   let refreshed;
   try{
    refreshed=await postToken({refresh_token:decrypt(grant.token,key),client_id:CLIENT_ID,
     client_secret:secret,grant_type:'refresh_token'});
   }catch(error){
    if(error.code==='invalid_grant'){await ref.delete();return send(res,401,{error:'RECONNECT_REQUIRED'});}
    throw error;
   }
   if(!refreshed.access_token)return send(res,503,{error:'REFRESH_UNAVAILABLE'});
   const email=await getDriveOwner(refreshed.access_token);
   if(!email||email!==normalizeEmail(decoded.email))return send(res,403,{error:'WRONG_GOOGLE_ACCOUNT'});
   if(refreshed.refresh_token)await ref.update({token:encrypt(refreshed.refresh_token,key),
    updatedAt:admin.firestore.FieldValue.serverTimestamp()});
   return send(res,200,{connected:true,accessToken:refreshed.access_token,expiresIn:Number(refreshed.expires_in)||3000});
  }
  return send(res,400,{error:'UNKNOWN_ACTION'});
 }catch(error){
  // Never log OAuth codes, tokens, request bodies or secret values.
  console.error('PsychDesk Drive authentication failed:',String(error.code||error.message||'internal-error').slice(0,120));
  return send(res,503,{error:'SERVICE_UNAVAILABLE'});
 }
});
