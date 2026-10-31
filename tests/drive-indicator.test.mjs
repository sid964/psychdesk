import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../drive-indicator.js',import.meta.url),'utf8');
function env(){
 const events={},node={dataset:{},innerHTML:'',title:'',setAttribute(key,value){this[key]=value}};
 let signed=false,connected=false,settings=0,signin=0;
 const window={
  PsychDeskCloud:{isConnected:()=>connected,openSettings:()=>{settings++}},
  PsychDeskFirebase:{getUserId:()=>signed?'alice':null,openAccount:()=>{signin++}},
  addEventListener:(name,fn)=>{events[name]=fn}
 };
 const document={querySelector:q=>q==='#driveStatusChip'?node:null,addEventListener:(name,fn)=>{events[name]=fn},visibilityState:'visible'};
 vm.runInNewContext(script,{window,document,setInterval:()=>1});
 return {window,node,events,setSigned:v=>{signed=v},setConnected:v=>{connected=v},get settings(){return settings},get signin(){return signin}};
}
test('Drive status reflects live connection, not only Firebase sign-in',()=>{
 const h=env();
 assert.equal(h.node.dataset.state,'signed-out');
 h.setSigned(true);h.window.PsychDeskDriveIndicator.update();
 assert.equal(h.node.dataset.state,'reconnect');
 assert.match(h.node.innerHTML,/Drive ↻/);
 h.setConnected(true);h.events['psychdesk:drive-connected']();
 assert.equal(h.node.dataset.state,'ready');
 assert.match(h.node.innerHTML,/Drive ✓/);
 h.setConnected(false);h.window.PsychDeskDriveIndicator.update();
 assert.equal(h.node.dataset.state,'reconnect');
});
test('Drive chip opens account setup when signed out and settings when connected',async()=>{
 const h=env();
 const click=()=>h.events.click({target:{closest:selector=>selector==='#driveStatusChip'?{}:null},preventDefault(){}});
 click();await Promise.resolve();
 assert.equal(h.signin,1);
 h.setSigned(true);h.setConnected(true);click();await Promise.resolve();
 assert.equal(h.settings,1);
});
