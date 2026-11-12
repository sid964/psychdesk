const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
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
 assert.match(home,/Welcome <em>back\.<\/em>/);
 assert.match(home,/RECENTLY ON THE DESK/);
 assert.match(home,/LATEST NOTE/);
 assert.match(home,/Open library/);
 assert.match(home,/window\.PsychDeskGarden\?\.scene/);
 assert.match(read('study-session.js'),/materials:'Library'/);
});
test('navigation checks the network, with fallback restricted to new cache',()=>{
 const sw=read('sw.js');
 assert.match(sw,/neutral-desk-v83/);
 assert.match(sw,/request\.mode==='navigate'/);
 assert.match(sw,/fetch\(request,\{cache:'no-store'\}\)/);
 assert.match(sw,/new Request\(path,\{cache:'reload'\}\)/);
 assert.doesNotMatch(sw,/ignoreSearch:true/);
 assert.match(read('home-diorama.css'),/Open study desk/);
});
