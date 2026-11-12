const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const fs=require('node:fs'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
function setup(){
 const store=new Map();
 const data={subjects:[{id:'abnormal',name:'Abnormal Psychology & Psychopathology'}],cards:[]};
 const core={esc,getStorageKey:()=> 'psychdesk-user-test',getData:()=>data,today:()=> '2026-11-12',commitChange:fn=>{fn();return true},toast:()=>{}};
 const context={window:{PsychDeskCore:core},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}};
 vm.runInNewContext(read('psychopathology-course-data.js'),context);
 vm.runInNewContext(read('psychopathology-graph.js'),context);
 return {api:context.window.PsychDeskPsychopathology,content:context.window.PsychDeskPsychopathologyContent,store,data};
}
test('16 chapters appear in the order of the ninth-edition table of contents',()=>{
 const {api,content}=setup();
 assert.equal(api.chapters().length,16);
 assert.match(content.chapters[0].title,/Psychopathology in Historical Context/);
 assert.match(content.chapters[15].title,/Mental Health Services: Legal and Ethical Issues/);
 assert.equal(new Set(content.chapters.map(c=>c.id)).size,16);
});
test('first chapter lessons have progressive depth, citation pages and fact-checked quizzes',()=>{
 const {content}=setup();
 const lessons=content.topics.filter(t=>t.kind==='lesson');
 assert.equal(lessons.length,6);
 for(const lesson of lessons){
  assert.equal(lesson.chapter,1);
  assert.ok(lesson.simple.length>65);
  assert.ok(lesson.advanced.length>=2);
  assert.ok(/^[0-9]+/.test(lesson.page));
  assert.ok(lesson.question&&lesson.choices.length>=3);
  assert.ok(lesson.correct>=0&&lesson.correct<lesson.choices.length);
 }
 const known=new Set(content.topics.map(t=>t.id));
 assert.ok(content.links.every(([a,b])=>known.has(a)||/^ch([1-9]|1[0-6])$/.test(a)));
 assert.ok(content.links.every(([a,b])=>known.has(b)||/^ch([1-9]|1[0-6])$/.test(b)));
});
test('the course renders independently of existing personal mind maps and notes',()=>{
 const {api,store,data}=setup();
 const before=JSON.stringify(data);
 const html=api.render();
 assert.match(html,/id="psyGraph"/);
 assert.match(html,/Local graph/);
 assert.match(html,/All 16 chapters/);
 assert.match(html,/data-psy-node="ch16"/);
 assert.match(html,/Course progress currently stays on this device/);
 assert.equal(JSON.stringify(data),before);
 assert.equal(store.size,0,'render must not write progress or change account data');
});
test('navigation, assets and cache release include the new course',()=>{
 const html=read('index.html'),app=read('app.js'),sw=read('sw.js');
 for(const file of ['psychopathology-course-data.js','psychopathology-graph.js','psychopathology-graph.css']){
  assert.ok(html.includes(file),'missing HTML asset '+file);
  assert.ok(sw.includes('./'+file),'missing service-worker asset '+file);
 }
 assert.ok(html.includes('data-tab="psychopathology"'));
 assert.ok(app.includes("tab==='psychopathology'"));
 assert.ok(app.includes('PsychDeskPsychopathology?.mount()'));
 assert.ok(html.includes('data-tab="psychology"'),'existing psychology prep preserved');
 assert.ok(html.includes('data-tab="mindmap"')||app.includes("tab==='mindmap'"),'personal mind map route preserved');
});
