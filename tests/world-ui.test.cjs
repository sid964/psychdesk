'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){
 const events={},nodes=new Map(),messages=[];
 const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:id==='worldDetail',dataset:{},textContent:'',setAttribute(){},addEventListener(){},focus(){this.focused=true},querySelector(){return node('worldDetailClose')}});return nodes.get(id)};
 const document={getElementById:node,addEventListener:(name,fn)=>events[name]=fn};
 const window={parent:{postMessage:(data,origin)=>messages.push({data,origin})}};
 vm.runInNewContext(fs.readFileSync('world/world-ui.js','utf8'),{window,document,location:{origin:'https://example.test'}});
 return {api:window.PsychDeskWorldUI,events,nodes,messages,node};
}
test('Escape dismisses an open discovery without leaving the World',()=>{
 const env=setup();env.api.showDetail('Attention','A source-linked explanation.','dictionary');
 assert.equal(env.node('worldDetail').hidden,false);env.events.keydown({key:'Escape'});
 assert.equal(env.node('worldDetail').hidden,true);assert.equal(env.messages.length,0);assert.equal(env.node('worldClose').focused,true);
 env.events.keydown({key:'Escape'});assert.equal(env.messages[0].data.type,'psychworld:close');
});
test('only supported study destinations are sent to the parent origin',()=>{
 const env=setup();env.api.visit('unknown');assert.equal(env.messages.length,0);
 env.api.visit('notes');assert.equal(env.messages[0].data.tab,'notes');assert.equal(env.messages[0].origin,'https://example.test');
});
