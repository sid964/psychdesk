'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('delayed first-visit invitation waits until the World no longer covers the app',()=>{
 let worldOpen=true,offer,appended=0;
 const invite={setAttribute(){},addEventListener(){}};
 const document={hidden:false,addEventListener(){},body:{classList:{contains:name=>name==='psychworld-open'&&worldOpen},append(){appended++}},querySelector:selector=>selector==='#modalRoot'?{children:[]}:null,createElement:()=>invite};
 const window={PsychDeskCore:{}};
 vm.runInNewContext(fs.readFileSync('tour.js','utf8'),{window,document,localStorage:{getItem:()=>null},setInterval:fn=>{offer=fn;return 1},setTimeout:()=>2,clearInterval(){},clearTimeout(){}});
 offer();assert.equal(appended,0,'new focusable controls must not appear outside the modal World');
 worldOpen=false;offer();assert.equal(appended,1,'normal first-visit invitation remains available');
});
