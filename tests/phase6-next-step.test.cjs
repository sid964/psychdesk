const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {readFileSync}=require('node:fs'),{join}=require('node:path');
const source=readFileSync(join(__dirname,'..','phase6-next-step.js'),'utf8');
function setup({tasks=[],cards=[],chapters=[],resume=null}={}){
 const handlers={},calls=[],data={tasks,cards,notes:[{id:'n1',title:'Outline'}],subjects:[{id:'s1',name:'Cognitive Psychology'}]};
 const core={getData:()=>data,today:()=> '2026-11-05',esc:s=>String(s??'').replace(/</g,'&lt;'),setTab:x=>calls.push(x),toast:()=>{},render:()=>calls.push('render')};
 const window={PsychDeskCore:core,PsychDeskPhase5:{chapters:()=>chapters},PsychDeskSession:{getResume:()=>resume,resume:()=>calls.push('resume')},PsychDeskCloud:{noteEditor:n=>calls.push(n.id)},addEventListener:(k,f)=>handlers['window:'+k]=f};
 const document={addEventListener:(k,f)=>handlers[k]=f};
 vm.runInNewContext(source,{window,document,Number,Math});
 return {api:window.PsychDeskPhase6,data,calls,handlers};
}
test('prioritizes next planned topic, then due review, without altering records',()=>{
 const e=setup({tasks:[{id:'t1',title:'Memory',due:'2026-11-04',subjectId:'s1'}],cards:[{id:'c1',due:'2026-11-01'}]});
 const before=JSON.stringify(e.data),options=e.api.choices();
 assert.equal(options[0].type,'task');assert.equal(options[1].type,'recall');
 assert.match(e.api.render(),/Just one next step/);assert.equal(JSON.stringify(e.data),before);
});
test('ignores completed tasks and future-due flashcards',()=>{
 const e=setup({tasks:[{id:'t1',done:true}],cards:[{id:'c1',due:'2027-01-01'}]});
 assert.equal(e.api.choices()[0].type,'focus');
});
test('opens existing review without auto-marking any cards',()=>{
 const e=setup({cards:[{id:'c1',due:'2026-11-01'}]});
 const button={dataset:{p6:'go'},closest:()=>button};
 e.handlers.click({target:button,preventDefault(){}});
 assert.equal(e.calls[0],'recall');assert.equal(e.data.cards[0].due,'2026-11-01');
});
test('suggests saved chapter and reader continuation when available',()=>{
 const e=setup({chapters:[{note:{id:'n1'},source:{originalName:'Attention'}}],resume:{tab:'reader',page:5,title:'Book'}});
 assert.equal(e.api.choices()[0].type,'chapter');assert.equal(e.api.choices()[1].type,'resume');
});
test('escapes imported task titles',()=>{
 const e=setup({tasks:[{id:'t1',title:'<img src=x onerror=1>'}]});
 assert.doesNotMatch(e.api.render(),/<img src/);
});
