const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const o=require('../lib/oauth');
const key=crypto.randomBytes(32).toString('base64');
test('AES-GCM grants decrypt only with the correct server secret',()=>{
 const token='refresh_secret_long_lived_'+crypto.randomBytes(20).toString('hex');
 const encrypted=o.encrypt(token,key);
 assert.notEqual(encrypted,token);
 assert.equal(o.decrypt(encrypted,key),token);
 const wrong=crypto.randomBytes(32).toString('base64');
 assert.throws(()=>o.decrypt(encrypted,wrong));
 const chunks=encrypted.split('.');chunks[2]=chunks[2].slice(0,-3)+'ABC';
 assert.throws(()=>o.decrypt(chunks.join('.'),key));
});
test('bad encryption keys and missing grants fail closed',()=>{
 assert.throws(()=>o.encrypt('token','not-a-key'),/32-byte/);
 assert.throws(()=>o.decrypt('invalid',key),/Invalid/);
 assert.throws(()=>o.encrypt('',key),/Missing/);
});
test('only explicit PsychDesk origins can exchange authorization codes',()=>{
 assert.equal(o.originAllowed('https://sid964.github.io'),true);
 assert.equal(o.originAllowed('https://psystudy-e4854.web.app'),true);
 assert.equal(o.originAllowed('https://evil.example'),false);
 assert.equal(o.originAllowed('https://sid964.github.io.evil.example'),false);
});
test('OAuth requires verified Google-authenticated Firebase identity and Drive scope',()=>{
 assert.equal(o.verifyIdentity({uid:'x',email:'x@example.test',email_verified:true,firebase:{sign_in_provider:'google.com'}}),true);
 assert.equal(o.verifyIdentity({uid:'x',email:'x@example.test',email_verified:false,firebase:{sign_in_provider:'google.com'}}),false);
 assert.equal(o.verifyIdentity({uid:'x',email:'x@example.test',email_verified:true,firebase:{sign_in_provider:'password'}}),false);
 assert.equal(o.scopeAllowed(o.SCOPE),true);
 assert.equal(o.scopeAllowed('https://www.googleapis.com/auth/drive.readonly'),false);
});
