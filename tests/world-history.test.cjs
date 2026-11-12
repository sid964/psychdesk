'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const KEY='psychdeskViewV1';
function environment(hash='',previous=false){
 const events=new EventTarget(),location=new URL('https://example.test/psychdesk/'+hash);
 let active=null,closed=0,currentTab='today',backCalls=0;
 const document={activeElement:null,addEventListener(){},removeEventListener(){},
  getElementById:id=>id==='main'?{querySelector:()=>null}:null,
  createElement(tag){const node={tag,dataset:{},contentWindow:{},isConnected:true,setAttribute(){},addEventListener(){},focus(){},append(...items){this.items=items},click(){},remove(){if(active===this)active=null},querySelector(selector){return selector==='iframe'?this.items?.find(x=>x.tag==='iframe'):this.items?.find(x=>x.tag==='button')}};return node},
  body:{children:[{inert:false},{inert:true}],classList:{add(){},remove(){}},append(node){this.children.push(node);if(node.tag==='section')active=node}}};
 const entries=previous?[{url:'https://external.test/',state:null}]:[];
 entries.push({url:location.href,state:null});let position=entries.length-1;
 function go(delta){backCalls+=delta<0?1:0;position+=delta;const entry=entries[position];if(!entry)throw Error('Left app history');location.href=entry.url;const event=new Event('popstate');event.state=entry.state;events.dispatchEvent(event);}
 const history={get state(){return entries[position].state},replaceState(state,_,url){entries[position]={state,url:new URL(url,location).href};location.href=entries[position].url},pushState(state,_,url){entries.splice(++position);entries.push({state,url:new URL(url,location).href});location.href=entries[position].url},back(){go(-1)}};
 const window={addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),PsychDeskCore:{closeModal(){closed++},setTab(tab){currentTab=tab;const event=new Event('psychdesk:tab-changed');event.tab=tab;events.dispatchEvent(event)}}};
 const context={window,document,location,history,URL,console,queueMicrotask:fn=>fn(),MutationObserver:class{observe(){}}};
 vm.runInNewContext(fs.readFileSync('world/world-bridge.js','utf8'),context);
 return {window,location,history,entries,document,get active(){return active},get closed(){return closed},get tab(){return currentTab},get backCalls(){return backCalls},forward:()=>go(1),anchor(hash){history.pushState(null,'',hash);const event=new Event('popstate');event.state=null;events.dispatchEvent(event)},visit(tab,override={}){const event=new Event('message');Object.assign(event,{origin:location.origin,source:active?.querySelector('iframe').contentWindow,data:{type:'psychworld:visit',tab}},override);events.dispatchEvent(event)}};
}
for(const destination of ['notes','materials','recall','dictionary','focus','garden'])test('World → '+destination+' → Back → Forward preserves route order',()=>{
 const env=environment('',true);env.window.PsychDeskWorldNavigation.openWorld();env.visit(destination);
 assert.equal(env.location.hash,'#pd-'+destination);assert.equal(env.active,null);
 env.history.back();assert.equal(env.location.hash,'#pd-world');assert.ok(env.active);assert.ok(env.closed);
 env.forward();assert.equal(env.location.hash,'#pd-'+destination);assert.equal(env.active,null);
 env.history.back();env.history.back();assert.equal(env.location.hash,'#pd-today');
 assert.equal(env.entries.length,4,'external, home, world, destination only');
});
test('closing a direct World deep link stays within PsychDesk',()=>{
 const env=environment('#pd-world',true);assert.ok(env.active);
 env.window.PsychDeskWorldNavigation.closeWorld();
 assert.equal(env.location.hash,'#pd-today');assert.equal(env.active,null);assert.equal(env.backCalls,0);
 assert.equal(env.entries.length,2,'no extra history entry traps the user');
});
test('closing an ordinarily opened World goes Back and Forward reopens it',()=>{
 const env=environment();env.window.PsychDeskCore.setTab('notes');env.window.PsychDeskWorldNavigation.openWorld();
 env.window.PsychDeskWorldNavigation.closeWorld();assert.equal(env.location.hash,'#pd-notes');assert.equal(env.active,null);
 env.forward();assert.ok(env.active);assert.equal(env.tab,'notes');
});
test('untrusted frame messages cannot navigate the parent',()=>{
 const env=environment();env.window.PsychDeskWorldNavigation.openWorld();
 env.visit('recall',{origin:'https://untrusted.test'});assert.ok(env.active);
 env.visit('recall',{source:{}});assert.ok(env.active);assert.equal(env.location.hash,'#pd-world');
});

test('World hides covered controls from keyboard focus and restores previous inert state',()=>{
 const env=environment();const [shell,alreadyInert]=env.document.body.children;
 env.window.PsychDeskWorldNavigation.openWorld();assert.equal(shell.inert,true);assert.equal(alreadyInert.inert,true);
 assert.notEqual(env.active.inert,true,'World itself must remain interactive');
 env.window.PsychDeskWorldNavigation.closeWorld();assert.equal(shell.inert,false);assert.equal(alreadyInert.inert,true);
});

for(const hash of ['#main','#studio-tool-group-3'])test('native anchor '+hash+' preserves its study view through Back/Forward',()=>{
 const env=environment();env.window.PsychDeskCore.setTab('tools');env.anchor(hash);
 assert.equal(env.tab,'tools');assert.equal(env.location.hash,hash);assert.equal(env.history.state[KEY].tab,'tools');
 env.window.PsychDeskCore.setTab('notes');env.history.back();assert.equal(env.tab,'tools');assert.equal(env.location.hash,hash);
 env.forward();assert.equal(env.tab,'notes');assert.equal(env.location.hash,'#pd-notes');
});
