/* Offline-free static release integrity checks. These catch missing deployment
   assets and accidental regressions without logging in or touching study data. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('index.html'),worker=read('sw.js');

test('all local HTML entry-point files exist, with no duplicate includes',()=>{
 const urls=[...html.matchAll(/(?:src|href)\s*=\s*"([^"]+)"/g)].map(x=>x[1])
  .filter(x=>!/^https?:|^#|^mailto:|^data:/i.test(x))
  .map(x=>decodeURIComponent(x.split(/[?#]/)[0]).replace(/^\.\//,''));
 assert(urls.length>40,'Every major study module must remain wired');
 assert.equal(new Set(urls).size,urls.length,'No CSS or JavaScript should be double-loaded');
 for(const file of urls)assert(fs.existsSync(path.join(root,file)),`Missing HTML asset: ${file}`);
 assert.match(html,/<html\s+lang="en"/i);
 assert.match(html,/<meta\s+name="viewport"/i);
});

test('precache manifest has no missing or duplicate static resources',()=>{
 const paths=[...worker.matchAll(/'\.\/([^']*)'/g)].map(x=>x[1]).filter(Boolean);
 assert(paths.length>45,'The current service worker precaches the existing application');
 assert.equal(new Set(paths).size,paths.length,'No duplicate files in cache manifest');
 for(const file of paths)assert(fs.existsSync(path.join(root,file)),`Missing precache resource: ${file}`);
 for(const essential of ['index.html','app.js','sw.js','motion-runtime.js','motion.js','motion-lively.css',
  'study-calm.css','autopilot/studio.js','autopilot/garden.js','firebase-config.js','firebase-sync.js','cloud.js']){
  if(essential==='sw.js')continue;
  assert(paths.includes(essential),`Critical resource not precached: ${essential}`);
 }
 assert.match(worker,/request\.method\s*!==\s*'GET'/,'Do not cache mutations');
 assert.match(worker,/origin\s*!==\s*self\.location\.origin/,'Do not cache cross-site requests');
});

test('PWA manifest points to valid files inside the site',()=>{
 const manifest=JSON.parse(read('manifest.webmanifest'));
 assert.equal(manifest.start_url,'./index.html');
 assert.equal(manifest.scope,'./');
 assert(manifest.icons?.length>=2);
 for(const icon of manifest.icons){
  assert(!icon.src.startsWith('/'),`Avoid GitHub Pages root path: ${icon.src}`);
  assert(fs.existsSync(path.join(root,icon.src)),`Missing icon: ${icon.src}`);
 }
});

test('cloud rules remain account-scoped and default-deny',()=>{
 const rules=read('firestore.rules');
 assert.match(rules,/request\.auth\.uid\s*==\s*userId/);
 assert.match(rules,/allow read, write: if false/);
 assert.match(read('firebase-config.js'),/window\.PSYCHDESK_FIREBASE_CONFIG/);
});

test('contest release retains the study modules, motion controls and data safety entry points',()=>{
 for(const file of ['ink-notes.js','sticky-notes.js','reference-manager.js','pdf-reader.js',
  'quick-note.js','drive-persistence.js','tour.js','autopilot/imports.js','autopilot/worker.js']){
  assert(fs.existsSync(path.join(root,file)),`Missing module: ${file}`);
 }
 assert.match(html,/id="settingsBtn"/,'Preserve the existing home Settings control');
 assert.match(html,/motion-runtime\.js\?v=/);
 assert.match(read('motion-runtime.js'),/prefers-reduced-motion/);
 assert.match(read('app.js'),/function validateSnapshot\(/);
});
