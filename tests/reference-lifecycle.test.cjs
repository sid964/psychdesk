'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){
 let data={subjects:[],research:[]},opened=0,resolveText,resolveLookup;
 const file={size:100,name:'private.ris',text:()=>new Promise(resolve=>resolveText=resolve)};
 const docEvents={},winEvents={},nodes={'#refLookupInput':{value:'10.1000/example'},'#refLookupStatus':{textContent:''}};
 const core={getData:()=>data,esc:String,openModal(){opened++},toast(){}};
 const window={PsychDeskCore:core,addEventListener:(name,fn)=>winEvents[name]=fn};
 const document={querySelector:s=>nodes[s]||null,addEventListener:(name,fn)=>docEvents[name]=fn};
 vm.runInNewContext(fs.readFileSync('reference-manager.js','utf8'),{window,document,URL,AbortController,console,setTimeout:()=>1,clearTimeout(){},fetch:()=>new Promise(resolve=>resolveLookup=resolve)});
 return {get opened(){return opened},startImport(){docEvents.change({target:{id:'referenceImportFile',files:[file],value:'private.ris'}})},finishImport:()=>resolveText('TY  - JOUR\nTI  - Private bibliography entry\nER  -'),startLookup(){docEvents.click({target:{closest:()=>({dataset:{ref:'lookup'}})},preventDefault(){}})},finishLookup:()=>resolveLookup({ok:true,json:async()=>({message:{title:['Lookup result']}})}),reset(){winEvents['psychdesk:session-reset']();data={subjects:[],research:[]}},nodes};
}
for(const action of ['Import','Lookup'])test('late reference '+action.toLowerCase()+' cannot open a preview after an account reset',async()=>{
 const env=setup();env['start'+action]();env.reset();env['finish'+action]();await new Promise(setImmediate);assert.equal(env.opened,0);
});
test('current-owner reference import still opens its review preview',async()=>{
 const env=setup();env.startImport();env.finishImport();await new Promise(setImmediate);assert.equal(env.opened,1);
});
test('current-owner DOI lookup still opens editable metadata',async()=>{
 const env=setup();env.startLookup();env.finishLookup();await new Promise(setImmediate);assert.equal(env.opened,1);
});
test('navigating away suppresses a late DOI dialog',async()=>{
 const env=setup();env.startLookup();delete env.nodes['#refLookupStatus'];env.finishLookup();await new Promise(setImmediate);assert.equal(env.opened,0);
});
