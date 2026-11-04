const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {readFileSync}=require('node:fs'),{join}=require('node:path');
const source=readFileSync(join(__dirname,'..','phase8-reflection.js'),'utf8');
function setup(){
 const data={sessions:[{day:'2026-11-04',minutes:25},{day:'2026-11-04',minutes:15},{day:'2026-11-01',minutes:30},{day:'2026-10-01',minutes:900}],reviews:[{day:'2026-11-04',cardId:'c1',rating:'hard'},{day:'2026-11-03',cardId:'c2',rating:'good'},{day:'2026-10-01',cardId:'c3',rating:'again'}]};
 const window={PsychDeskCore:{getData:()=>data,today:()=> '2026-11-05',esc:s=>String(s??'')}};
 vm.runInNewContext(source,{window,Date,Set,Number,Math});
 return {api:window.PsychDeskPhase8,data};
}
test('counts only the last seven calendar days and does not mutate data',()=>{
 const e=setup(),before=JSON.stringify(e.data),s=e.api.summary();
 assert.equal(s.totalMinutes,70);assert.equal(s.activeDays,2);assert.equal(s.reviewCount,2);
 assert.equal(s.days.length,7);assert.equal(JSON.stringify(e.data),before);
});
test('rejects invalid and negative durations',()=>{
 const e=setup();e.data.sessions.push({day:'2026-11-04',minutes:-50},{day:'2026-11-04',minutes:'invalid'});
 assert.equal(e.api.summary().totalMinutes,70);
});
test('renders optional collapsible reflection, not a forced score',()=>{
 const e=setup(),html=e.api.render();
 assert.match(html,/<details class="p8-reflection">/);assert.match(html,/70/);assert.match(html,/No streaks, penalties or extra tasks/);
});
