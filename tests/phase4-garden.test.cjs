const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {readFileSync}=require('node:fs'),{join}=require('node:path');
const source=readFileSync(join(__dirname,'..','phase4-garden.js'),'utf8');
function setup(){
 const handlers={},data={sessions:[{day:'2026-11-04',minutes:25},{day:'2026-11-04',minutes:15},{day:'2026-11-03',minutes:20}],cards:[{id:'a'}]};
 const core={getData:()=>data,esc:s=>String(s??''),toast:()=>{}};
 const window={PsychDeskCore:core,PsychDeskGarden:{scene:()=>'<svg aria-label="garden"></svg>'}};
 const document={addEventListener:(name,fn)=>handlers[name]=fn};
 const FakeDate=class extends Date{constructor(...args){super(...(args.length?args:['2026-11-05T12:00:00']))}};
 vm.runInNewContext(source,{window,document,Date:FakeDate,Number,Array,String,Math});
 return {api:window.PsychDeskPhase4,data};
}
test('garden progress uses only existing logged sessions',()=>{
 const e=setup(),before=JSON.stringify(e.data),p=e.api.progress();
 assert.equal(p.total,60);assert.equal(p.active,2);
 assert.equal(JSON.stringify(e.data),before);
});
test('garden is optional and reuses the existing illustration',()=>{
 const e=setup(),html=e.api.render();
 assert.match(html,/<details class="p4-garden"/);
 assert.match(html,/aria-label="garden"/);
 assert.match(html,/60 minutes logged/);
 assert.match(html,/Missed days never undo progress/);
});
test('negative and malformed session durations are ignored',()=>{
 const e=setup();e.data.sessions.push({day:'2026-11-04',minutes:-30},{day:'2026-11-04',minutes:'not a number'});
 assert.equal(e.api.progress().total,60);
});
