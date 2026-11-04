const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {readFileSync}=require('node:fs'),{join}=require('node:path');
const source=readFileSync(join(__dirname,'..','phase5-chapters.js'),'utf8');
function setup(){
 const calls=[],data={notes:[{id:'n1',title:'Chapter outline · Memory',body:'Memory stages',derivedKind:'prepared-chapter',sourceInfo:{kind:'chapter-preparation',materialId:'pdf1',originalName:'Memory',pageStart:3,pageEnd:7}}],cards:[{id:'c1',sourceKind:'chapter-preparation',sourceMaterialId:'pdf1',sourceTitle:'Memory',sourcePageStart:3,sourcePageEnd:7,due:'2026-01-01'}],materials:[{id:'pdf1',kind:'pdf',title:'Memory'}]};
 const core={getData:()=>data,esc:s=>String(s??'').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'),today:()=> '2026-11-05',setTab:t=>calls.push(t),toast:()=>{}};
 const handlers={},window={PsychDeskCore:core,PsychDeskReader:{open:(...args)=>calls.push(args)},PsychDeskCloud:{noteEditor:n=>calls.push(n.id)}},document={addEventListener:(k,fn)=>handlers[k]=fn};
 vm.runInNewContext(source,{window,document});
 return {api:window.PsychDeskPhase5,data,calls,handlers};
}
test('phase 5 links approved chapter outline to source and cards without mutation',()=>{
 const e=setup(),before=JSON.stringify(e.data),rows=e.api.chapters();
 assert.equal(rows.length,1);assert.equal(rows[0].linked,1);assert.equal(rows[0].due,1);
 assert.match(e.api.render(),/Return to reading/);assert.equal(JSON.stringify(e.data),before);
});
test('missing source keeps outline available and hides reader shortcut',()=>{
 const e=setup();e.data.materials=[];const html=e.api.render();
 assert.match(html,/Open outline/);assert.doesNotMatch(html,/Return to reading/);
});
test('source navigation restores original page',()=>{
 const e=setup();const b={dataset:{p5:'reader',id:'pdf1',page:'3'}};
 e.handlers.click({target:{closest:()=>b},preventDefault(){}});
 assert.equal(e.calls[0][0],'pdf1');assert.equal(e.calls[0][1],3);
});
test('unrelated cards and notes are excluded',()=>{
 const e=setup();e.data.cards.push({sourceKind:'chapter-preparation',sourceMaterialId:'other',sourceTitle:'Memory',sourcePageStart:3,sourcePageEnd:7});
 e.data.notes.push({id:'x',title:'Personal note',body:'Hello'});
 assert.equal(e.api.chapters()[0].linked,1);assert.equal(e.api.chapters().length,1);
});
