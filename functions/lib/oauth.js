/* Only nonsecret, pure OAuth helpers. No browser code should import this. */
const crypto=require('node:crypto');
const CLIENT_ID='659114399201-a9men61h75snq5in5kko8el5maiah797.apps.googleusercontent.com';
const SCOPE='https://www.googleapis.com/auth/drive.file';
const ORIGINS=new Set(['https://sid964.github.io','https://psystudy-e4854.web.app','https://psystudy-e4854.firebaseapp.com']);
function keyFromSecret(value){
 const key=Buffer.from(String(value||''),'base64');
 if(key.length!==32)throw Error('DRIVE_TOKEN_KEY must be a base64-encoded 32-byte key.');
 return key;
}
function encrypt(token,secret){
 if(typeof token!=='string'||!token)throw Error('Missing refresh token.');
 const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',keyFromSecret(secret),iv);
 const encrypted=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);
 return [iv,cipher.getAuthTag(),encrypted].map(v=>v.toString('base64url')).join('.');
}
function decrypt(value,secret){
 const chunks=String(value||'').split('.');
 if(chunks.length!==3)throw Error('Invalid encrypted grant.');
 const [iv,tag,payload]=chunks.map(x=>Buffer.from(x,'base64url'));
 if(iv.length!==12||tag.length!==16)throw Error('Invalid encrypted grant.');
 const decipher=crypto.createDecipheriv('aes-256-gcm',keyFromSecret(secret),iv);
 decipher.setAuthTag(tag);
 return Buffer.concat([decipher.update(payload),decipher.final()]).toString('utf8');
}
function originAllowed(origin){return ORIGINS.has(origin);}
function normalizeEmail(value){return String(value||'').trim().toLocaleLowerCase();}
function verifyIdentity(decoded){
 if(!decoded?.uid||!decoded.email||decoded.email_verified!==true || decoded.firebase?.sign_in_provider!=='google.com')return false;
 return true;
}
function scopeAllowed(scopes){return String(scopes||'').split(/\s+/).includes(SCOPE);}
module.exports={CLIENT_ID,SCOPE,ORIGINS,encrypt,decrypt,originAllowed,normalizeEmail,verifyIdentity,scopeAllowed};
