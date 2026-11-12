/* Real prior release -> current release service-worker upgrade; isolated browser profile. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');

const ORIGIN='http://127.0.0.1:8766';
const previous=path.resolve(process.env.PSYCHDESK_PREVIOUS_RELEASE_DIR||'/tmp/psychdesk-preceding');
const current=path.resolve(__dirname,'..');
const out=path.join(current,'browser-audit-artifacts','release-upgrade');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json',
 '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
let stage='previous';
const gardenSrc=page=>page.locator('script[src^="autopilot/garden.js"]').getAttribute('src');
const hasHome=page=>page.locator('#main .garden-home').waitFor({timeout:30000});
function startServer(){
 const server=http.createServer((req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,ORIGIN).pathname)}catch{res.writeHead(400);res.end();return;}
  if(pathname.endsWith('/'))pathname+='index.html';
  const root=stage==='previous'?previous:current;
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(error,bytes)=>{
   if(error){res.writeHead(404);res.end();return;}
   res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream',
    'Cache-Control':pathname.endsWith('/sw.js')?'no-cache':'public, max-age=600'});
   res.end(bytes);
  });
 });
 return new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(8766,'127.0.0.1',()=>resolve(server));
 });
}
function observeHome(context){
 context.addInitScript(()=>{
  window.__psychdeskHomeStates=[];
  new MutationObserver(()=>{
   const main=document.querySelector('#main');
   if(!main?.firstElementChild)return;
   const state=main.querySelector('.garden-home')?'studio':'legacy';
   const history=window.__psychdeskHomeStates;
   if(history.at(-1)!==state)history.push(state);
  }).observe(document,{childList:true,subtree:true});
 });
}
async function verifyHome(page,expectedGarden,allowLegacy=false){
 await hasHome(page);
 assert.equal(await gardenSrc(page),expectedGarden);
 const states=await page.evaluate(()=>window.__psychdeskHomeStates);
 if(!allowLegacy)assert.deepEqual(states.filter(s=>s==='legacy'),[],'legacy homepage briefly rendered: '+JSON.stringify(states));
 return states;
}
(async()=>{
 assert.ok(fs.existsSync(path.join(previous,'sw.js')),'preceding release archive is required');
 const olderHTML=fs.readFileSync(path.join(previous,'index.html'),'utf8');
 const newerHTML=fs.readFileSync(path.join(current,'index.html'),'utf8');
 const olderGarden=olderHTML.match(/autopilot\/garden\.js\?v=[^"]+/)?.[0];
 const newerGarden=newerHTML.match(/autopilot\/garden\.js\?v=[^"]+/)?.[0];
 assert.ok(olderGarden&&newerGarden&&olderGarden!==newerGarden,'test requires two distinct real releases');
 fs.mkdirSync(out,{recursive:true});
 const server=await startServer();
 let browser;
 const results={priorRelease:'1fe8a2df41097d3b541e487d99bb4bd7e714e9cc',oldGarden:olderGarden,newGarden:newerGarden};
 try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:412,height:915},reducedMotion:'reduce',serviceWorkers:'allow'});
  observeHome(context);
  const tab=await context.newPage();
  await tab.goto(ORIGIN+'/',{waitUntil:'domcontentloaded'});
  results.previousFirstPaint=await verifyHome(tab,olderGarden,true);
  await tab.evaluate(()=>navigator.serviceWorker.ready);
  await tab.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:30000});
  assert.ok((await tab.evaluate(()=>caches.keys())).some(k=>k.endsWith('-v83')),'real old v83 cache missing');
  await tab.reload({waitUntil:'domcontentloaded'});
  results.previousWarmReload=await verifyHome(tab,olderGarden,true);
  await tab.screenshot({path:path.join(out,'preceding-release.png'),animations:'disabled'});
  const secondTab=await context.newPage();
  await secondTab.goto(ORIGIN+'/',{waitUntil:'domcontentloaded'});
  await verifyHome(secondTab,olderGarden,true);
  let unexpectedNavigations=0;
  secondTab.on('framenavigated',frame=>{if(frame===secondTab.mainFrame())unexpectedNavigations++});
  // Serve the actual new release from the same origin, while both old tabs are open.
  stage='current';
  await tab.evaluate(async()=>{
   const registration=await navigator.serviceWorker.ready;
   await new Promise(async(resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('Timed out waiting for the actual new controller')),30000);
    navigator.serviceWorker.addEventListener('controllerchange',()=>{clearTimeout(timeout);resolve()},{once:true});
    try{await registration.update()}catch(error){clearTimeout(timeout);reject(error)}
   });
  });
  assert.equal(unexpectedNavigations,0,'a worker update reloaded an open study tab');
  assert.equal(await gardenSrc(secondTab),olderGarden,'a live old tab must not be rewritten underneath its data');
  assert.ok((await tab.evaluate(()=>caches.keys())).some(k=>k.endsWith('-v85')),'new v85 cache missing');
  // controllerchange can precede the end of all active old-client requests.
  // Observe eventual retirement and include cache names if it does not settle.
  const cacheNames=await tab.waitForFunction(async()=>{
   const keys=await caches.keys();
   return keys.some(k=>k.endsWith('-v83'))?false:keys;
  },null,{timeout:5000}).then(handle=>handle.jsonValue()).catch(async()=>{
   const keys=await tab.evaluate(()=>caches.keys());
   throw Error('Obsolete v83 cache not retired after activation: '+JSON.stringify(keys));
  });
  results.cacheAfterActivation=cacheNames;
  await secondTab.reload({waitUntil:'domcontentloaded'});
  results.secondTabUpgrade=await verifyHome(secondTab,newerGarden);
  await tab.reload({waitUntil:'domcontentloaded'});
  results.normalRefresh=await verifyHome(tab,newerGarden);
  const cdp=await context.newCDPSession(tab);
  await cdp.send('Page.reload',{ignoreCache:true});
  await tab.waitForLoadState('domcontentloaded');
  results.hardRefresh=await verifyHome(tab,newerGarden);
  await tab.screenshot({path:path.join(out,'upgraded-release.png'),animations:'disabled'});
  await context.setOffline(true);
  await tab.goto(ORIGIN+'/index.html',{waitUntil:'domcontentloaded'});
  results.offlineHome=await verifyHome(tab,newerGarden);
  await tab.goto(ORIGIN+'/world/index.html',{waitUntil:'domcontentloaded'});
  assert.equal(await tab.locator('.world-places [data-visit]').count(),6,'offline World entry failed');
  assert.equal(await tab.locator('#main').count(),0,'offline World served the main app shell');
  results.offlineWorld=true;
  await context.setOffline(false);
  await tab.goto(ORIGIN+'/',{waitUntil:'domcontentloaded'});
  results.reconnect=await verifyHome(tab,newerGarden);
  await context.close();
  const fresh=await browser.newContext({viewport:{width:360,height:800},reducedMotion:'reduce'});
  observeHome(fresh);
  const freshPage=await fresh.newPage();
  await freshPage.goto(ORIGIN+'/',{waitUntil:'domcontentloaded'});
  results.freshProfile=await verifyHome(freshPage,newerGarden);
  await fresh.close();
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
  console.log('RELEASE_UPGRADE_PASS '+JSON.stringify(results));
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error);process.exitCode=1});
