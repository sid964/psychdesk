const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {readFileSync}=require('node:fs'),{join}=require('node:path');
const root=join(__dirname,'..');
const file=name=>readFileSync(join(root,name),'utf8');
function environment(){
 const calls=[],handlers={};
 const data={version:2,subjects:[{id:'cog',name:'Cognitive Psychology'}],
  tasks:[{id:'t1',title:'Attention',subjectId:'cog',due:'2026-11-05',done:false}],
  notes:[{id:'n1',title:'Chapter outline · Memory',body:'Working memory and attention',subjectId:'cog',
    derivedKind:'prepared-chapter',sourceInfo:{kind:'chapter-preparation',originalName:'Memory',materialId:'m1',pageStart:4,pageEnd:9}},
   {id:'n2',title:'Working memory',body:'Cognitive attention and memory',subjectId:'cog'},
   {id:'n3',title:'Attention theories',body:'Theories of cognitive attention and memory',subjectId:'cog'}],
  cards:[{id:'c1',question:'What is working memory?',answer:'Temporary processing',subjectId:'cog',due:'2026-11-05',
    sourceKind:'chapter-preparation',sourceMaterialId:'m1',sourceTitle:'Memory',sourcePageStart:4,sourcePageEnd:9}],
  materials:[{id:'m1',kind:'pdf',title:'Memory textbook'}],
  reviews:[{cardId:'c1',day:'2026-11-04',rating:'hard'}],
  sessions:[{day:'2026-11-04',minutes:25}],research:[],mindMaps:[]};
 const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const core={getData:()=>data,getStorageKey:()=> 'test-account',today:()=> '2026-11-05',esc,render:()=>{},
   setTab:t=>calls.push(['tab',t]),openStudyTopic:id=>{calls.push(['topic',id]);return true},toast:()=>{}};
 const window={PsychDeskCore:core,PsychDeskGarden:{scene:()=>'<svg aria-label="living garden"></svg>'},
   PsychDeskSession:{getResume:()=>null},PsychDeskCloud:{noteEditor:note=>calls.push(['note',note.id])},
   addEventListener:(name,fn)=>{(handlers['window:'+name]??=[]).push(fn)}};
 const document={addEventListener:(name,fn)=>{(handlers[name]??=[]).push(fn)},querySelector:()=>null};
 const context=vm.createContext({window,document,Date,Set,Map,Number,String,Array,Math,Event:class{constructor(type){this.type=type}}});
 for(const name of ['phase3-knowledge.js','phase4-garden.js','phase5-chapters.js','phase6-next-step.js','phase7-weak-concepts.js','phase8-reflection.js'])
  vm.runInContext(file(name),context,{filename:name});
 return {window,data,calls,handlers};
}
test('all Phases 3–8 load into a single, read-only Study Flow',()=>{
 const e=environment(),before=JSON.stringify(e.data);
 const {PsychDeskPhase3:p3,PsychDeskPhase4:p4,PsychDeskPhase5:p5,PsychDeskPhase6:p6,PsychDeskPhase7:p7,PsychDeskPhase8:p8}=e.window;
 assert.match(p3.render(),/Just one next step/);
 assert.match(p3.render(),/Looking back at this week/);
 assert.match(p6.homeCard(),/Attention/);
 p3.setSection('chapters');
 assert.match(p3.render(),/Return to reading/);
 assert.equal(p5.chapters()[0].linked,1);
 p3.setSection('connect');
 assert.match(p3.render(),/Working memory/);
 assert.match(p3.render(),/Compare two saved theories/);
 p3.setSection('review');
 assert.match(p3.render(),/Concepts worth another look/);
 assert.equal(p7.weak()[0].card.id,'c1');
 assert.match(p4.render(),/living garden/);
 assert.equal(p8.summary().totalMinutes,25);
 assert.equal(JSON.stringify(e.data),before,'viewing releases must never mutate study records');
});
test('homepage primary action opens the selected focus topic in one tap',()=>{
 const e=environment(),button={dataset:{p6:'homeGo'}};
 for(const fn of e.handlers.click||[])fn({target:{closest:()=>button},preventDefault(){}});
 assert.deepEqual(e.calls[0],['topic','t1']);
});
test('Phase 1 reader, Phase 2 preparation, accounts and Settings icon survive release',()=>{
 const html=file('index.html'),js=file('app.js'),sw=file('sw.js');
 for(const script of ['pdf-reader.js','study-session.js','autopilot/preparation.js','autopilot/imports.js',
  'cloud.js','firebase-sync.js','drive-persistence.js',
  'phase3-knowledge.js','phase4-garden.js','phase5-chapters.js','phase6-next-step.js',
  'phase7-weak-concepts.js','phase8-reflection.js'])assert.ok(html.includes('src="'+script+'?'),script);
 assert.match(html,/id="settingsBtn"/);
 assert.match(html,/data-tab="connections"/);
 assert.match(html,/phase-release\.css\?v=release-1/);
 assert.match(js,/validateSnapshot/);assert.match(js,/openStudyTopic/);
 assert.match(sw,/const CACHE='psychdesk-[a-z0-9-]+-v\d+'/);assert.match(sw,/cache:'no-store'/);
});
