'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=path=>fs.readFileSync(require('node:path').join(__dirname,'..',path),'utf8');

test('new onboarding introduces current desktop features, not removed planner, notes or flashcards',()=>{
 const js=src('tour.js');
 for(const current of ['.desk-original-cover','.focus-room-intro','.desktop-tool-home .study-tools-grid','#accountBtn','PsychDeskTour={start,finish}']){
  assert.ok(js.includes(current),'Missing current tour anchor: '+current);
 }
 for(const obsolete of ['#quickNoteBtn','data-tab="notes"','data-tab="planner"','handwriting, sticky notes, flashcards']){
  assert.ok(!js.includes(obsolete),'Obsolete first-visit instruction: '+obsolete);
 }
 assert.match(js,/const KEY='psychdesk-tour-v1'/,'completed onboarding state must not reset for existing visitors');
 assert.match(js,/setTab\?\.\(step\.tab\)/,'tour should navigate to actual sections');
 assert.match(js,/data-tour="back"/);
 assert.match(js,/data-tour="skip"/);
 assert.match(js,/replayTour/);
 assert.match(js,/aria-modal/);
 assert.doesNotMatch(js,/\.notes\.push|\.cards\.push|\.materials\.push/,'no sample data should be created');
});

test('first visit remains optional, world-safe and does not reappear after dismissal',()=>{
 let offer,appended=[],callbacks={};
 const invite={setAttribute(){},addEventListener(name,fn){callbacks[name]=fn},remove(){},innerHTML:''};
 const window={PsychDeskCore:{}};
 const document={hidden:false,addEventListener(){},body:{classList:{contains:()=>false},append(el){appended.push(el)}},
  querySelector:selector=>selector==='#modalRoot'?{children:[]}:null,createElement:()=>invite};
 const storage={value:null,getItem(){return this.value},setItem(k,v){this.value=v}};
 vm.runInNewContext(src('tour.js'),{window,document,localStorage:storage,
  setInterval:fn=>{offer=fn;return 1},setTimeout:()=>2,clearInterval(){},clearTimeout(){}});
 offer();
 assert.equal(appended.length,1);
 assert.match(invite.innerHTML,/Welcome to PsychDesk/);
 assert.match(invite.innerHTML,/Take a tour/);
 callbacks.click({target:{closest:selector=>selector==='[data-tour-invite]'?{dataset:{tourInvite:'dismiss'}}:null}});
 assert.equal(storage.value,'done');
 offer();
 assert.equal(appended.length,1,'dismissed invitation must not reappear');
});

test('onboarding assets and controls ship with release and support reduced motion',()=>{
 const html=src('index.html'),sw=src('sw.js'),css=src('tour.css');
 assert.match(html,/tour\.js\?v=desktop-intro-20261122/);
 assert.match(html,/tour\.css\?v=desktop-intro-20261122/);
 assert.ok(sw.includes("'./tour.js'")&&sw.includes("'./tour.css'"));
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/tour-panel-welcome/);
 assert.match(css,/tour-panel-guided/);
 assert.match(css,/tour-panel-complete/);
 const app=src('app.js');
 assert.match(app,/data-action="replayTour"/);
 assert.match(app,/Replay introduction/);
});
