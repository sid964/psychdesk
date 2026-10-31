import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const CLIENT='123456-test.apps.googleusercontent.com';
const backup=(preferences={})=>({version:2,subjects:[],tasks:[],cards:[],sessions:[],notes:[],reviews:[],preferences:{dailyGoal:60,...preferences}});
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}}
function stripImports(code){let skipping=false;return code.split(String.fromCharCode(10)).filter(line=>{if(line.startsWith('import '))skipping=true;if(!skipping)return true;if(line.includes(';'))skipping=false;return false}).join(String.fromCharCode(10))}
function environment(storage=new Map(),writeError=false) {
 const events=new EventTarget(),nodes=new Map(),toasts=[];
 const node=()=>({innerHTML:'',textContent:'',dataset:{},style:{},classList:{add(){},remove(){},toggle(){}},listeners:{},addEventListener(type,fn){this.listeners[type]=fn},setAttribute(){},querySelector(){return null},querySelectorAll(){return []},focus(){},append(){},remove(){},click(){}});
 const document={addEventListener(){},querySelector(selector){if(selector==='#modalRoot .modal'||selector==='#driveStatus')return null;if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector)},querySelectorAll(){return []},body:node(),createElement:node};
 const window={addEventListener:events.addEventListener.bind(events),dispatchEvent:events.dispatchEvent.bind(events)};
 const context=vm.createContext({window,document,Event,AbortController,URL,URLSearchParams,Blob,TextEncoder,structuredClone,console,location:{protocol:'https:',hostname:'sid964.github.io',origin:'https://sid964.github.io'},navigator:{onLine:true},localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>{if(writeError)throw Error('Storage unavailable');storage.set(key,String(value))},removeItem:key=>storage.delete(key)},setTimeout:()=>1,clearTimeout(){},setInterval(){},requestAnimationFrame:fn=>fn(),confirm:()=>true,alert:message=>toasts.push(message),FormData:class{constructor(form){this.form=form}get(){return this.form.value}},fetch:async()=>({ok:true,status:200,text:async()=>'{}'})});
 vm.runInContext(source('app.js'),context);
 window.PsychDeskCore.toast=message=>toasts.push(message);
 let uid=null,oauth=null;window.PsychDeskFirebase={getUserId:()=>uid};
 context.google=window.google={accounts:{oauth2:{initTokenClient:options=>{oauth=options;return {requestAccessToken(){}}},revoke(){}}}};
 const cloudSource=source('cloud.js').replace('window.PsychDeskCloud=', 'window.__cloud={connectDrive,api,settingsView,openSettings,pullDrive};window.PsychDeskCloud=');
 vm.runInContext(cloudSource,context);
 const ready=()=>window.dispatchEvent(new Event('psychdesk:account-ready'));
 const saveClient=value=>{window.__cloud.openSettings();const form=document.querySelector('#googleSettingsForm');form.value=value;form.listeners.submit({preventDefault(){}})};
 return {context,window,storage,toasts,nodes,core:window.PsychDeskCore,cloud:window.__cloud,setUser:value=>{uid=value},ready,saveClient,get oauth(){return oauth}};
}
async function authorize(env){const pending=env.cloud.connectDrive();env.oauth.callback({access_token:'memory-only-token',expires_in:3600});await pending}
function firebase(env,overrides={}){
 let authChanged;const userAuth={currentUser:null};
 Object.assign(env.context,{initializeApp:()=>({}),getAuth:()=>userAuth,getFirestore:()=>({}),GoogleAuthProvider:class{},onAuthStateChanged:(_,fn)=>{authChanged=fn},signInWithPopup:async()=>{},signOut:async()=>{userAuth.currentUser=null;await authChanged(null)},doc:(_,...parts)=>parts.join('/'),getDocFromServer:async()=>({exists:()=>true,data:()=>({revision:1,data:backup()})}),runTransaction:async(_,fn)=>fn({get:async()=>({exists:()=>true,data:()=>({revision:1})}),set(){}}),onSnapshot:()=>()=>{},serverTimestamp:()=>0,...overrides});
 env.window.PSYCHDESK_FIREBASE_CONFIG={apiKey:'public-test-config',projectId:'test',authDomain:'test.firebaseapp.com',appId:'test'};
 const code=stripImports(source('firebase-sync.js'));
 vm.runInContext(code+String.fromCharCode(10)+'window.__firebase={accountChanged,initializeAccount,leaveAccount,syncNow,signIn,getState:()=>({user,revision,busy,dirty})};',env.context);
 return {auth:userAuth,change:async user=>{userAuth.currentUser=user;await authChanged(user)},api:env.window.__firebase};
}
test('legacy secret fields are purged; public setup survives reload',()=>{
 const storage=new Map([['psychdesk-cloud-v2',JSON.stringify({clientId:CLIENT,model:'gemini-3.8-flash',geminiKey:'old-secret',apiKey:'old-api',accessToken:'old-token',clientSecret:'old-client-secret'})]]);
 const first=environment(storage);assert.equal(JSON.parse(storage.get('psychdesk-cloud-v2')).clientId,CLIENT);
 assert.doesNotMatch(storage.get('psychdesk-cloud-v2'),/old-secret|old-api|old-token|old-client-secret/);
 const second=environment(storage);assert.match(second.cloud.settingsView(),new RegExp(CLIENT.replaceAll('.','\.')));
 assert.ok(second.cloud.settingsView().includes('add https://sid964.github.io under Authorized JavaScript origins'));
});
test('public client ID follows synced preferences onto a second device; tokens do not',async()=>{
 const first=environment();first.setUser('alice');first.saveClient(CLIENT);
 assert.equal(first.core.getData().preferences.driveClientId,CLIENT);
 const second=environment();second.setUser('alice');second.core.replaceData(JSON.parse(JSON.stringify(first.core.getData())));second.ready();
 assert.equal(JSON.parse(second.storage.get('psychdesk-cloud-v2')).clientId,CLIENT);await authorize(second);assert.equal(second.oauth.client_id,CLIENT);
 assert.doesNotMatch(JSON.stringify([...second.storage]),/memory-only-token/);
 const reopened=environment(second.storage);await assert.rejects(reopened.cloud.api('https://example.test'),/Reconnect/);
});
test('existing browser client ID migrates only after account sync',()=>{
 const env=environment(new Map([['psychdesk-cloud-v2',JSON.stringify({clientId:CLIENT})]]));env.setUser('alice');env.ready();assert.equal(env.core.getData().preferences.driveClientId,CLIENT);
});
test('secret-looking input is rejected without saving; backup paths retain only public preferences',()=>{
 const env=environment();env.saveClient('AIza-secret-value');assert.doesNotMatch(JSON.stringify([...env.storage]),/AIza-secret/);
 const data=backup({driveClientId:CLIENT,geminiKey:'never-sync',clientSecret:'never-sync'});env.core.replaceData(data);assert.equal(env.core.getData().preferences.driveClientId,CLIENT);assert.doesNotMatch(JSON.stringify(env.core.getData()),/never-sync/);
 env.window.receiveBackup(JSON.stringify(data));assert.equal(env.core.getData().preferences.driveClientId,CLIENT);assert.doesNotMatch(JSON.stringify(env.core.getData()),/never-sync/);
});
test('logout clears Drive memory and keeps the public client ID',async()=>{
 const env=environment();env.saveClient(CLIENT);await authorize(env);await env.cloud.api('https://example.test');
 env.window.PsychDeskCloud.resetSession();await assert.rejects(env.cloud.api('https://example.test'),/Reconnect/);assert.equal(JSON.parse(env.storage.get('psychdesk-cloud-v2')).clientId,CLIENT);
});
test('late OAuth callback cannot reconnect a signed-out session',async()=>{
 const env=environment();env.saveClient(CLIENT);const connect=env.cloud.connectDrive();const callback=env.oauth.callback;
 env.window.PsychDeskCloud.resetSession();await assert.rejects(connect,/Reconnect/);callback({access_token:'late-token',expires_in:3600});await assert.rejects(env.cloud.api('https://example.test'),/Reconnect/);assert.doesNotMatch(JSON.stringify([...env.storage]),/late-token/);
});
test('client changes clear the previous Drive authority',async()=>{
 const env=environment();env.saveClient(CLIENT);await authorize(env);env.saveClient('654321-other.apps.googleusercontent.com');await assert.rejects(env.cloud.api('https://example.test'),/Reconnect/);
});
test('logout aborts Drive reads and rejects late responses',async()=>{
 const env=environment();env.saveClient(CLIENT);await authorize(env);const body=deferred();let signal;env.context.fetch=async(_,options)=>{signal=options.signal;return {ok:true,status:200,text:()=>body.promise}};
 const response=env.cloud.api('https://example.test');await Promise.resolve();env.window.PsychDeskCloud.resetSession();assert.equal(signal.aborted,true);body.resolve('{}');await assert.rejects(response,/session changed|stopped or timed out/);
});
test('expired Drive permission clears memory and explains reconnecting',async()=>{
 const env=environment();env.saveClient(CLIENT);await authorize(env);env.context.fetch=async()=>({ok:false,status:401,text:async()=>'{}'});await assert.rejects(env.cloud.api('https://example.test'),/expired/);await assert.rejects(env.cloud.api('https://example.test'),/Reconnect/);
});
test('origin mismatch explains the exact origin to register',async()=>{
 const env=environment();env.saveClient(CLIENT);const connect=env.cloud.connectDrive();env.oauth.callback({error:'origin_mismatch'});await assert.rejects(connect,error=>error.message.includes('https://sid964.github.io')&&error.message.includes('Authorized JavaScript origins'));
});
test('Firebase sign-out clears separate Drive authorization',async()=>{
 const env=environment();env.saveClient(CLIENT);const fb=firebase(env);await fb.change({uid:'alice'});await authorize(env);await fb.api.leaveAccount();assert.equal(env.window.PsychDeskFirebase.getUserId(),null);await assert.rejects(env.cloud.api('https://example.test'),/Reconnect/);assert.equal(JSON.parse(env.storage.get('psychdesk-cloud-v2')).clientId,CLIENT);
});
test('an old Firestore load cannot replace guest data after logout',async()=>{
 const env=environment(),snapshot=deferred();const fb=firebase(env,{getDocFromServer:()=>snapshot.promise});const loading=fb.change({uid:'alice'});await fb.change(null);snapshot.resolve({exists:()=>true,data:()=>({revision:9,data:{...backup(),notes:[{id:'private',title:'previous account'}]}})});await loading;assert.equal(env.core.getData().notes.length,0);assert.equal(fb.api.getState().user,null);
});
test('a remote change of public client ID invalidates old Drive access',async()=>{
 const env=environment();env.setUser('alice');env.saveClient(CLIENT);await authorize(env);env.core.replaceData(backup({driveClientId:'654321-other.apps.googleusercontent.com'}));await assert.rejects(env.cloud.api('https://example.test'),/Reconnect/);assert.equal(JSON.parse(env.storage.get('psychdesk-cloud-v2')).clientId,'654321-other.apps.googleusercontent.com');
});
test('Drive restore retains the public ID and drops unsupported preference fields',async()=>{
 const env=environment();env.saveClient(CLIENT);await authorize(env);const imported=backup({driveClientId:CLIENT,geminiKey:'never-restore'});const replies=[{files:[{id:'folder',mimeType:'application/vnd.google-apps.folder'}]},{files:[{id:'file',name:'psychdesk-backup.json',modifiedTime:'2026-10-31T00:00:00Z'}]},imported];env.context.fetch=async()=>({ok:true,status:200,text:async()=>JSON.stringify(replies.shift())});assert.equal(await env.cloud.pullDrive(),true);assert.equal(env.core.getData().preferences.driveClientId,CLIENT);assert.doesNotMatch(JSON.stringify(env.core.getData()),/never-restore/);
});
test('an in-flight Firestore transaction remains bound to its original account',async()=>{
 const env=environment(),transaction=deferred();let callback;const fb=firebase(env,{getDocFromServer:async()=>({exists:()=>true,data:()=>({revision:1,data:backup({driveClientId:CLIENT})})}),runTransaction:async(_,fn)=>{callback=fn;return transaction.promise}});await fb.change({uid:'alice'});const saving=fb.api.syncNow(true);await fb.change({uid:'bob'});const refs=[];const next=await callback({get:async ref=>{refs.push(ref);return {exists:()=>true,data:()=>({revision:1})}},set:ref=>refs.push(ref)});transaction.resolve(next);await saving;assert.deepEqual(refs,['users/alice/psychdesk/state','users/alice/psychdesk/state']);assert.equal(fb.api.getState().user.uid,'bob');assert.equal(fb.api.getState().revision,1);
});
test('storage write failure purges legacy secrets and reports that saving failed',()=>{
 const storage=new Map([['psychdesk-cloud-v2',JSON.stringify({clientId:CLIENT,geminiKey:'old-secret'})]]);const env=environment(storage,true);assert.doesNotMatch(JSON.stringify([...storage]),/old-secret/);env.saveClient(CLIENT);assert.ok(env.toasts.some(message=>message.includes('storage unavailable')));
});
test('offline loading finds versioned assets and cache cleanup preserves other apps',async()=>{
 const handlers={},removed=[];let response,options;const self={location:{origin:'https://sid964.github.io'},clients:{claim(){}},skipWaiting(){},addEventListener:(type,fn)=>handlers[type]=fn};const caches={keys:async()=>['other-app-cache','psychdesk-old','psychdesk-library-v1'],delete:async key=>removed.push(key),match:async(_,opts)=>{options=opts;return 'cached-script'}};vm.runInNewContext(source('sw.js'),{self,caches,URL,fetch:async()=>{throw Error('offline')}});handlers.fetch({request:{method:'GET',url:'https://sid964.github.io/psychdesk/cloud.js?v=settings-1'},respondWith:value=>response=value});assert.equal(await response,'cached-script');assert.equal(options.ignoreSearch,true);handlers.activate({waitUntil:value=>response=value});await response;assert.deepEqual(removed,['psychdesk-old','psychdesk-library-v1']);
});


test('subject departments are seeded once without losing existing work',()=>{
 const env=environment();env.core.replaceData({...backup(),subjects:[{id:'my-course',name:'My course'}],notes:[{id:'n',title:'Keep',body:'Notes',subjectId:'my-course'}]});
 assert.equal(env.core.ensureSubjectDepartments(),true);assert.equal(env.core.getData().subjects.length,10);assert.equal(env.core.getData().notes[0].title,'Keep');assert.equal(env.core.ensureSubjectDepartments(),false);
});
test('material catalogue survives backup restore without storing file bytes',()=>{
 const env=environment(),material={id:'m',subjectId:'bio',title:'Biopsychology',kind:'pdf',url:'https://drive.google.com/file/d/test/view',size:202000000};
 env.core.replaceData({...backup(),materials:[material]});assert.equal(env.core.getData().materials[0].size,202000000);env.window.receiveBackup(JSON.stringify(env.core.getData()));assert.equal(env.core.getData().materials[0].title,'Biopsychology');
});
function uploadResponse(status,value={},headers={}){return {status,ok:status>=200&&status<300,headers:{get:key=>headers[key]||null},json:async()=>value,text:async()=>JSON.stringify(value)}}
function book(size=9*1024*1024){return Object.assign(new Blob(['%PDF-1.7',new Uint8Array(size-8)]),{name:'book.pdf',lastModified:1})}
function uploadServer(env,chunkHandler){
 let folders=0;env.context.fetch=async(url,options)=>{
  if(options.method==='PUT')return chunkHandler(options);
  if(options.method==='POST')return uploadResponse(200,{}, {Location:'https://www.googleapis.com/upload/drive/v3/files?upload_id=test'});
  return uploadResponse(200,{files:[{id:'folder'+(++folders),name:'folder',mimeType:'application/vnd.google-apps.folder'}]});
 };
}
test('large PDF uploads use bounded chunks and publish the confirmed Drive file',async()=>{
 const env=environment();env.saveClient(CLIENT);await authorize(env);const ranges=[],sizes=[];
 uploadServer(env,options=>{ranges.push(options.headers['Content-Range']);sizes.push(options.body.size);return ranges.length===1?uploadResponse(308,{}, {Range:'bytes=0-8388607'}):uploadResponse(200,{id:'saved-book'});});
 const result=await env.window.PsychDeskCloud.uploadMaterial(book(),{id:'bio',name:'Biology'});assert.equal(result.driveId,'saved-book');assert.deepEqual(sizes,[8388608,1048576]);assert.equal(ranges[1],'bytes 8388608-9437183/9437184');assert.doesNotMatch(JSON.stringify([...env.storage]),/upload_id|memory-only-token/);
});
test('interrupted upload probes server offset and resumes without creating another file',async()=>{
 const env=environment();env.saveClient(CLIENT);await authorize(env);let step=0;const ranges=[];
 uploadServer(env,options=>{ranges.push(options.headers['Content-Range']);step++;if(step===1)return uploadResponse(308,{}, {Range:'bytes=0-8388607'});if(step===2)throw Error('network interrupted');if(step===3)return uploadResponse(308,{}, {Range:'bytes=0-8388607'});return uploadResponse(200,{id:'resumed-book'});});
 const file=book(),subject={id:'bio',name:'Biology'};await assert.rejects(env.window.PsychDeskCloud.uploadMaterial(file,subject),/interrupted/);const result=await env.window.PsychDeskCloud.uploadMaterial(file,subject);assert.equal(result.driveId,'resumed-book');assert.equal(ranges[2],'bytes */9437184');assert.equal(ranges[3],'bytes 8388608-9437183/9437184');
});
test('unsupported files are rejected and Markdown books are supported',async()=>{
 const env=environment();env.saveClient(CLIENT);await authorize(env);await assert.rejects(env.window.PsychDeskCloud.uploadMaterial(Object.assign(new Blob(['exe']),{name:'tool.exe'}),{id:'bio',name:'Bio'}),/Only PDF and Markdown/);
 uploadServer(env,()=>uploadResponse(200,{id:'markdown-book'}));const saved=await env.window.PsychDeskCloud.uploadMaterial(Object.assign(new Blob(['# My book']),{name:'book.md'}),{id:'bio',name:'Bio'});assert.equal(saved.kind,'markdown');
});
test('subject library shows only the selected subject and rejects script links',()=>{
 const env=environment();vm.runInContext(source('materials.js'),env.context);env.core.replaceData({...backup(),subjects:[{id:'bio',name:'Biology'},{id:'soc',name:'Social'}],materials:[{id:'one',subjectId:'bio',title:'My biology book',kind:'pdf',url:'javascript:alert(1)'},{id:'two',subjectId:'soc',title:'Other subject book',kind:'pdf',url:'https://example.com'}]});env.window.scrollTo=()=>{};env.window.PsychDeskMaterials.open('bio');const html=env.window.PsychDeskMaterials.render();assert.match(html,/My biology book/);assert.doesNotMatch(html,/Other subject book|href="javascript/);
});
test('dark mode remembers the selection and updates accessible toggle state',()=>{
 const values=new Map(),handlers={},button={setAttribute(k,v){this[k]=v},addEventListener(type,fn){handlers.toggle=fn}},root={dataset:{},style:{}};
 const context={window:{matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){}},document:{documentElement:root,querySelector:selector=>selector==='#themeToggle'?button:{},addEventListener:(type,fn)=>handlers[type]=fn},localStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}};
 vm.runInNewContext(source('theme.js'),context);handlers.DOMContentLoaded();assert.equal(root.dataset.theme,'dark');handlers.toggle();assert.equal(root.dataset.theme,'light');assert.equal(button['aria-pressed'],'false');vm.runInNewContext(source('theme.js'),context);assert.equal(root.dataset.theme,'light');
});
test('published entry points do not load or expose the removed AI integration',()=>{
 for(const file of ['index.html','app.js','cloud.js','sw.js'])assert.doesNotMatch(source(file),/firebase-ai|app-check-config|renderAI|Gemini|gemini/);
});

test('Google sign-in authorizes Drive in the same consent flow without persisting its token',async()=>{
 const env=environment();
 const requested=[];
 let state;
 const provider=class {
  addScope(value){requested.push(value)}
  static credentialFromResult(){return {accessToken:'one-time-drive-credential'}}
 };
 const fb=firebase(env,{
  GoogleAuthProvider:provider,
  signInWithPopup:async()=>{
   await fb.change({uid:'alice'});
   return {user:{uid:'alice'}};
  }
 });
 await fb.api.signIn();
 assert.ok(requested.includes('https://www.googleapis.com/auth/drive.file'));
 assert.equal(env.window.PsychDeskCloud.isConnected(),true);
 assert.doesNotMatch(JSON.stringify([...env.storage]),/one-time-drive-credential/);
 await fb.change(null);
 assert.equal(env.window.PsychDeskCloud.isConnected(),false);
});
