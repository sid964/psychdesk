'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const test=require('node:test');
const load=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
test('Natural-world geometry modules all parse as JavaScript',()=>{
 for(const file of ['world/world.js','world/landscape.js','world/places.js','world/life.js','world/world-ui.js','world/world-bridge.js']){
  const code=load(file).replace(/^import\s+.*?;\s*$/gm,'').replace(/\bexport\s+(?=function|const|class)/g,'');
  assert.doesNotThrow(()=>new vm.Script(code,{filename:file}),file);
 }
});
test('World includes natural terrain, life, quality and accessible destinations',()=>{
 const landscape=load('world/landscape.js'),life=load('world/life.js'),html=load('world/index.html');
 assert.match(landscape,/PlaneGeometry/);assert.match(landscape,/computeVertexNormals/);
 assert.match(landscape,/InstancedMesh/);assert.match(landscape,/normalMap/);
 assert.match(life,/walking|wandering|residents|people/);
 assert.match(life,/rabbits/);assert.match(life,/butterflies/);
 for(const id of ['notes','materials','garden','recall','dictionary','focus']){
  assert.ok(html.includes('data-visit="'+id+'"'),id);
 }
 assert.match(html,/qualityToggle/);assert.match(html,/worldDetail/);
});
test('Browser history is reversible for world-to-recall and all app tab changes',()=>{
 const bridge=load('world/world-bridge.js');
 assert.match(bridge,/history\.pushState/);
 assert.match(bridge,/history\.replaceState/);
 assert.match(bridge,/window\.addEventListener\('popstate'/);
 assert.match(bridge,/psychdesk:tab-changed/);
 assert.doesNotMatch(bridge,/replace\(\{kind:'tab',tab:origin\.from\}\)/);
 assert.match(bridge,/e\.origin|event\.origin/);
 assert.match(bridge,/event\.source!==active\.querySelector/);
});
test('Main project preserves user data and world is lazy-loaded',()=>{
 const bridge=load('world/world-bridge.js'),html=load('index.html');
 assert.doesNotMatch(bridge,/(?:localStorage|firestore|firebase-sync)/i);
 assert.match(html,/src="world\/world-bridge\.js\?v=repair-20261112"/);
 assert.match(html,/id="settingsBtn"/);
 assert.doesNotMatch(html,/src="world\/world\.js"/);
});
