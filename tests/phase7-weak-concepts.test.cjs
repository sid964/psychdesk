const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {readFileSync}=require('node:fs'),{join}=require('node:path');
const source=readFileSync(join(__dirname,'..','phase7-weak-concepts.js'),'utf8');
function setup({cards=[{id:'c1',question:'What is classical conditioning?',due:'2026-11-01',subjectId:'s1'},{id:'c2',question:'Define validity',due:'2027-01-01'}],reviews=[{cardId:'c1',day:'2026-11-01',rating:'again'},{cardId:'c1',day:'2026-11-03',rating:'hard'},{cardId:'c2',day:'2026-11-04',rating:'good'}]}={}){
 const handlers={},calls=[],data={cards,reviews,subjects:[{id:'s1',name:'Learning Psychology'}]};
 const core={getData:()=>data,today:()=> '2026-11-05',esc:s=>String(s??'').replace(/</g,'&lt;').replace(/>/g,'&gt;'),setTab:t=>calls.push(t)};
 const window={PsychDeskCore:core},document={addEventListener:(k,fn)=>handlers[k]=fn};
 vm.runInNewContext(source,{window,document});
 return {api:window.PsychDeskPhase7,data,calls,handlers};
}
test('identifies difficult cards without modifying study history',()=>{
 const e=setup(),before=JSON.stringify(e.data),rows=e.api.weak();
 assert.equal(rows.length,1);assert.equal(rows[0].difficulty,2);assert.equal(rows[0].card.id,'c1');
 assert.equal(JSON.stringify(e.data),before);
});
test('empty state is calm and does not invent weaknesses',()=>{
 const e=setup({cards:[{id:'c2',question:'Validity'}],reviews:[{cardId:'c2',rating:'good'}]});
 assert.equal(e.api.weak().length,0);assert.match(e.api.render(),/No difficult flashcard ratings/);
});
test('only five latest ratings count',()=>{
 const e=setup({cards:[{id:'c1',question:'Memory'}],reviews:[
 {cardId:'c1',rating:'again'},{cardId:'c1',rating:'again'},
 {cardId:'c1',rating:'good'},{cardId:'c1',rating:'good'},{cardId:'c1',rating:'good'},
 {cardId:'c1',rating:'good'},{cardId:'c1',rating:'good'}]});
 assert.equal(e.api.weak().length,0);
});
test('escapes question text and opens existing flashcard review',()=>{
 const e=setup({cards:[{id:'c1',question:'<svg onload=1>'}],reviews:[{cardId:'c1',rating:'hard'}]});
 assert.doesNotMatch(e.api.render(),/<svg onload/);
 const button={dataset:{p7:'review'}};e.handlers.click({target:{closest:()=>button},preventDefault(){}});
 assert.equal(e.calls[0],'recall');
});
