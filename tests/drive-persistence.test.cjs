/* Run: node --test tests/drive-persistence.test.cjs */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const url='https://asia-south1-psystudy-e4854.cloudfunctions.net/psychdeskDriveAuth';
function harness(enabled){
 const messages=[],calls=[];const listener={};
 const uid='signed-in-user';let valid=true;
 const core={getData:()=>({}),esc:String};
 const window={PsychDeskCore:core,PSYCHDESK_DRIVE_BACKEND_URL:enabled?url:'',
  PSYCHDESK_DRIVE_CLIENT_ID:'public-client-id',
  PsychDeskFirebase:{getIdToken:async()=>valid?'FIREBASE_ID_TOKEN':null,getUserId:()=>valid?uid:null,
    getConnectionStatus:()=>({email:'student@example.test'})},
  PsychDeskCloud:{acceptPersistentDriveToken:async(t,exp,u)=>{calls.push([t,exp,u]);return true}},
  addEventListener:(name,handler)=>{listener[name]=handler}};
 const ctx={window,navigator:{onLine:true},console:{warn:()=>{}},fetch:async(uri,opts)=>{
  messages.push([uri,opts]);return {ok:true,status:200,json:async()=>({connected:true,accessToken:'ACCESS_TOKEN_SECRET',expiresIn:3500})};
 },AbortController,setTimeout,clearTimeout};
 vm.runInNewContext(source('drive-persistence.js'),ctx,{timeout:1000});
 return {api:window.PsychDeskDrivePersistence,messages,calls,ctx,window,listener,setSignedIn:v=>{valid=v}};
}
test('backend disabled by default, without outgoing requests or sign-in changes',async()=>{
 const h=harness(false);
 assert.equal(h.api.enabled(),false);
 assert.equal(await h.api.restore(),false);
 assert.equal(h.messages.length,0);
 assert.equal(h.calls.length,0);
});
test('restores only via authorized Firebase ID token, never cookies',async()=>{
 const h=harness(true);
 assert.equal(await h.api.restore(),true);
 assert.equal(h.messages.length,1);
 const [target,req]=h.messages[0];
 assert.equal(target,url);
 assert.equal(req.credentials,'omit');
 assert.equal(req.headers.Authorization,'Bearer FIREBASE_ID_TOKEN');
 assert.equal(req.headers['X-Requested-With'],'XmlHttpRequest');
 assert.equal(JSON.parse(req.body).action,'token');
 assert.equal(h.calls[0][0],'ACCESS_TOKEN_SECRET');
 assert.equal(h.calls[0][2],'signed-in-user');
});
test('signed-out account cannot refresh token through backend',async()=>{
 const h=harness(true);h.setSignedIn(false);
 assert.equal(await h.api.restore(),false);
 assert.equal(h.messages.length,0);
 await assert.rejects(h.api.request('token'),/Sign in/);
});
test('existing application still loads reference scripts and never publishes secrets',()=>{
 const html=source('index.html'),sw=source('sw.js'),config=source('firebase-config.js');
 assert.match(html,/drive-persistence\.js\?v=[A-Za-z0-9_-]+/);
 assert.ok(sw.includes('./drive-persistence.js'));
 assert.ok(config.includes("PSYCHDESK_DRIVE_BACKEND_URL = ''"));
 assert.ok(!html.includes('GOOGLE_DRIVE_CLIENT_SECRET'));
 const cloud=source('cloud.js');
 assert.ok(cloud.includes('acceptPersistentDriveToken'));
 assert.ok(cloud.includes('ensureDriveReady'));
});
