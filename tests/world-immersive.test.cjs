'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('Guided exploration previews a landmark without navigating away',()=>{
 const world=read('world/world.js');
 const ui=read('world/world-ui.js');
 const html=read('world/index.html');
 assert.match(html,/id="worldTour"/);
 assert.match(html,/id="worldDetailVisit"/);
 assert.match(world,/button\.dataset\.look=d\.id/);
 assert.match(world,/function focusPlace\(id\)/);
 assert.match(world,/function resetView\(\)/);
 assert.match(world,/camera\.position\.lerpVectors/);
 assert.match(world,/if\(reduced\)/);
 assert.match(world,/if\(selected\.kind==='place'\)focusPlace\(selected\.value\)/);
 assert.match(ui,/detailVisit\.dataset\.visit/);
 assert.match(ui,/psychworld:visit/);
 assert.match(world,/tourButton\?\.addEventListener/);
 assert.match(world,/swiftshader\|llvmpipe/);
 assert.match(world,/frameInterval=tier===/);
 assert.doesNotMatch(world,/button\.dataset\.visit=d\.id/);
});

test('Realistic surface detail is procedural, offline and appropriately instanced',()=>{
 const landscape=read('world/landscape.js');
 assert.match(landscape,/terrainContext\.createImageData/);
 assert.match(landscape,/groundMaterial\.bumpMap/);
 assert.match(landscape,/mats\.sandy\.bumpMap/);
 assert.match(landscape,/geometry\.setAttribute\('uv'/);
 assert.match(landscape,/leafSurface=new THREE\.CanvasTexture/);
 assert.match(landscape,/const limbs=new THREE\.InstancedMesh/);
 assert.match(landscape,/const clusters=coarse\?5:7/);
 assert.match(landscape,/const treeCount=coarse\?/);
 assert.doesNotMatch(landscape,/https?:\/\//);
});

test('World tour fallback, navigation and release cache stay accessible',()=>{
 const html=read('world/index.html'),world=read('world/world.js');
 const sw=read('sw.js');
 assert.match(html,/worldTour'\)\.disabled=true/);
 assert.match(world,/if\(tourButton\)tourButton\.disabled=true/);
 assert.match(sw,/psychdesk-study-world-immersive-v86/);
 for(const destination of ['notes','materials','garden','recall','dictionary','focus']){
  assert.ok(html.includes('data-visit="'+destination+'"'),destination);
 }
});
