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
 assert.match(sw,/psychdesk-study-course-first-v93/);
 for(const destination of ['notes','materials','garden','recall','dictionary','focus']){
  assert.ok(html.includes('data-visit="'+destination+'"'),destination);
 }
});

test('Phase 5 keeps high-quality movement smoother with a gentler daylight atmosphere',()=>{
 const world=read('world/world.js'),life=read('world/life.js'),html=read('world/index.html');
 assert.match(world,/const goldenHour=/,'time-of-day light is grounded in the local hour');
 assert.match(world,/goldenHour\?0xffca96:/,'warm directional light is only used in daylight');
 assert.match(world,/frameInterval=tier==='high'\?1000\/60/,'high quality caps at 60 FPS');
 assert.match(world,/if\(now-lastPaint\+\.75<frameInterval\)return/,'frame pacing tolerates minor refresh jitter');
 assert.match(world,/if\(status\)status\.textContent='Living landscape/,'quality changes update accessible status');
 assert.match(life,/const eased=\.5-\.5\*Math\.cos\(Math\.PI\*s\)/,'walkers ease into path ends');
 assert.match(life,/turn\*\(1-Math\.exp\(-dt\*6\)\)/,'walkers turn gradually');
 assert.match(html,/world\.js\?v=phase5-natural-1/,'new renderer URL prevents stale module loads');
 assert.doesNotMatch(world,/fetch\(/,'rendering uses no extra network data');
});
