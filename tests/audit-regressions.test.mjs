import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
function environment({storage=new Map(),readError=false}={}){
 const events=new EventTarget(),listeners={},nodes=new Map();let fail=false,now=Date.now();
 const node=()=>({innerHTML:'',textContent:'',value:'',dataset:{},style:{},isConnected:true,elements:{},listeners:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},setAttribute(){},removeAttribute(){},querySelector(){return null},querySelectorAll(){return []},addEventListener(t,f){this.listeners[t]=f},focus(){},append(){},remove(){},click(){}});
 const document={querySelector:q=>{if(q==='#modalRoot .modal')return null;if(!nodes.has(q))nodes.set(q,node());return nodes.get(q)},querySelectorAll:()=>[],body:node(),addEventListener:(t,fn)=>(listeners[t]??=[]).push(fn),createElement:node};
 const window={addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),dispatchEvent:events.dispatchEvent.bind(events),scrollTo(){}};
 const localStorage={getItem:k=>{if(readError)throw Error('Storage denied');return storage.get(k)??null},setItem:(k,v)=>{if(fail)throw Error('Quota exceeded');storage.set(k,String(v))},removeItem:k=>storage.delete(k)};
 const context=vm.createContext({window,document,localStorage,sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},console,Event,structuredClone,AbortController,URL,URLSearchParams,Blob,TextEncoder,Date:class extends Date{static now(){return now}},location:{protocol:'https:',hostname:'sid964.github.io',origin:'https://sid964.github.io'},navigator:{onLine:true},setInterval(){},setTimeout:()=>1,clearTimeout(){},confirm:()=>true,requestAnimationFrame:fn=>fn(),FormData:class{constructor(form){this.form=form}get(k){return this.form.elements[k]?.value??''}}});
 vm.runInContext(source('app.js').replace('window.PsychDeskCore=', 'window.__audit={invoke,taskForm,subjectForm,cardForm,updateReview,tick,completeTimer,getTimer:()=>timer};window.PsychDeskCore='),context);
 return {context,window,document,nodes,storage,core:window.PsychDeskCore,api:window.__audit,failWrites:v=>{fail=v},advance:ms=>{now+=ms},load:name=>vm.runInContext(source(name),context),click:dataset=>{const button={dataset};for(const fn of listeners.click||[])fn({preventDefault(){},target:{closest:q=>q.includes('[data-cloud]')&&dataset.cloud?button:null,classList:{contains:()=>false}}})} };
}
function submit(e,selector,values){const form=e.document.querySelector(selector);form.elements=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,{value:v}]));form.listeners.submit({preventDefault(){},target:form});return form;}
const invoke=(e,action,id)=>e.api.invoke(action,{dataset:{id}});
test('storage access denied at startup still renders the recovery controls',()=>{
 const e=environment({readError:true});assert.ok(e.core);assert.match(e.document.querySelector('#main').innerHTML,/Saved study data needs recovery/);assert.equal(e.core.save(),false);
});
test('planner create, edit, toggle and delete stay atomic when storage is full',()=>{
 const e=environment();e.api.taskForm();e.failWrites(true);
 submit(e,'#taskForm',{id:'',title:'Keep this typed topic',subjectId:'cog',due:'',minutes:'25'});
 assert.equal(e.core.getData().tasks.length,0);assert.match(e.document.querySelector('#modalRoot').innerHTML,/New study topic/);assert.doesNotMatch(e.document.querySelector('#toast').textContent,/saved$/i);
 e.failWrites(false);submit(e,'#taskForm',{id:'',title:'Keep this typed topic',subjectId:'cog',due:'',minutes:'25'});
 const id=e.core.getData().tasks[0].id;e.failWrites(true);invoke(e,'toggleTask',id);assert.equal(e.core.getData().tasks[0].done,false);invoke(e,'deleteTask',id);assert.equal(e.core.getData().tasks.length,1);
 e.api.taskForm(e.core.getData().tasks[0]);submit(e,'#taskForm',{id,title:'Rejected edit',subjectId:'cog',due:'',minutes:'25'});assert.equal(e.core.getData().tasks[0].title,'Keep this typed topic');
});
test('subject and flashcard forms retain inputs without phantom records',()=>{
 const e=environment(),count=e.core.getData().subjects.length;e.failWrites(true);e.api.subjectForm();submit(e,'#subjectForm',{id:'',name:'My subject',color:'#667da6',resources:''});assert.equal(e.core.getData().subjects.length,count);
 e.api.cardForm();const form=submit(e,'#cardForm',{id:'',question:'My question',answer:'My answer',subjectId:'cog'});assert.equal(e.core.getData().cards.length,0);assert.equal(form.elements.answer.value,'My answer');
});
test('failed recall rating preserves the due date and review history',()=>{
 const e=environment();e.core.getData().cards.push({id:'c',question:'Q',answer:'A',due:'2026-11-01',interval:3,reps:1});e.core.save();e.failWrites(true);e.api.updateReview(e.core.getData().cards[0],'good');assert.equal(e.core.getData().cards[0].due,'2026-11-01');assert.equal(e.core.getData().reviews.length,0);
});
test('finish and log becomes available after one minute and failed logging retains timer',()=>{
 const e=environment();invoke(e,'startTimer');e.advance(61000);e.api.tick();assert.equal(e.document.querySelector('[data-action="completeTimer"]').disabled,false);
 e.failWrites(true);e.api.completeTimer();assert.equal(e.core.getData().sessions.length,0);assert.equal(e.api.getTimer().running,true);
 e.failWrites(false);e.api.completeTimer();assert.equal(e.core.getData().sessions.length,1);e.api.completeTimer();assert.equal(e.core.getData().sessions.length,1);
});
test('focus session survives same-account initialization and is isolated between accounts',()=>{
 const e=environment();invoke(e,'startTimer');const ends=e.api.getTimer().endsAt;e.core.useStorageKey('psychdesk-v1');assert.equal(e.api.getTimer().endsAt,ends);assert.equal(e.api.getTimer().running,true);
 e.core.useStorageKey('psychdesk-user-alice');assert.equal(e.api.getTimer().running,false);e.core.useStorageKey('psychdesk-v1');assert.equal(e.api.getTimer().endsAt,ends);assert.equal(e.api.getTimer().running,true);
 const restored=environment({storage:e.storage});assert.equal(restored.api.getTimer().endsAt,ends);assert.equal(restored.api.getTimer().running,true);
});
test('existing legacy focus timer migrates once without losing elapsed minutes',()=>{
 const storage=new Map([['psychdesk-timer-v1',JSON.stringify({duration:25,remaining:1200,startedTotal:1500,endsAt:0,running:false,subjectId:'cog'})]]);const e=environment({storage});assert.equal(e.api.getTimer().remaining,1200);assert.ok(storage.has('psychdesk-timer-v2:psychdesk-v1'));assert.equal(storage.has('psychdesk-timer-v1'),false);
});
test('malformed backup rows are rejected without replacing current notes',()=>{
 const e=environment();e.core.getData().notes.push({id:'keep',body:'Keep me'});e.core.save();const before=structuredClone(e.core.getData());
 for(const change of [{tasks:[null]},{notes:[{id:'bad',body:{html:'oops'}}]},{sessions:[{minutes:'<img src=x>'}]},{mindMaps:[{id:'bad',nodes:null,edges:[]}]}])assert.throws(()=>e.core.replaceData({...before,...change}),/Invalid/);
 assert.equal(e.core.getData().notes[0].body,'Keep me');
});
test('deleting an open notebook note does not resurrect it through close autosave',()=>{
 const e=environment();e.load('cloud.js');e.core.getData().notes.push({id:'n',title:'Existing',body:'Keep until delete',subjectId:'',tags:''});
 const form=e.document.querySelector('#noteForm');form.elements=Object.fromEntries(Object.entries(e.core.getData().notes[0]).map(([k,v])=>[k,{value:v}]));e.window.PsychDeskCloud.noteEditor(e.core.getData().notes[0]);form.elements.body.value='Pending edited body';
 e.click({cloud:'deleteNote',id:'n'});assert.equal(e.core.getData().notes.length,0);assert.equal(JSON.parse(e.storage.get('psychdesk-v1')).notes.length,0);
});
test('failed notebook deletion retains the original note and open editor',()=>{
 const e=environment();e.load('cloud.js');e.core.getData().notes.push({id:'n',title:'Existing',body:'Text'});e.core.save();e.failWrites(true);e.click({cloud:'deleteNote',id:'n'});assert.equal(e.core.getData().notes.length,1);assert.match(e.document.querySelector('#toast').textContent,/Could not delete/);
});
test('damaged local note history cannot crash autosave',()=>{
 const e=environment();e.storage.set('psychdesk-note-history-v1:guest:versions:n','{"not":"an array"}');e.load('note-history.js');assert.equal(e.window.PsychDeskNoteHistory.recordVersion({id:'n',title:'Title',body:'Body'}),true);
});
test('late Markdown read cannot replace the next book or survive leaving the reader',async()=>{
 const e=environment();e.load('pdf-reader.js');let resolve;const slow={name:'slow.md',size:10,text:()=>new Promise(r=>{resolve=r})};const first=e.window.PsychDeskReader.openLocal(slow);await e.window.PsychDeskReader.openLocal({name:'new.md',size:10,text:async()=>'New current book'});resolve('Old stale book');await first;assert.match(e.window.PsychDeskReader.render(),/New current book/);assert.doesNotMatch(e.window.PsychDeskReader.render(),/Old stale book/);e.core.setTab('today');assert.doesNotMatch(e.window.PsychDeskReader.render(),/New current book/);
});
test('dictionary CSV records preserve quoted newlines and escaped quotes',()=>{
 const e=environment();vm.runInContext(source('psychology-imports.js').replace('window.PsychDeskDictionaryPacks=', 'window.__csv={splitRecords,parseCsvRow};window.PsychDeskDictionaryPacks='),e.context);const {splitRecords,parseCsvRow}=e.window.__csv;
 const input='term,definition\r\n"Memory","A line\nwith ""quotes"" and, commas"\r\n';const split=splitRecords(input,true,true);assert.equal(split.records.length,2);assert.equal(parseCsvRow(split.records[1])[1],'A line\nwith "quotes" and, commas');assert.throws(()=>splitRecords('"unfinished',true,true),/unclosed/);
});
