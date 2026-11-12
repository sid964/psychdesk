const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=path=>fs.readFileSync(path,'utf8');
test('initial home waits for studio and keeps fallback for failed load',()=>{
 const app=read('app.js'),studio=read('autopilot/studio.js'),html=read('index.html');
 assert.match(app,/const expectsStudio=Array\.from\(document\.scripts/);
 assert.match(app,/if\(!expectsStudio\)render\(\)/);
 assert.match(app,/if\(!main\.firstElementChild\)render\(\)/);
 assert.match(studio,/window\.PsychDeskAutopilot=\{renderHome/);
 assert.match(studio,/core\.render\(\);\s*recoverJobs/);
 assert.ok(html.indexOf('src="app.js?')<html.indexOf('src="autopilot/studio.js?'));
});
test('homepage uses natural copy and retains the interactive garden',()=>{
 const home=read('autopilot/studio.js');
 for(const phrase of ['Your reading','YOUR DESK','YOUR LAST NOTE','Your last workspace'])assert.ok(!home.includes(phrase),phrase);
 assert.match(home,/Continue <em>studying\.<\/em>/);
 assert.match(home,/RECENTLY ON THE DESK/);
 assert.match(home,/LATEST NOTE/);
 assert.match(home,/Open library/);
 assert.match(home,/window\.PsychDeskGarden\?\.scene/);
 assert.match(read('study-session.js'),/materials:'Library'/);
});
test('navigation checks the network, with fallback restricted to new cache',()=>{
 const sw=read('sw.js');
 assert.match(sw,/psychdesk-study-course-first-v87/);
 assert.match(sw,/request\.mode==='navigate'/);
 assert.match(sw,/fetch\(request,\{cache:'no-store'\}\)/);
 assert.match(sw,/new Request\(path,\{cache:'reload'\}\)/);
 assert.doesNotMatch(sw,/ignoreSearch:true/);
 assert.match(read('home-diorama.css'),/Open study desk/);
});

test('study studio cannot paint legacy home while deferred studio home is pending',()=>{
 const source=read('study-studio.js');
 function boot(scripts){
  let paints=0;
  const window={PsychDeskCore:{render(){paints++}}};
  const document={scripts:scripts.map(src=>({getAttribute:name=>name==='src'?src:null}))};
  vm.runInNewContext(source,{window,document,Map,Math});
  assert.ok(window.PsychDeskStudio,'study studio enhancements remain available');
  return paints;
 }
 assert.equal(boot(['app.js?v=test','autopilot/studio.js?v=test']),0,'studio module owns first paint');
 assert.equal(boot(['app.js?v=test']),1,'standalone fallback still renders');
});
