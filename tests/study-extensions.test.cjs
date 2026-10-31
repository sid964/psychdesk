/* node --test tests/study-extensions.test.cjs */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const script=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function storage(){
 const m=new Map();
 return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),has:k=>m.has(k),entries:()=>[...m]};
}
function core(){
 const study={version:2,notes:[],cards:[],research:[],mindMaps:[],preferences:{}};
 return {esc:String,getData:()=>study,subjectOptions:()=>'',getStudy:()=>study,
  save:()=>{},render:()=>{},closeModal:()=>{},openModal:()=>{},id:()=>String(Date.now()),
  toast:()=>{},today:()=> '2026-11-01'};
}
function harness(filename,extras={}){
 const local=storage(),session=storage(),baseCore=core();
 const listeners={};
 const ctx={
  window:{PsychDeskCore:baseCore,addEventListener:(n,f)=>{listeners[n]=f},dispatchEvent:()=>{},...extras.window},
  document:{addEventListener:(n,f)=>{listeners[n]=f},querySelector:()=>null,...extras.document},
  localStorage:local,sessionStorage:session,
  Event,AbortController,URL,Blob,Date,setTimeout,clearTimeout,location:{protocol:'https:',hostname:'sid964.github.io',origin:'https://sid964.github.io'},
  fetch:extras.fetch||(()=>Promise.reject(Error('Unexpected network request'))),
  ...extras.globals
 };
 vm.runInNewContext(script(filename),ctx,{timeout:1000});
 return {ctx,local,session,core:baseCore,listeners};
}
const publicId='659114399201-a9men61h75snq5in5kko8el5maiah797.apps.googleusercontent.com';
function driveHarness(ownerEmail,driveEmail){
 const tokens=[];
 const f=harness('cloud.js',{
  window:{PSYCHDESK_DRIVE_CLIENT_ID:publicId,PsychDeskFirebase:{getUserId:()=> 'user-1',getConnectionStatus:()=>({email:ownerEmail})},dispatchEvent:e=>tokens.push(e.type)},
  fetch:async(url,opts)=>{
   assert.match(url,/\/drive\/v3\/about\?fields=user\(emailAddress\)/);
   assert.match(opts.headers.Authorization,/^Bearer /);
   return {status:200,ok:true,text:async()=>JSON.stringify({user:{emailAddress:driveEmail}})};
  }
 });
 f.session.setItem('psychdesk-drive-tab-v1',JSON.stringify({
  uid:'user-1',email:driveEmail,clientId:publicId,token:'VALID_SHORT_LIVED_DRIVE_TOKEN',
  expiresAt:Date.now()+15*60*1000
 }));
 return {...f,tokens};
}
test('Drive restores verified same-tab permission after a refresh',async()=>{
 const f=driveHarness('student@example.com','student@example.com');
 assert.equal(f.ctx.window.PsychDeskCloud.isConnected(),false);
 assert.equal(await f.ctx.window.PsychDeskCloud.restoreDriveSession(),true);
 assert.equal(f.ctx.window.PsychDeskCloud.isConnected(),true);
 assert.ok(f.tokens.includes('psychdesk:drive-connected'));
 assert.equal(JSON.parse(f.session.getItem('psychdesk-drive-tab-v1')).uid,'user-1');
 assert.ok(!f.local.entries().some(([k,v])=>v.includes('VALID_SHORT_LIVED_DRIVE_TOKEN')));
});
test('Drive does not restore a mismatching Google identity',async()=>{
 const f=driveHarness('student@example.com','someone-else@example.com');
 assert.equal(await f.ctx.window.PsychDeskCloud.restoreDriveSession(),false);
 assert.equal(f.ctx.window.PsychDeskCloud.isConnected(),false);
 assert.equal(f.session.getItem('psychdesk-drive-tab-v1'),null);
});
test('Drive discards expired tab permissions instead of displaying a fake connection',async()=>{
 const f=driveHarness('student@example.com','student@example.com');
 const record=JSON.parse(f.session.getItem('psychdesk-drive-tab-v1'));
 record.expiresAt=Date.now()-1000;
 f.session.setItem('psychdesk-drive-tab-v1',JSON.stringify(record));
 assert.equal(await f.ctx.window.PsychDeskCloud.restoreDriveSession(),false);
 assert.equal(f.ctx.window.PsychDeskCloud.isConnected(),false);
});
test('note version history and crash drafts are account-scoped and non-destructive',()=>{
 const f=harness('note-history.js',{window:{PsychDeskFirebase:{getUserId:()=> 'student-a'}}});
 const api=f.ctx.window.PsychDeskNoteHistory;
 assert.equal(api.recordVersion({id:'n1',title:'Before',body:'Meaning',tags:'',subjectId:''}),true);
 const list=api.versions('n1');
 assert.equal(list.length,1);
 assert.equal(list[0].body,'Meaning');
 const original={id:'n2',title:'Saved',body:'Cloud copy',updatedAt:'2026-10-31T00:00:00.000Z'};
 f.local.setItem('psychdesk-note-history-v1:student-a:draft:n2',JSON.stringify({
  title:'Recovered',body:'Unfinished work',savedAt:'2026-11-01T00:00:00.000Z'
 }));
 const restored=api.restoreDraft(original);
 assert.equal(restored.body,'Unfinished work');
 assert.equal(original.body,'Cloud copy');
 f.ctx.window.PsychDeskFirebase.getUserId=()=> 'student-b';
 assert.equal(api.versions('n1').length,0);
 assert.equal(api.restoreDraft(original).body,'Cloud copy');
});
test('connections reflect existing notes, references and maps without writing account data',()=>{
 const f=harness('psychology-connections.js');
 const d=f.core.getStudy();
 d.notes=[{id:'n1',title:'Working memory',body:'Working memory has limited capacity.'}];
 d.research=[{id:'r1',title:'Working memory and cognition'}];
 d.mindMaps=[{id:'m1',title:'Memory research',nodes:[{label:'Working memory'}]}];
 f.ctx.window.PsychDeskKnowledge={
  glossary:()=>[{id:'term1',term:'Working memory'}],history:()=>[{id:'event1',title:'Working memory model',description:'Historical context'}]
 };
 const api=f.ctx.window.PsychDeskConnections;
 const matches=api.matchesFor('Working memory');
 assert.deepEqual(Array.from(Object.values(matches).map(x=>x.length)),[1,1,1,1]);
 assert.match(api.forConcept({term:'Working memory'}),/Your notes/);
 assert.match(api.forNote({title:'',body:'Working memory example'}),/Working memory/);
 assert.equal(api.contains('Notworking memory', 'Working memory'),false);
});
test('academic lookup maps Europe PMC, PubMed MeSH and OpenAlex into source-linked paper cards',async()=>{
 const f=harness('psychology-academic.js');
 const api=f.ctx.window.PsychDeskAcademic;
 let eURL;
 const europe=await api.europePMC('cognitive dissonance',{fetchImpl:async url=>{
  eURL=new URL(url);
  return {ok:true,json:async()=>({resultList:{result:[{
   id:'123456',source:'MED',title:'Cognitive dissonance research',authorString:'A Scholar',
   pubYear:'2023',journalTitle:'Psychology Journal',doi:'10.1234/test',
   abstractText:'A <b>brief</b> abstract about cognitive dissonance.',
   meshHeadingList:{meshHeading:[{descriptorName:'Psychology'}]}
  }]}})};
 }});
 assert.equal(eURL.searchParams.get('resultType'),'core');
 assert.equal(europe.length,1);
 assert.equal(europe[0].meshHeadings[0],'Psychology');
 assert.equal(europe[0].doi,'10.1234/test');
 assert.equal(europe[0].abstract.includes('<b>'),false);
 let aURL;
 const alex=await api.openAlex('memory',{fetchImpl:async url=>{
  aURL=new URL(url);
  return {ok:true,json:async()=>({results:[{
   id:'https://openalex.org/W123',display_name:'Working memory study',publication_year:2024,
   authorships:[{author:{display_name:'A Scientist'}}],primary_location:{source:{display_name:'Journal'}}
  }]})};
 }});
 assert.equal(aURL.searchParams.get('search'),'memory');
 assert.equal(alex[0].provider,'OpenAlex');
 assert.equal(api.dedupe([europe[0],europe[0],alex[0]]).length,2);
});
test('script loading, study-data isolation, and PWA updates remain intact',()=>{
 const html=script('index.html'),sw=script('sw.js');
 for(const file of ['note-history.js','psychology-connections.js','psychology-academic.js','study-connections.css']){
  assert.ok(html.includes(file));
  assert.ok(sw.includes(file));
 }
 assert.ok(html.indexOf('psychology-knowledge.js')<html.indexOf('psychology-connections.js'));
 assert.ok(html.indexOf('cloud.js')<html.indexOf('note-history.js'));
 assert.ok(!script('app.js').includes('noteVersions:'));
 const cloud=script('cloud.js');
 assert.ok(cloud.includes('verifyDriveConnection'));
 assert.ok(cloud.includes("driveVerified=true;storeDriveSession(email)"));
 assert.ok(script('firebase-sync.js').includes('restoreDriveSession?.()'));
});
