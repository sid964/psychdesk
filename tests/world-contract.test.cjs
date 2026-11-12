'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
test('world is lazy and leaves the existing main app scripts unchanged',()=>{
 const html=read('index.html');
 assert.match(html,/world\/world-bridge\.js/);
 assert.doesNotMatch(html,/src="world\/world\.js/);
 assert.match(read('world/world-bridge.js'),/world\/index\.html/);
 assert.match(html,/id="settingsBtn"/);
});
test('world assets are self-contained static pages with accessible destinations',()=>{
 const html=read('world/index.html');
 const routes=[...html.matchAll(/data-visit="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(routes.sort(),['dictionary','focus','garden','materials','notes','recall'].sort());
 assert.match(html,/aria-label="Visit a place"/);
 assert.match(html,/three\.module\.js/);
 assert.match(html,/world\.js\?v=immersive-20261112/);
});
test('world scripts parse and have origin-checked navigation',()=>{
 for(const name of ['world/world.js','world/world-bridge.js','world/world-ui.js']){
  const content=read(name).replace(/^import .*?;\s*$/gm,'');
  assert.doesNotThrow(()=>new vm.Script(content,{filename:name}));
 }
 const ui=read('world/world-ui.js');
 assert.match(ui,/data-visit/);
 assert.match(ui,/psychworld:visit/);
 const bridge=read('world/world-bridge.js');
 assert.match(bridge,/event\.origin!==location\.origin/);
 assert.match(bridge,/event\.source!==active\.querySelector/);
 assert.match(bridge,/setTab\?\.\(destination\)/);
 assert.match(bridge,/button\.dataset\.auto='garden'/);
});
test('3D world cannot mutate saved study records',()=>{
 const world=read('world/world.js');
 assert.doesNotMatch(world,/PsychDeskCore|firebase|firestore|\.setItem\(['"]psychdesk-/i);
 assert.match(world,/renderer\.dispose\(\)/);
 assert.match(world,/prefers-reduced-motion/);
 assert.match(world,/visibilitychange/);
});
