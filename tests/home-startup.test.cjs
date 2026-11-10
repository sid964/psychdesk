const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');
test('boot gate prevents any intermediate homepage from being visible',()=>{
 const app=read('app.js'),studio=read('autopilot/studio.js'),html=read('index.html');
 assert.match(html,/dataset\.psychdeskReady="loading"/);
 assert.match(html,/data-psychdesk-ready="loading"\] #main\{visibility:hidden!important\}/);
 assert.match(app,/const expectsStudio=Array\.from\(document\.scripts/);
 assert.match(app,/if\(!expectsStudio\)\{render\(\);document\.documentElement\.dataset\.psychdeskReady='ready'/);
 assert.match(app,/Study desk could not open/);
 assert.doesNotMatch(app,/if\(!main\.firstElementChild\)render\(\)/);
 assert.match(studio,/if\(document\.querySelector\('#main \.garden-home'\)\)document\.documentElement\.dataset\.psychdeskReady='ready'/);
 assert.ok(html.indexOf('src="app.js?')<html.indexOf('src="autopilot/studio.js?'));
});
test('home has human copy, real garden and normal routes',()=>{
 const home=read('autopilot/studio.js'),html=read('index.html');
 assert.match(home,/Welcome <em>back\.<\/em>/);
 assert.match(home,/RECENTLY ON THE DESK/);
 assert.match(home,/LATEST NOTE/);
 assert.match(home,/Open library/);
 assert.match(home,/window\.PsychDeskGarden\?\.scene/);
 assert.match(html,/data-tab="materials"/);
 assert.match(html,/id="settingsBtn"/);
});
test('old HTML and script caches never provide a navigation fallback',()=>{
 const sw=read('sw.js');
 assert.match(sw,/psychdesk-spatial-current-v79/);
 assert.match(sw,/request\.mode==='navigate'/);
 assert.match(sw,/fetch\(request,\{cache:'no-store'\}\)/);
 assert.match(sw,/startsWith\('psychdesk-'\)/);
 assert.doesNotMatch(sw,/caches\.open\(/);
 assert.doesNotMatch(sw,/cache\.match\(/);
 assert.doesNotMatch(sw,/ignoreSearch:true/);
});
test('spatial scene responds only when motion is allowed',()=>{
 const html=read('index.html'),css=read('spatial-desk.css'),js=read('spatial-desk.js');
 assert.match(html,/spatial-desk\.css\?v=spatial-20261110-1/);
 assert.match(html,/spatial-desk\.js\?v=spatial-20261110-1/);
 assert.match(css,/data-garden-time="night"/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/border:0!important/);
 assert.match(js,/document\.hidden/);
 assert.match(js,/deviceorientation/);
 assert.match(js,/pointermove/);
 assert.doesNotMatch(js,/localStorage|fetch\(|sendBeacon\(/);
});
